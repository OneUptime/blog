# Validation Summary: How to Configure PulseAudio on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- PulseAudio
- ALSA
- PipeWire
- pactl
- PulseAudio daemon configuration
- PulseAudio modules
- Bluetooth audio
- Network audio

## Sources Consulted
- Ubuntu pactl man page: https://manpages.ubuntu.com/manpages/noble/man1/pactl.1.html
- Ubuntu pulse-daemon.conf man page: https://manpages.ubuntu.com/manpages/noble/man5/pulse-daemon.conf.5.html
- PulseAudio modules documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Modules/
- PulseAudio network setup documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Network/
- PulseAudio equalizer documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Equalizer/
- Ubuntu 22.10 release notes: https://discourse.ubuntu.com/t/kinetic-kudu-release-notes/27976
- Ubuntu package metadata for pulseaudio-equalizer and pulseaudio-module-bluetooth from local apt cache

## Issues Found
- The introduction said Ubuntu 22.04 and later default to PipeWire. Ubuntu 22.10 release notes state that Ubuntu 22.10 changed the default audio server from PulseAudio to PipeWire, so the post now says Ubuntu 22.10 and later.
- The `exit-idle-time = -1` comment said it avoided `module-suspend-on-idle`. That setting controls daemon auto-exit, not sink/source idle suspension, so the comment now says it keeps the daemon running after the last client disconnects.
- The network audio example loaded `module-native-protocol-tcp` without access control. PulseAudio's native TCP protocol requires authentication by default unless access is explicitly configured, so the example now includes `auth-ip-acl=127.0.0.1;192.168.1.0/24` and escapes the semicolon for the shell command.
- The equalizer example launched `qpaeq` before loading `module-dbus-protocol` and `module-equalizer-sink`. PulseAudio's equalizer documentation says those modules should be loaded for the GUI to work, so the command order was corrected.
- Several snippets wrote to `~/.config/pulse` without ensuring the directory existed. Added `mkdir -p ~/.config/pulse` before those writes so the commands work on systems where the directory has not been created yet.

## Review Notes
The commands are PulseAudio-specific. On Ubuntu releases using PipeWire with `pipewire-pulse`, many `pactl` commands remain compatible, but daemon configuration files such as `~/.config/pulse/daemon.conf` do not configure PipeWire itself.
