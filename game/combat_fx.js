(function attachCombatFX(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CombatFX = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCombatFXApi() {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function createSystem(options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const limits = {
      world: Math.max(1, options.maxWorld || 72),
      screen: Math.max(1, options.maxScreen || 16),
      hazards: Math.max(1, options.maxHazards || 12),
    };
    const preferences = {
      reducedMotion: !!options.reducedMotion,
      screenShake: options.screenShake !== false,
      flash: options.flash !== false,
    };
    const worldEffects = [];
    const screenEffects = [];
    const hazards = [];
    let cinematic = null;
    let phase = null;

    function trim(list, limit) {
      while (list.length > limit) list.shift();
    }

    function addWorldEffect(effect) {
      worldEffects.push(effect);
      trim(worldEffects, limits.world);
    }

    function burst(payload, count, strength, kind) {
      const amount = preferences.reducedMotion ? Math.max(2, Math.ceil(count * 0.42)) : count;
      const direction = Math.sign(payload.direction || 1) || 1;
      const color = payload.color || '#e6c77b';
      for (let i = 0; i < amount; i += 1) {
        const spread = (random() - 0.5) * Math.PI * 1.1;
        const speed = strength * (0.55 + random() * 0.75);
        addWorldEffect({
          kind,
          x: Number(payload.x) || 0,
          y: Number(payload.y) || 0,
          vx: Math.cos(spread) * speed * direction,
          vy: Math.sin(spread) * speed - strength * 0.22,
          size: 2 + random() * strength * 0.035,
          rotation: random() * Math.PI,
          spin: (random() - 0.5) * 8,
          color,
          life: 0.28 + random() * 0.28,
          maxLife: 0.56,
        });
      }
    }

    function addScreenEffect(kind, strength, life) {
      if (!preferences.flash || preferences.reducedMotion) return;
      screenEffects.push({ kind, strength, life, maxLife: life });
      trim(screenEffects, limits.screen);
    }

    function addHazard(payload) {
      const duration = Math.max(0.001, Number(payload.duration) || 0.56);
      if(payload.attackId){const previous=hazards.findIndex(h=>h.attackId===payload.attackId);if(previous>=0)hazards.splice(previous,1);}
      phase = Number(payload.phase) || phase || 1;
      hazards.push({
        kind: payload.kind || 'volley',
        attackId:payload.attackId,
        segments:payload.segments,
        dashArea:payload.dashArea,
        x: Number(payload.x) || 0,
        y: Number(payload.y) || 0,
        direction: Math.sign(payload.direction || 1) || 1,
        phase: Number(payload.phase) || 1,
        life: duration,
        maxLife: Number(payload.total) || duration,
      });
      trim(hazards, limits.hazards);
    }

    function beginPhaseTransition(payload) {
      const duration = Math.max(0.2, Number(payload.duration) || 0.7);
      worldEffects.length = 0;
      hazards.length = 0;
      screenEffects.length = 0;
      phase = Number(payload.phase) || phase || 1;
      cinematic = {
        kind: 'phase-transition',
        stage: 'phase-transition',
        x: Number(payload.x) || 0,
        y: Number(payload.y) || 0,
        life: duration,
        maxLife: duration,
        elapsed: 0,
      };
      if (!preferences.reducedMotion) addScreenEffect('phase-flash', 0.32, 0.18);
    }

    function beginBossDefeat(payload) {
      const duration = Math.max(0.4, Number(payload.duration) || 0.92);
      phase = Number(payload.phase) || phase || 1;
      if (payload.finalize) {
        cinematic = {
          kind: 'boss-defeat',
          stage: 'settle',
          x: Number(payload.x) || 0,
          y: Number(payload.y) || 0,
          life: Math.min(0.38, duration),
          maxLife: Math.min(0.38, duration),
          elapsed: duration * 0.72,
        };
        return;
      }
      hazards.length = 0;
      screenEffects.length = 0;
      cinematic = {
        kind: 'boss-defeat',
        stage: 'burst',
        x: Number(payload.x) || 0,
        y: Number(payload.y) || 0,
        life: duration,
        maxLife: duration,
        elapsed: 0,
      };
      burst(payload, 28, 230, 'boss-shard');
      if (!preferences.reducedMotion) {
        addScreenEffect('boss-flash', 0.58, 0.16);
        addScreenEffect('ring', 0.34, 0.34);
      }
    }

    function emit(type, payload = {}) {
      if (type === 'player-hit-light') {
        burst(payload, 5, 90, 'spark');
        addScreenEffect('impact', 0.18, 0.09);
      } else if (type === 'player-hit-heavy') {
        burst(payload, 11, 155, 'heavy-spark');
        addScreenEffect('impact', 0.36, 0.14);
      } else if (type === 'enemy-defeated') {
        burst(payload, 19, 185, 'paper');
        addScreenEffect('impact', 0.45, 0.18);
        addScreenEffect('ring', 0.28, 0.25);
      } else if (type === 'boss-telegraph') {
        addHazard(payload);
      } else if (type === 'boss-phase-transition') {
        beginPhaseTransition(payload);
      } else if (type === 'boss-defeated') {
        beginBossDefeat(payload);
      }
      return getDiagnostics();
    }

    function update(dt) {
      const delta = Math.max(0, Number(dt) || 0);
      for (let i = worldEffects.length - 1; i >= 0; i -= 1) {
        const effect = worldEffects[i];
        effect.x += effect.vx * delta;
        effect.y += effect.vy * delta;
        effect.vx *= Math.pow(0.08, delta);
        effect.vy += (effect.kind === 'paper' ? 230 : 380) * delta;
        effect.rotation += effect.spin * delta;
        effect.life -= delta;
        if (effect.life <= 0) worldEffects.splice(i, 1);
      }
      for (let i = screenEffects.length - 1; i >= 0; i -= 1) {
        screenEffects[i].life -= delta;
        if (screenEffects[i].life <= 0) screenEffects.splice(i, 1);
      }
      for (let i = hazards.length - 1; i >= 0; i -= 1) {
        hazards[i].life -= delta;
        if (hazards[i].life <= 0) hazards.splice(i, 1);
      }
      if (cinematic) {
        cinematic.life -= delta;
        cinematic.elapsed += delta;
        if (cinematic.life <= 0) cinematic = null;
        else if (cinematic.kind === 'boss-defeat') {
          const progress = clamp(cinematic.elapsed / cinematic.maxLife, 0, 1);
          cinematic.stage = progress < 0.28 ? 'burst' : progress < 0.68 ? 'collapse' : 'settle';
        }
      }
    }

    function drawHazard(ctx, hazard, cameraX) {
      const progress = clamp(1 - hazard.life / hazard.maxLife, 0, 1);
      const pulse = preferences.reducedMotion ? .36 : 0.25 + Math.sin(progress * Math.PI * 7) * 0.08 + progress * 0.35;
      const x = hazard.x - cameraX;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = hazard.phase >= 4 ? '#a94d78' : '#b34a35';
      if (hazard.segments) {
        ctx.strokeStyle=ctx.fillStyle;
        for(const segment of hazard.segments){ctx.lineWidth=segment.r*2;ctx.beginPath();ctx.moveTo(segment.x-cameraX,segment.y);ctx.lineTo(segment.x2-cameraX,segment.y2);ctx.stroke();}
        const d=hazard.dashArea;if(d)ctx.fillRect(d.x-cameraX,d.y,d.w,d.h);
      } else if (hazard.kind === 'ground') {
        ctx.fillRect(hazard.direction > 0 ? x : x - 420, hazard.y - 18, 420, 24);
      } else if (hazard.kind === 'dash') {
        ctx.fillRect(hazard.direction > 0 ? x : x - 540, hazard.y - 96, 540, 104);
      } else {
        ctx.translate(x, hazard.y - 80);
        ctx.rotate(hazard.direction > 0 ? 0 : Math.PI);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(440, -105);
        ctx.lineTo(440, 105);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawWorld(ctx, cameraX = 0) {
      if (!ctx) return;

      if (cinematic) {
        const progress = clamp(cinematic.elapsed / cinematic.maxLife, 0, 1);
        const x = cinematic.x - cameraX;
        ctx.save();
        ctx.translate(x, cinematic.y);
        ctx.strokeStyle = cinematic.kind === 'phase-transition' ? '#c95f48' : '#e7bb58';
        ctx.lineWidth = cinematic.stage === 'collapse' ? 8 : 5;
        ctx.globalAlpha = clamp(1 - progress, 0.12, 0.78);
        const radius = cinematic.kind === 'phase-transition'
          ? 80 + progress * 230
          : cinematic.stage === 'collapse' ? 170 - progress * 80 : 45 + progress * 310;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(12, radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      for (const effect of worldEffects) {
        const alpha = clamp(effect.life / effect.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(effect.x - cameraX, effect.y);
        ctx.rotate(effect.rotation);
        ctx.fillStyle = effect.color;
        if (effect.kind === 'paper') ctx.fillRect(-effect.size, -effect.size * 0.45, effect.size * 2.2, effect.size * 0.9);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, effect.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      for (const hazard of hazards) drawHazard(ctx, hazard, cameraX);
    }

    function drawScreen(ctx, width, height) {
      if (!ctx || !preferences.flash || preferences.reducedMotion) return;
      for (const effect of screenEffects) {
        const alpha = clamp(effect.life / effect.maxLife, 0, 1) * effect.strength;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = effect.kind === 'ring' ? '#d7aa52' : '#fff1c7';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      if (cinematic && !preferences.reducedMotion) {
        const progress = clamp(cinematic.elapsed / cinematic.maxLife, 0, 1);
        const strength = cinematic.kind === 'phase-transition' ? 0.09 : cinematic.stage === 'burst' ? 0.18 : 0.07;
        ctx.save();
        ctx.globalAlpha = strength * (1 - progress);
        ctx.fillStyle = cinematic.kind === 'phase-transition' ? '#6e1820' : '#f0c564';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    function reset() {
      worldEffects.length = 0;
      screenEffects.length = 0;
      hazards.length = 0;
      cinematic = null;
      phase = null;
    }

    function setPreferences(next = {}) {
      if (Object.prototype.hasOwnProperty.call(next, 'reducedMotion')) preferences.reducedMotion = !!next.reducedMotion;
      if (Object.prototype.hasOwnProperty.call(next, 'screenShake')) preferences.screenShake = !!next.screenShake;
      if (Object.prototype.hasOwnProperty.call(next, 'flash')) preferences.flash = !!next.flash;
      if (!preferences.flash || preferences.reducedMotion) screenEffects.length = 0;
      return getDiagnostics();
    }

    function getDiagnostics() {
      const latestHazard = hazards[hazards.length - 1];
      return Object.freeze({
        worldEffects: worldEffects.length,
        screenEffects: screenEffects.length,
        hazards: hazards.length,
        ...(latestHazard ? { hazardKind: latestHazard.kind, hazardDirection: latestHazard.direction } : {}),
        cinematic: cinematic ? cinematic.stage : null,
        phase,
        reducedMotion: preferences.reducedMotion,
      });
    }

    return Object.freeze({ emit, update, drawWorld, drawScreen, reset, setPreferences, getDiagnostics });
  }

  return Object.freeze({ createSystem });
});
