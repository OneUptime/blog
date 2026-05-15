# Validation Summary: How to Configure PipeWire as the Default Audio Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 and later
- PipeWire
- PulseAudio compatibility through pipewire-pulseaudio
- WirePlumber
- JACK compatibility
- ALSA compatibility
- systemd user services
- DNF package management

## Sources Consulted
- Red Hat RHEL 9 documentation, "PipeWire is now the default audio service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_desktop_considerations-in-adopting-rhel-9
- Red Hat RHEL 9 release notes, PulseAudio daemon deprecation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/deprecated-functionalities
- Red Hat Customer Portal, "Switching from PipeWire to PulseAudio": https://access.redhat.com/articles/6958410
- Red Hat RHEL 9 package manifest / package replacement notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/considerations_in_adopting_rhel_9/assembly_command-line-assistant_considerations-in-adopting-rhel-9
- PipeWire pipewire.conf manual: https://docs.pipewire.org/page_man_pipewire_conf_5.html
- PipeWire pw-cli manual: https://docs.pipewire.org/page_man_pw-cli_1.html
- PipeWire pw-top manual: https://docs.pipewire.org/page_man_pw-top_1.html
- PipeWire pw-mon manual: https://docs.pipewire.org/page_man_pw-mon_1.html
- PulseAudio default device documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/DefaultDevice/
- PulseAudio 15.0 notes for pactl get-default/get-mute commands: https://www.freedesktop.org/wiki/Software/PulseAudio/Notes/15.0/

## Issues Found
- The post described "RHEL" broadly as using PipeWire by default. Red Hat documents PipeWire as the default audio service starting with RHEL 9.0, so the description and introduction now say "RHEL 9 and later."
- The post said PipeWire replaces PulseAudio generally. Red Hat notes that the PulseAudio daemon is replaced while PulseAudio client libraries and tools remain in use, so the wording now says "replacing the PulseAudio daemon."
- The install command omitted `pulseaudio-utils`, even though the post uses `pactl` and `paplay`. Added `pulseaudio-utils` to the install command.
- The install command omitted `wireplumber`, even though the post enables and starts the WirePlumber service. Added `wireplumber` to the install command.
- The post recommended installing `pipewire-codec-aptx`, which is not listed in standard RHEL repositories. Replaced that command with the RHEL `pipewire-alsa` compatibility package.
- The PulseAudio replacement instructions removed `pulseaudio-libs`. Red Hat documents that PulseAudio client libraries are still used, and removing them can break client utilities and applications. Replaced the removal/install sequence with `dnf swap --allowerasing pulseaudio pipewire-pulseaudio`.

## Review Notes
The PipeWire drop-in configuration format, `context.properties` keys, `pactl` commands, `pw-top`, `pw-cli list-objects`, and `pw-mon` commands were checked against upstream documentation and are technically valid. Copying the full PipeWire configuration into `~/.config/pipewire/` works, but PipeWire upstream recommends drop-in files for small changes, which the post already uses for the low-latency example.
