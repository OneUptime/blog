# Validation Summary: How to Configure GRE Tunnel with Key for Multiple Tunnels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux GRE tunnels with `iproute2`
- GRE Key extension for IPv4 GRE
- `tshark` / Wireshark display filters
- `tcpdump` / libpcap packet filters
- `systemd-networkd`

## Sources Consulted
- RFC 2890, Key and Sequence Number Extensions to GRE: https://www.rfc-editor.org/rfc/rfc2890.html
- `ip-tunnel(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `systemd.netdev(5)` official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `tshark(1)` official Wireshark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark GRE display filter reference: https://www.wireshark.org/docs/dfref/g/gre.html
- `pcap-filter(7)` Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local CLI/manpage verification on the review host: `ip tunnel help`, `man ip-tunnel`, `man systemd.netdev`, `man systemd.network`, `man pcap-filter`

## Issues Found
- The post stated that without keys only one GRE tunnel is possible between the two outer IPv4 endpoints. I changed this to the narrower, source-backed statement that without GRE keys there is no key field available to distinguish logical flows between the same endpoints.
- The local examples created a management tunnel with key `300`, but the remote-side configuration omitted the matching `gre-mgmt` tunnel. I added the missing remote commands and updated the verification example to include the management tunnel.
- The `tshark -i eth0 -Y "gre.key == 100"` example was described as capturing GRE with a specific key. In TShark, `-Y` is a display filter, so I changed the wording to describe what the command actually does.
- The `systemd-networkd` `.netdev` example omitted `Independent=yes`. Per `systemd.netdev(5)`, a tunnel is not created from a standalone `.netdev` by default unless a `.network` file requests it via `Tunnel=`. I added `Independent=yes` so the shown snippet is self-contained.
- The note about `ip tunnel show | grep key` was softened from always showing hexadecimal output to may show hexadecimal output, which is safer across `iproute2` output variations.

## Review Notes
- `Key=` in `systemd-networkd` tunnel configuration is available from systemd version 231, and `Independent=` is available from version 235.
- A separate `.network` file would still be needed if the operator wants `systemd-networkd` to assign `172.16.1.1/30` to `gre-tenant-a` persistently; the post's `.netdev` snippet only defines the tunnel device.
