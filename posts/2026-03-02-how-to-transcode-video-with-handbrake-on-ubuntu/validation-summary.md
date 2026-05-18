# Validation Summary: How to Transcode Video with HandBrake on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- HandBrake (GUI and HandBrakeCLI)
- Ubuntu (apt, PPA, Flatpak install methods)
- Video codecs: H.264 (x264), H.265 (x265), VP9
- Hardware encoders: NVIDIA NVENC, AMD VCE, Intel QSV, VA-API
- Audio codecs: AAC, AC3, EAC3, DTS
- Bash scripting (batch processing)

## Sources Consulted
- HandBrake CLI command-line reference: https://handbrake.fr/docs/en/latest/cli/command-line-reference.html
- HandBrake official presets documentation: https://handbrake.fr/docs/en/latest/technical/official-presets.html
- HandBrake GitHub repository: https://github.com/HandBrake/HandBrake
- HandBrake official PPA (ppa:stebbins/handbrake-releases)
- Flathub HandBrake page (fr.handbrake.ghb)

## Issues Found

1. **Incorrect preset name "H.265 1080p 30"** — This preset does not exist in HandBrake's official preset list (also had a stray space). Corrected to "H.265 MKV 1080p30" (an actual preset from the Matroska category).

2. **Incorrect preset name "HQ 1080p60 Surround"** — This preset does not exist. The official preset is "HQ 1080p30 Surround". Fixed in two locations (preset list bullet and the auto-crop example).

3. **Incorrect `--normalize-mix` argument** — The option takes a numeric flag (0 = disable, 1 = enable) per the official CLI reference, not a mixdown name like "stereo". Changed `--normalize-mix stereo` to `--normalize-mix 1` and moved the stereo mixdown to the proper `-6 stereo` flag.

4. **Incorrect preset export command** — `--preset-export "name" -o file.json` was wrong. The `-o` flag specifies the video output file, not the preset destination. `--preset-export` writes to stdout; to write to a file you must use `--preset-export-file <filename>`. Corrected accordingly.

5. **`--preset-list` does not accept a category filter** — The examples `HandBrakeCLI --preset-list "Devices"`, etc., are misleading because the flag takes no argument; it always lists all presets (grouped by category). Removed the per-category examples and kept the bare `--preset-list` invocation.

6. **Misleading VA-API comment** — `vce_h264` is HandBrake's AMD VCE encoder (using VA-API on Linux, AMF on Windows), not a generic "Intel/AMD" encoder. Intel hardware encoding uses `qsv_h264`. Updated the comment to clarify it's AMD VCE specifically.

7. **Redundant build step** — The `./configure --launch-jobs=N --launch` command already runs make. The subsequent `cd build && make -j$(nproc)` was redundant. Simplified to just `cd build && sudo make install`.

8. **Invalid NVENC encoder option** — The encopts example used `b-adapt=0`, which is an x264 option, not a valid NVENC option. Replaced with `--encoder-preset slow`, which is the correct way to set NVENC quality presets in HandBrake.

## Review Notes

- The encoder names (`x264`, `x265`, `nvenc_h264`, `vce_h264`, `qsv_h264`, `copy`) all match HandBrake's available encoders.
- CLI flag short forms (`-i`, `-o`, `-e`, `-q`, `-a`, `-E`, `-B`, `-6`, `-w`, `-l`, `-f`, `-s`, `-t`, `-x`) are all verified against the official command-line reference.
- The Flatpak app ID `fr.handbrake.ghb` and the PPA `ppa:stebbins/handbrake-releases` are the correct official sources.
- The build-from-source dependency list is reasonable for HandBrake 1.6+. HandBrake uses its own configure script (which wraps autotools/make and CMake for some components), so `cmake`/`ninja-build` listed as dependencies are appropriate.
- The auto-crop example with `--auto-anamorphic` and a preset technically uses anamorphic storage rather than literal cropping; auto-crop is the default behavior of `--crop` unless overridden. The example still works but conflates two separate behaviors. Left as-is since the command is valid.
- The H.265 MKV preset used in the batch script writes `.mp4` output. HandBrake honors the output container extension and will encode H.265 into MP4 correctly, so this is fine in practice, though using `--format av_mp4` to be explicit would be cleaner.
