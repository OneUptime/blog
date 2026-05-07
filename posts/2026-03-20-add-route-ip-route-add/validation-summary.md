# Validation Summary: How to Add a Route with ip route add

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iproute2`
- Linux kernel IPv4 routing
- Netplan
- NetworkManager
- Debian `ifupdown`

## Sources Consulted
- `ip-route(8)` manual page (`man ip-route`) and the corresponding online man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip(8)` manual page (`man ip`) and the corresponding online man page: https://man7.org/linux/man-pages/man8/ip.8.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian `ifupdown` `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html

## Issues Found
- The comment above `ip route show` described it as showing the "full routing table". I changed it to "main table (default)" because `ip route show` defaults to the main routing table rather than every routing table.
- The metric section said the higher-metric route is used "if primary fails". I changed that wording to "less preferred" because the documented behavior is that lower metrics are preferred; the original phrasing implied stronger failover semantics than the post established.
- The `unreachable` route comment said it sends "ICMP unreachable". I changed it to "ICMP host unreachable response" to match `ip-route(8)`.
- The comment above `ip -d route show` said "Show all routes in verbose mode". I changed it to "Show routes with additional details" because `-d` adds detail but does not mean all routing tables are shown.

## Review Notes
- The commands in the post are current and syntactically valid for modern `iproute2`.
- The persistence guidance is accurate at a high level and correctly points readers to distribution-specific tooling.
- For automation, `ip route replace` is often safer than `ip route add` when a route may already exist, but the article is explicitly about `ip route add`, so no change was needed.
