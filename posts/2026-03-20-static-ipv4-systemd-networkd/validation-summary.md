# Validation Summary: How to Configure a Static IPv4 Address with systemd-networkd - A Practical Guide

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- systemd-networkd
- systemd-resolved
- iproute2
- systemctl
- DNS resolution

## Sources Consulted
- systemd.network official documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd-resolved.service official documentation: https://www.freedesktop.org/software/systemd/man/257/systemd-resolved.service.html
- networkctl official documentation: https://www.freedesktop.org/software/systemd/man/257/networkctl.html
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762.html
- IANA Example Domains: https://www.iana.org/help/example-domains
- Local CLI help for `systemctl`, `networkctl`, `resolvectl`, and `iproute2`

## Issues Found
- The main `.network` example configured the same default gateway twice: `Gateway=192.168.1.1` in `[Network]` and a separate `[Route]` section with `Gateway=192.168.1.1`. The systemd documentation defines `[Network] Gateway=` as shorthand for a `[Route]` section containing only `Gateway=`, so the duplicate route was removed.
- The DNS search domain example used `example.local`. The `.local` suffix is reserved for Multicast DNS and systemd-resolved treats it specially, so it was changed to `example.com`, an IANA-reserved documentation domain.

## Review Notes
- Restarting `systemd-networkd` is valid, but it can temporarily interrupt connectivity on remote hosts. A future revision could mention using a console session or maintenance window when changing the active network interface.
