#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
game_dir="${PACKAGE_GAME_DIR:-$repo_root/game}"
output_dir="${PACKAGE_OUTPUT_DIR:-$repo_root/dist}"
archive_name="SeventhLantern_v1.1.0_Windows.zip"

missing=()
required=(
  index.html
  00_START_GAME.bat
  combat_fx.js
  motion.js
  character_scale.js
  game.js
  audio_manager.js
  production_assets.js
  style.css
)

for relative_path in "${required[@]}"; do
  [[ -f "$game_dir/$relative_path" ]] || missing+=("missing required file: $relative_path")
done

if ! find "$game_dir/assets" -type f \( -iname '*.png' -o -iname '*.webp' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.svg' \) -print -quit 2>/dev/null | grep -q .; then
  missing+=("missing image assets")
fi
if ! find "$game_dir/assets" -type f \( -iname '*.mp3' -o -iname '*.wav' -o -iname '*.ogg' -o -iname '*.m4a' \) -print -quit 2>/dev/null | grep -q .; then
  missing+=("missing audio assets")
fi

if ((${#missing[@]})); then
  printf 'Windows package validation failed:\n' >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"
archive_path="$output_dir/$archive_name"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT

cp -a "$game_dir/." "$stage_dir/"
if [[ -f "$repo_root/READ_ME.txt" ]]; then
  cp "$repo_root/READ_ME.txt" "$stage_dir/README.txt"
fi

rm -f "$archive_path"
(
  cd "$stage_dir"
  zip -q -r "$archive_path" . \
    -x '.DS_Store' '*/.DS_Store' \
       '*.log' '*/*.log' \
       'tests/*' '*/tests/*' \
       'debug/*' '*/debug/*' \
       '*.map'
)

listing="$(unzip -Z1 "$archive_path")"
for relative_path in "${required[@]}"; do
  grep -Fxq "$relative_path" <<<"$listing" || {
    printf 'Archive validation failed: missing top-level %s\n' "$relative_path" >&2
    exit 1
  }
done
if grep -Eiq '(^|/)(tests|debug)(/|$)|(^|/)\.DS_Store$|\.log$' <<<"$listing"; then
  printf 'Archive validation failed: development debris was included\n' >&2
  exit 1
fi

size_bytes="$(stat -c '%s' "$archive_path")"
sha256="$(sha256sum "$archive_path" | awk '{print $1}')"
printf 'archive=%s\n' "$archive_path"
printf 'size_bytes=%s\n' "$size_bytes"
printf 'sha256=%s\n' "$sha256"
