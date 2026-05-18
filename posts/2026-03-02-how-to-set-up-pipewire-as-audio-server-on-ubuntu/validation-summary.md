# Validation Summary: How to Set Up PipeWire as Audio Server on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- PipeWire (audio/video server)
- WirePlumber (PipeWire session manager)
- PulseAudio (compatibility layer via pipewire-pulse)
- JACK Audio Connection Kit (compatibility layer via pipewire-jack)
- ALSA (compatibility via pipewire-alsa)
- BlueZ / Bluetooth audio stack (libspa-0.2-bluetooth)
- systemd user services
- xdg-desktop-portal (Wayland screen-capture audio)
- OBS Studio
- helvum (PipeWire graph editor)
- pavucontrol
- Ubuntu 22.04 LTS and 24.04 LTS

## Sources Consulted
- PipeWire official documentation: https://docs.pipewire.org/
- PipeWire `pw-cli(1)` man page: https://docs.pipewire.org/page_man_pw-cli_1.html
- PipeWire `pipewire.conf(5)` man page: https://docs.pipewire.org/page_man_pipewire_conf_5.html
- WirePlumber 0.4 Bluetooth configuration docs: https://sanchayanmaity.pages.freedesktop.org/wireplumber/configuration/bluetooth.html
- WirePlumber 0.5 migration guide: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/migration.html
- Canonical blog "What's new in Ubuntu Desktop 22.10": https://canonical.com/blog/whats-new-in-ubuntu-desktop-22-10-kinetic-kudu
- Ubuntu package archives (jammy / noble) for pipewire, wireplumber, pipewire-audio-client-libraries, libspa-0.2-bluetooth
- ArchWiki PipeWire page (quantum/rate defaults): https://wiki.archlinux.org/title/PipeWire

## Issues Found

1. **Incorrect Ubuntu version for PipeWire default** — The post stated "Ubuntu 23.04 and later fully default to PipeWire." PipeWire actually became the default audio server starting in **Ubuntu 22.10 (Kinetic Kudu)**, per Canonical's release notes. Changed to "Ubuntu 22.10 and later".

2. **Broken `pw-cli list-objects` grep pattern** — The post used `grep -i "type:PipeWire:Interface:Node"`. The actual `pw-cli list-objects` output uses a space (`type: PipeWire:Interface:Node`), so the original pattern would match nothing. Simplified to `grep -i "PipeWire:Interface:Node"`, which reliably matches the node entries regardless of the exact spacing/punctuation after `type`.

## Review Notes

- The Lua-based WirePlumber Bluetooth configuration (`~/.config/wireplumber/bluetooth.lua.d/51-bluez-config.lua`) is correct for the WirePlumber 0.4.x series, which ships in both Ubuntu 22.04 LTS (0.4.8) and Ubuntu 24.04 LTS (0.4.17). Readers on WirePlumber 0.5+ (Ubuntu 24.10 and later, or other distros) will need to migrate to the SPA-JSON configuration format under `~/.config/wireplumber/wireplumber.conf.d/`. Worth a future caveat once a newer Ubuntu LTS ships with 0.5.
- `pipewire-audio-client-libraries` is the real package on Ubuntu 22.04 but is a transitional metapackage on Ubuntu 24.04 (pulling in `pipewire-alsa` and `pipewire-jack`). It still installs cleanly on both, so the install command is functionally correct.
- The `wpctl set-default $(wpctl status | grep "Speakers\|Headphones" | awk '{print $2}' | head -1)` one-liner is fragile because `wpctl status` output uses tree-drawing characters and marks defaults with `*`. It is presented as a quick example, but readers may prefer to read the ID from `wpctl status` manually.
- LDAC and aptX codecs require additional libraries (`libldacbt-enc2`, `libfreeaptx0`) on some Ubuntu versions before PipeWire can negotiate them; this is not mentioned but is a common Bluetooth gotcha.
- Default PipeWire quantum (1024) and rate (48000) values are correct.
