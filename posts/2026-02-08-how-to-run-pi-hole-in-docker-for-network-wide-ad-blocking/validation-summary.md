# Validation Summary: How to Run Pi-hole in Docker for Network-Wide Ad Blocking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pi-hole
- Docker
- Docker Compose
- DNS and DHCP
- dnsmasq
- Pi-hole v6 REST API
- dnscrypt-proxy

## Sources Consulted
- Pi-hole Docker documentation: https://docs.pi-hole.net/docker/
- Pi-hole Docker configuration reference: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5-to-v6 upgrade guide: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole Docker DHCP documentation: https://docs.pi-hole.net/docker/dhcp/
- Pi-hole command documentation: https://docs.pi-hole.net/main/pihole-command/
- Pi-hole API documentation: https://docs.pi-hole.net/api/
- Pi-hole API authentication documentation: https://docs.pi-hole.net/api/auth/
- Pi-hole FTL configuration reference: https://docs.pi-hole.net/ftldns/configfile/
- Pi-hole dnscrypt-proxy guide: https://docs.pi-hole.net/guides/dns/dnscrypt-proxy/
- Pi-hole cloudflared guide deprecation notice: https://docs.pi-hole.net/guides/dns/cloudflared/
- Local validation against `pihole/pihole:latest` Docker image, including `pihole --help`, API endpoint discovery, and selected REST calls.

## Issues Found
- The Docker examples used deprecated Pi-hole v5 environment variables (`WEBPASSWORD`, `PIHOLE_DNS_`, `DNSMASQ_LISTENING`, `QUERY_LOGGING`). Updated them to the current v6 `FTLCONF_...` variables.
- The DHCP example used deprecated v5 Docker environment variables. Updated them to `FTLCONF_dhcp_active`, `FTLCONF_dhcp_start`, `FTLCONF_dhcp_end`, `FTLCONF_dhcp_router`, and `FTLCONF_dns_domain`.
- The blocklist examples used the removed `pihole -a adlist add` command. Replaced them with Pi-hole v6 REST API calls to `/api/lists?type=block`.
- The allowlist examples used old whitelist aliases (`pihole -w`, `--white-regex`). Updated them to `pihole allow`, `pihole --allow-regex`, and `pihole allow --list`.
- The custom DNS examples used the removed `pihole -a addcustomdns` command. Replaced them with `pihole-FTL --config misc.dnsmasq_lines`.
- The dnsmasq custom configuration note did not mention that Pi-hole v6 ignores `/etc/dnsmasq.d` unless explicitly enabled. Added `FTLCONF_misc_etc_dnsmasq_d`.
- The DNS-over-HTTPS section used `cloudflared proxy-dns`, which is deprecated for new installations. Updated the guidance to use dnscrypt-proxy.
- The monitoring examples used removed v5 `admin/api.php` endpoints and static API token authentication. Replaced them with the v6 session-based API flow and current REST endpoints.
- The Teleporter backup examples used the removed `pihole -a teleporter` CLI. Replaced export with the v6 `/api/teleporter` endpoint and restore guidance through the web interface.
- Removed the obsolete top-level Docker Compose `version` field from the example.

## Review Notes
The post is now aligned with Pi-hole v6 behavior as of the current `pihole/pihole:latest` image. The DoH section intentionally stays high level because dnscrypt-proxy deployment details vary by image and network topology.
