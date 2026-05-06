# Validation Summary: How to Configure DNS Search Domains with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux DNS resolver configuration
- `nmcli`
- NetworkManager
- DNS search domains
- `systemd-resolved`
- DHCP DNS settings

## Sources Consulted
- NetworkManager Reference Manual: `nm-settings-nmcli` https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager Reference Manual: `nmcli` https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager Reference Manual: `NetworkManager.conf` https://www.networkmanager.dev/docs/api/1.46.0/NetworkManager.conf.html
- systemd manual: `resolvectl` https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Local authoritative man pages checked during review: `man nm-settings-nmcli`, `man nmcli`, `man nslookup`, `man resolv.conf`

## Issues Found
- The post incorrectly described routing domains as `ipv4.dns`. I corrected this to `ipv4.dns-search` with a `~domain` prefix, which NetworkManager treats as a routing-only domain for split DNS rather than a normal hostname-completion suffix.
- The “Clear All Search Domains” section overstated what `ipv4.dns-search ""` guarantees on DHCP-managed connections. I narrowed it to manually configured search domains, which matches NetworkManager behavior unless `ipv4.ignore-auto-dns yes` is also set.
- The DHCP example comment said only search domains were ignored, but `ipv4.ignore-auto-dns yes` ignores both automatically provided DNS servers and search domains. I updated the comment accordingly.
- The `/etc/resolv.conf` verification step was too broad for systems using `systemd-resolved`. I added `resolvectl domain` and adjusted the conclusion so the verification guidance remains correct on those systems.

## Review Notes
- No other technical issues were found after the corrections above.
- I also validated the command syntax locally with `nmcli --offline`, confirming that `ipv4.dns-search` accepts multiple values and that `+`, `-`, and `""` behave as described.
