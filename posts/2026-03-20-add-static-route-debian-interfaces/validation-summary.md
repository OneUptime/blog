# Validation Summary: How to Add a Static Route on Debian Using /etc/network/interfaces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Debian
- ifupdown
- /etc/network/interfaces
- iproute2 (`ip route`)
- ifupdown-extra
- /etc/network/if-up.d/ hook scripts

## Sources Consulted
- Debian `interfaces(5)` manpage: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Debian `ifup(8)` manpage: https://manpages.debian.org/trixie/ifupdown/ifup.8.en.html
- Debian Reference, Chapter 5 network setup: https://www.debian.org/doc/manuals/debian-reference/ch05
- Debian package metadata for `ifupdown-extra`: https://packages.debian.org/bookworm/ifupdown-extra
- Debian package file list for `ifupdown-extra`: https://packages.debian.org/bookworm/all/ifupdown-extra/filelist
- Debian Sources for `ifupdown-extra.networking-routes.init`: https://sources.debian.org/src/ifupdown-extra/0.34/debian/ifupdown-extra.networking-routes.init/
- Debian Sources for `networking.service`: https://sources.debian.org/src/ifupdown/0.8.36/debian/networking.service
- Local `ip route help` output from the installed `iproute2` CLI
- Unpacked `ifupdown-extra_0.33+nmu1_all.deb` sample files (`/etc/network/routes` and `/etc/network/if-up.d/20static-routes`) obtained with `apt download ifupdown-extra`

## Issues Found
- The `ifupdown-extra` section was inaccurate. The package does not add a cleaner route stanza inside `/etc/network/interfaces`; it installs helper scripts and reads routes from `/etc/network/routes`. I replaced the example with the shipped route-file format.
- The `up` and `down` method was labeled as "Legacy Syntax", but Debian documents `up`/`post-up` and `down`/`pre-down` as aliases rather than deprecated syntax. I removed that label.
- I also clarified the Method 4 text to use the full `/etc/network/if-up.d/` path and updated the conclusion so it matches Debian's documented alias behavior.

## Review Notes
- The post is accurate for Debian systems that still use the traditional `ifupdown` stack. Systems managed by NetworkManager or systemd-networkd do not use `/etc/network/interfaces` in the same way.
- I did not execute `ifdown`, `ifup`, or `systemctl restart networking` during validation, because doing so would change live network state. Validation was performed against Debian documentation, package metadata, and package contents.
