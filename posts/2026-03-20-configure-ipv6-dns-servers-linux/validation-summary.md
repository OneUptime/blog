# Validation Summary: How to Configure IPv6 DNS Servers on Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- IPv6 DNS resolution
- `/etc/resolv.conf`
- systemd-resolved (`resolvectl`, `/etc/systemd/resolved.conf`)
- NetworkManager (`nmcli`)
- Netplan (Ubuntu YAML network configuration)
- systemd-networkd (`.network` unit files)
- `dig` for DNS query testing
- `tcpdump` for packet capture verification
- Public DNS providers: Google, Cloudflare, Quad9, OpenDNS

## Sources Consulted
- resolv.conf(5) man page — https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- resolved.conf(5) man page — https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- resolvectl(1) man page — https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- systemd.network(5) man page — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- nmcli(1) and NetworkManager settings reference — https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Netplan reference — https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Google Public DNS IPv6 addresses — https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IPv6 addresses — https://one.one.one.one/dns/
- Quad9 service addresses — https://quad9.net/service/service-addresses-and-features
- OpenDNS IPv6 addresses — https://www.opendns.com/setupguide/

## Issues Found
No technical issues found.

## Review Notes
- All public DNS provider IPv6 addresses (Google, Cloudflare, Quad9, OpenDNS) match the values published by their operators.
- `resolvectl query -6 google.com` uses the documented `-6` flag, which restricts the lookup to AAAA records (IPv6 only).
- The note about `/etc/resolv.conf` being a symlink on systems managed by NetworkManager or systemd-resolved is accurate and important context.
- In Method 3, using `eth0` as a connection name is a simplification; in practice, NetworkManager connection names often differ from the device name (e.g., "Wired connection 1"). The reader should run `nmcli connection show` to find the correct connection name. This is a minor real-world caveat rather than a technical error.
- The `fg; # Ctrl+C` pattern at the end of the verification block is syntactically valid bash (the semicolon ends `fg`, then a comment) but is unconventional; the comment is intended as instruction to the reader rather than executable behavior. Not a technical error.
- Netplan's `accept-ra: true` is the documented way to honor IPv6 Router Advertisements, which is consistent with the post's IPv6-focused theme.
