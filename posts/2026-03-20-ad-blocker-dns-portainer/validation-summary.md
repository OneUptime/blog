# Validation Summary: How to Self-Host an Ad Blocker (DNS) with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Pi-hole
- AdGuard Home
- Unbound
- DNS
- DHCP
- NetworkManager / `nmcli`

## Sources Consulted
- Pi-hole Docker docs: https://docs.pi-hole.net/docker/
- Pi-hole Docker configuration: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5-to-v6 upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole CLI reference: https://docs.pi-hole.net/main/pihole-command/
- Pi-hole Docker DHCP and network modes: https://docs.pi-hole.net/docker/dhcp/
- Pi-hole FTLDNS configuration reference: https://docs.pi-hole.net/ftldns/configfile/
- Pi-hole tips and tricks (`nmcli` / DNS host config): https://docs.pi-hole.net/docker/tips-and-tricks/
- Pi-hole FAQ (`/etc/pihole/custom.list` for local DNS records): https://docs.pi-hole.net/main/faq/
- Pi-hole Unbound guide: https://docs.pi-hole.net/guides/dns/unbound/
- AdGuard Home Docker wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- Docker Compose reference (`version` top-level element is obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`ipv4_address` requirements): https://docs.docker.com/reference/compose-file/services/
- `mvance/unbound` image README: https://github.com/MatthewVance/unbound-docker
- NLnet Labs Unbound documentation: https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- Verified referenced blocklist URLs were reachable:
- https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
- https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.Spam/hosts
- https://www.github.developerdan.com/hosts/lists/ads-and-tracking-extended.txt

## Issues Found
- The Pi-hole compose example used multiple removed or outdated pre-v6 Docker environment variables (`WEBPASSWORD`, `PIHOLE_DNS_`, `DNSSEC`, `FTLCONF_PRIVACYLEVEL`, `IPv6`, `VIRTUAL_HOST`). I replaced them with current Pi-hole v6 `FTLCONF_*` equivalents and added `FTLCONF_dns_listeningMode=all`, which Pi-hole documents as necessary for bridge networking.
- The Pi-hole snippet implied DHCP would work by simply publishing UDP 67 from a bridge network. Pi-hole’s Docker DHCP documentation explains that bridge mode also needs a DHCP relay, so I changed the example to stop presenting DHCP as a drop-in optional port mapping.
- The AdGuard Home compose example used incorrect or outdated port mappings for encrypted DNS. I replaced the undocumented `784/udp` mapping with the documented `853/udp` DNS-over-QUIC port and added the missing explicit `443/tcp` and `443/udp` mappings described in AdGuard Home’s Docker documentation.
- The router configuration section suggested using `1.1.1.1` as a secondary DNS fallback. That would allow clients to bypass the local blocker, so I changed the recommendation to leave secondary DNS blank if possible or use a second internal Pi-hole/AdGuard Home instance.
- The `nmcli` example set a manual DNS server but did not disable automatically supplied DNS servers. I updated it to use `ipv4.ignore-auto-dns yes`, matching Pi-hole’s documented host DNS configuration guidance.
- The blocklist section incorrectly referred to the Pi-hole API while describing a web UI workflow, and it used the older `pihole -g` alias. I corrected the wording and switched the example to `pihole updateGravity`.
- The local DNS record example wrote `dnsmasq` entries to `/opt/pihole/dnsmasq/custom.conf`, which is not the supported Pi-hole v6 workflow shown in current docs. I replaced it with an example that appends host-style records to `/etc/pihole/custom.list`.
- The Unbound section incorrectly described `mvance/unbound:latest` as a recursive resolver by default and pointed Pi-hole at `#5335`. The image’s own README states the default behavior is forwarding to Cloudflare over TLS on port 53, so I corrected the text and changed the upstream example to `unbound#53`.
- The monitoring and allowlisting examples used older CLI aliases (`-c`, `-t`, `-g`, `-w`, `--white-regex`). I updated them to current documented commands such as `pihole tail`, `pihole updateGravity`, `pihole allow`, and `pihole --allow-regex`.
- The conclusion included an unsupported specific blocking-rate claim (`15-25%`). I softened that sentence to avoid presenting an unverified quantitative figure as fact.

## Review Notes
- The post is now technically valid, but it is more “Portainer via Compose stack” than a click-by-click Portainer UI walkthrough.
- Pi-hole v6 treats settings provided through `FTLCONF_*` environment variables as read-only from the UI and CLI. Readers should update the stack definition when changing those settings.
- The Unbound section is accurate after correction, but it does not include a full recursive `unbound.conf`. If the post later wants a full Unbound recursion walkthrough, that should be expanded with a complete, tested config rather than relying on image defaults.
