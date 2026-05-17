# Validation Summary: How to Replace PulseAudio with PipeWire on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- PipeWire (multimedia server)
- PulseAudio (legacy audio server)
- WirePlumber (PipeWire session manager)
- JACK (compatibility layer)
- BlueZ / Bluetooth audio codecs (SBC, mSBC, aptX, AAC, LDAC)
- systemd user services
- Ubuntu 22.04 LTS (primary target), 22.10+
- pactl, pw-cli, pw-top, pw-play, pw-dump
- pavucontrol, Helvum (Flatpak)
- ALSA compatibility layer

## Sources Consulted
- PipeWire official documentation: https://docs.pipewire.org/
- pw-cli man page: https://docs.pipewire.org/page_man_pw-cli_1.html
- WirePlumber 0.4.x Bluetooth configuration: https://sanchayanmaity.pages.freedesktop.org/wireplumber/configuration/bluetooth.html
- WirePlumber 0.5 migration guide: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/migration.html
- Helvum on Flathub: https://flathub.org/apps/org.pipewire.Helvum
- Ubuntu package index (jammy): https://packages.ubuntu.com/jammy/pipewire-audio-client-libraries
- OMG! Ubuntu — Ubuntu 22.10 PipeWire default coverage
- Launchpad bug #1991936 (AAC codec on Ubuntu PipeWire)

## Issues Found

1. **Incorrect Helvum Flatpak ID.** The post used `org.freedesktop.pipewire.Helvum`, which does not exist on Flathub. The correct ID is `org.pipewire.Helvum`. Fixed in the `flatpak install` command under "Using Helvum for Visual Audio Routing".

2. **`pw-cli info` invoked without required argument.** The `info` subcommand requires either an object ID or the literal `all` per pw-cli documentation; running it bare is not valid. Changed `pw-cli info` to `pw-cli info all` and updated the comment to reflect what the command actually does.

3. **Overstated codec coverage for `libspa-0.2-bluetooth`.** The package description claimed the package provides "aptX and AAC" support. On Ubuntu 22.04 the package primarily enables SBC and mSBC; aptX and AAC support depends on optional codec libraries that are not always pulled in by this package on 22.04 (they became more available in later Ubuntu releases). Rewrote the package description to reflect the actual default behaviour.

## Review Notes

- **WirePlumber 0.4 vs 0.5 configuration format.** The Lua-based configuration shown (`~/.config/wireplumber/bluetooth.lua.d/51-bluez-config.lua` with `bluez_monitor.properties`) is valid for WirePlumber 0.4.x, which is what Ubuntu 22.04 LTS ships. WirePlumber 0.5+ (Ubuntu 24.04 and later) switched to SPA-JSON configuration in `~/.config/wireplumber/wireplumber.conf.d/`, and the Lua snippet shown in the post will not be applied there. Since the post explicitly targets Ubuntu 22.04, the existing instructions are correct in context, but readers on newer releases would need the SPA-JSON equivalent.
- **systemctl unit semantics.** `systemctl --user enable pipewire pipewire-pulse` is correct: upstream unit files include `[Install] Also=pipewire.socket`, so the sockets are enabled alongside the services. No fix required.
- **`pactl info | grep "Server Name"` output format.** Verified: the pipewire-pulse compatibility layer reports `Server Name: PulseAudio (on PipeWire X.Y.Z)`, matching what the post claims.
- **Ubuntu release claims verified.** Ubuntu 22.10 ("Kinetic Kudu") was indeed the first release to ship PipeWire as the default desktop audio server; the 22.04 LTS / 22.10+ split described in the post is accurate.
