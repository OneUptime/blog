# Validation Summary: How to Configure Multiple Audio Outputs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu desktop audio
- PulseAudio
- PipeWire
- WirePlumber
- pactl
- pavucontrol
- Helvum
- GNOME Settings
- Bash scripting

## Sources Consulted
- PulseAudio module documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Modules/
- PulseAudio default device documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/DefaultDevice/
- pactl manual page: https://manpages.org/pactl
- PipeWire combine-stream module documentation: https://pipewire.pages.freedesktop.org/pipewire/page_module_combine_stream.html
- WirePlumber configuration documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/conf_file.html
- WirePlumber configuration modification documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/modifying_configuration.html
- WirePlumber linking policy documentation: https://pipewire.pages.freedesktop.org/wireplumber/policies/linking.html
- WirePlumber settings documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/settings.html
- WirePlumber ALSA configuration documentation: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/alsa.html

## Issues Found
- The pavucontrol persistence explanation said the application remembers its assigned output. Updated it to clarify that PulseAudio stream-restore or WirePlumber stream restore usually persists matching future streams.
- The PipeWire per-application routing section used old WirePlumber Lua fragment paths and `alsa_monitor.rules` for application streams. Current WirePlumber 0.5 no longer supports Lua configuration fragments, and ALSA monitor rules are for ALSA devices/nodes rather than client application streams. Replaced the snippet with the supported behavior: move the stream once with pavucontrol or `pactl move-sink-input`, relying on WirePlumber's default `node.stream.restore-target`, with a reset command for stale saved stream state.
- The PipeWire combined sink example omitted the explicit `combine.mode = sink` used in the upstream example and set `media.class` under `stream.props`. Updated the snippet to follow the documented `libpipewire-module-combine-stream` shape by setting `combine.mode = sink` and matching target sink nodes with `media.class = "Audio/Sink"` in each stream rule.
- The summary said WirePlumber rules enable persistent per-application routing. Updated it to refer to PulseAudio stream-restore and WirePlumber stream restore instead.

## Review Notes
The remaining commands and examples align with the referenced documentation. Actual sink names, card profile names, and GNOME quick settings details vary by hardware, Ubuntu release, and desktop flavor, so users still need to inspect their local `pactl` output before copying examples exactly.
