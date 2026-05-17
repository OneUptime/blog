# Validation Summary: How to Set Up Scrcpy for Android Screen Mirroring on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Scrcpy (Android screen mirroring tool)
- ADB (Android Debug Bridge)
- Ubuntu (apt, snap)
- Android (USB Debugging, Wireless Debugging)
- Bash scripting

## Sources Consulted
- Scrcpy official repository: https://github.com/Genymobile/scrcpy
- Scrcpy shortcuts documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/shortcuts.md
- Scrcpy build documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/build.md
- Scrcpy Linux install documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/linux.md
- Scrcpy audio documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/audio.md
- Scrcpy video documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/video.md
- Scrcpy recording documentation: https://github.com/Genymobile/scrcpy/blob/master/doc/recording.md
- Scrcpy v3.0 and v4.0 release tags (build.md history)
- GitHub Releases API for latest scrcpy version (v4.0, released 2026-05-12)

## Issues Found

1. **Keyboard shortcut modifier was wrong.** The post listed every shortcut as `Ctrl+X`, but the default MOD key in scrcpy is left Alt or left Super, not Ctrl. Ctrl only works if the user passes `--shortcut-mod=lctrl`. Updated the table to use `Alt+X` and added a note explaining the MOD key and how to switch it.

2. **"Resize to fit screen" mislabeled.** `Ctrl+G` was labeled "Resize to fit screen", but MOD+G is "Resize window to 1:1 (pixel-perfect)". Split into two rows: `Alt+W` (remove black borders) and `Alt+G` (pixel-perfect 1:1).

3. **"Close window: Ctrl+W or Ctrl+Q" was wrong.** MOD+W is "remove black borders", not close. Only MOD+Q (now `Alt+Q`) quits scrcpy. Replaced with a single "Quit" row.

4. **"Screenshot to clipboard: Ctrl+Shift+S" does not exist.** Scrcpy has no built-in screenshot-to-clipboard shortcut; the only related binding is MOD+Shift+R which resets video capture. Removed the row entirely.

5. **`--no-display` is deprecated.** Current scrcpy uses `--no-playback` (disables playback while recording) or `--no-window` (no window). Replaced `--no-display` with `--no-playback` in the recording example and updated the comment accordingly.

6. **`--lock-video-orientation` is legacy with the wrong value scheme.** The post used `--lock-video-orientation=0` with `(0=default, 1=90deg, 2=180deg, 3=270deg)`. The current flag is `--orientation` and accepts degree values directly: `0`, `90`, `180`, `270` (plus `flip*` variants). Updated.

7. **Audio forwarding comment was misleading.** The post implied `--audio-codec=aac` is what "forwards phone audio to the Ubuntu speakers", but on Android 11+ audio forwarding is enabled by default (codec defaults to opus). Reworded the section to clarify that audio is on by default and the flag only switches the codec.

## Review Notes

- **Build dependencies use libsdl2.** This is correct for scrcpy v3.x and earlier, which was the latest stable when the post was written (early 2026). Scrcpy v4.0 (released 2026-05-12, five days before this review) migrated to SDL3 (`libsdl3-0`, `libsdl3-dev`). Users cloning current `master` may need to substitute the SDL3 packages, which are available in Ubuntu 24.04+ but not in older releases. Left as-is because the post's deps match the version that was current at writing time and still work for tagged v3.x checkouts.
- The official v4.0 build doc also adds `libv4l-dev` and `openjdk-17-jdk` (the latter only needed when building the server from source, not when using `install_release.sh`). `install_release.sh` itself remains valid and downloads the prebuilt server JAR.
- The `adb shell am broadcast -a clipper.set ...` command relies on the third-party Clipper app being installed on the device; it is not built into Android. Not corrected because the command is syntactically right and the post is presenting it as an extra trick rather than a guaranteed feature.
- `adb shell ip addr show wlan0` may not work on all devices (some use a different interface name such as `wlan1` or use `ip route`); this is device-dependent and the original wording is the most common case.
- Mouse-button mappings (right-click = back, middle-click = home, scroll = scroll) are correct.
