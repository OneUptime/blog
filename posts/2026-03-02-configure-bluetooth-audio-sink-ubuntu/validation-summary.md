# Validation Summary: How to Configure Bluetooth Audio Sink on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- BlueZ / bluetoothctl
- Bluetooth A2DP, HSP, and HFP profiles
- PulseAudio
- PipeWire
- WirePlumber / wpctl
- pactl, pw-cli, and pw-dump

## Sources Consulted
- Ubuntu manpage for pactl: https://manpages.ubuntu.com/manpages/noble/man1/pactl.1.html
- Ubuntu manpage for default.pa: https://manpages.ubuntu.com/manpages/noble/man5/default.pa.5.html
- Ubuntu manpage for bluetoothctl: https://manpages.ubuntu.com/manpages/noble/man1/bluetoothctl.1.html
- Ubuntu manpage for pw-cli: https://manpages.ubuntu.com/manpages/noble/man1/pw-cli.1.html
- Ubuntu manpage for pw-dump: https://manpages.ubuntu.com/manpages/noble/man1/pw-dump.1.html
- WirePlumber wpctl documentation: https://pipewire.pages.freedesktop.org/wireplumber/tools/wpctl.html
- WirePlumber Bluetooth configuration documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/bluetooth.html
- WirePlumber configuration locations documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/locations.html
- Ubuntu package archive for libspa-0.2-bluetooth and Bluetooth-related packages: https://packages.ubuntu.com/bluetooth
- Local Ubuntu package metadata and CLI help for bluetoothctl, wpctl, pw-cli, PipeWire, WirePlumber, PulseAudio, and Bluetooth codec packages.

## Issues Found
- The post said Ubuntu 22.04+ ships PipeWire as the default audio server. Updated this to state that Ubuntu 24.04 LTS uses PipeWire by default, while Ubuntu 20.04 and 22.04 LTS use PulseAudio by default.
- The PipeWire Bluetooth explanation incorrectly tied Bluetooth support to pipewire-pulse. Updated it to explain that Bluetooth audio is handled through the SPA Bluetooth plugin and WirePlumber, while pipewire-pulse provides PulseAudio compatibility.
- The PipeWire package install command omitted pulseaudio-utils even though later commands use pactl/paplay. Added pulseaudio-utils.
- The PulseAudio headset profile examples split HFP and HSP into potentially misleading profile names. Updated the wording to describe the headset microphone profile and note that underscore or hyphenated names may appear depending on the stack.
- The PipeWire profile inspection command used a fragile pw-cli enum-params command with a numeric parameter ID. Replaced it with wpctl inspect using the ID from wpctl status.
- The codec installation snippet used libldac, which is not the binary package readers should install on Ubuntu. Replaced it with libldacbt-abr2 and libldacbt-enc2, and kept libspa-0.2-bluetooth/libfreeaptx0.
- The codec inspection snippet used pw-cli dump, which is not a valid pw-cli subcommand. Replaced it with pw-dump and pw-cli list-objects Node.
- The BlueZ AutoEnable text implied direct audio-device auto-connect behavior. Clarified that AutoEnable powers Bluetooth controllers automatically so paired devices can reconnect.
- The AutoEnable sed command only handled one commented value. Replaced it with a pattern that updates commented or uncommented AutoEnable settings.
- The PulseAudio auto-switching snippet wrote to /etc/pulse/default.pa.d, which is not the documented PulseAudio startup script location. Updated it to back up and edit /etc/pulse/default.pa.
- The per-user PulseAudio default.pa snippet created an incomplete startup script that would override the system startup script. Updated it to copy /etc/pulse/default.pa first, then append the user-specific settings.

## Review Notes
- WirePlumber configuration differs between older 0.4 Lua-based configuration and newer 0.5 wireplumber.conf.d fragments. The post now checks the newer fragment location first while retaining a fallback for Ubuntu 24.04-era Lua files.
- Bluetooth profile and codec availability still depends on the Bluetooth device, adapter, BlueZ/PipeWire/PulseAudio versions, and distribution build options.
