# Validation Summary: How to Configure Bluetooth Audio on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- BlueZ / bluetoothctl
- Bluetooth audio profiles and codecs
- PulseAudio
- PipeWire
- WirePlumber
- systemd
- Linux kernel btusb module options

## Sources Consulted
- Ubuntu Desktop 22.10 release announcement: https://ubuntu.com/blog/2022/10/21/whats-new-in-ubuntu-desktop-22-10-kinetic-kudu/
- Ubuntu package metadata for `libspa-0.2-bluetooth`, `pulseaudio-module-bluetooth`, `wireplumber`, and `pipewire` via `apt-cache`
- BlueZ `bluetoothctl --help` output from BlueZ 5.72
- PulseAudio module documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Modules/
- PulseAudio Bluetooth documentation: https://freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Bluetooth/
- WirePlumber 0.4 Bluetooth configuration documentation: https://mazunki.pages.freedesktop.org/wireplumber/configuration/bluetooth.html
- Installed WirePlumber 0.4 policy and Bluetooth configuration files under `/usr/share/wireplumber/`
- Linux `btusb` module parameters via `modinfo -p btusb`

## Issues Found
- The post said PipeWire was the default for "Ubuntu 22.04+". Ubuntu Desktop switched to PipeWire by default in 22.10, while 22.04 LTS still used PulseAudio for audio by default. Updated the wording to "default on Ubuntu Desktop 22.10+".
- The default-sink example hard-coded a PulseAudio-style Bluetooth sink name and reused it for moving streams. Updated the snippet to make the sink name an explicit variable taken from `pactl list sinks short`, because PipeWire and PulseAudio can expose different Bluetooth sink names.
- The headset microphone profile example used `headset_head_unit_msbc`, which is not a portable profile name. Updated it to tell readers to use the headset profile shown by `pactl list cards`, with `headset_head_unit` as the example.
- The PulseAudio auto-switch example used `auto_switch=false`, but PulseAudio documents `auto_switch` as an integer option. Updated it to `auto_switch=0`.
- The WirePlumber auto-switch configuration used a non-existent `bluez5.enable-autoswitch-profile` property under `bluetooth.lua.d`. Updated it to the WirePlumber 0.4 Bluetooth policy setting `bluetooth_policy.policy["media-role.use-headset-profile"] = false` under `policy.lua.d`.
- The post recommended installing `pulseaudio-module-bluetooth-discover`, which is not an Ubuntu package. Updated it to `pulseaudio-module-bluetooth`; `module-bluetooth-discover` is the PulseAudio module provided by that package.
- After moving the WirePlumber auto-switch file out of `bluetooth.lua.d`, the codec snippet no longer guaranteed that `~/.config/wireplumber/bluetooth.lua.d/` existed. Added `mkdir -p` before writing the codec file.
- The PipeWire codec profile examples used mixed underscore/hyphen profile names without explaining that profile names vary. Updated LDAC and aptX examples to tell readers to use the exact profile from `pactl list cards`, with common profile-name examples noted.

## Review Notes
The remaining commands are generally valid, but several Bluetooth profile and sink names are inherently device-, PulseAudio-, and PipeWire-version-specific. The post now points readers to inspect `pactl list sinks short` and `pactl list cards` before using fixed names.
