# Validation Summary: How to Add a Static ARP Entry with ip neigh add

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- iproute2
- `ip neigh`
- ARP
- systemd

## Sources Consulted
- `ip neigh help` from the installed `iproute2` package
- `ip-neighbour(8)` upstream iproute2 manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `systemd.service(5)` official documentation: https://www.freedesktop.org/software/systemd/man/253/systemd.service.html

## Issues Found
- The `nud noarp` explanation described `NOARP` as a static ARP entry. I changed it to state that `NOARP` disables neighbor validation and, unlike `PERMANENT`, can still expire. This matches `ip-neighbour(8)`.
- The persistence section said the example used a `systemd-networkd` `.network` file approach, but the snippet actually creates a systemd service unit. I corrected that description to match the code shown.

## Review Notes
- The post is valid for its stated IPv4 ARP scope. `ip neigh` also manages IPv6 neighbor entries, but the article consistently uses IPv4 ARP examples.
- If a future revision wants a true `systemd-networkd` example, `systemd.network(5)` documents native `[Neighbor]` sections for persistent static ARP or neighbor entries.
