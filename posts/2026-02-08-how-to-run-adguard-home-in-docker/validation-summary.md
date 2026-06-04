# Validation Summary: How to Run AdGuard Home in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- AdGuard Home
- DNS, DNS-over-HTTPS, and DNS-over-TLS
- DHCP
- systemd-resolved
- UFW
- OneUptime monitoring

## Sources Consulted
- AdGuard Home Docker documentation: https://hub.docker.com/r/adguard/adguardhome
- AdGuard Home Docker wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- AdGuard Home configuration wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- AdGuard DNS filtering rules syntax: https://adguard-dns.io/kb/general/dns-filtering-syntax/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- OneUptime monitoring product documentation: https://oneuptime.com/product/monitoring
- OneUptime port monitor documentation: https://oneuptime.com/docs/monitor/port-monitor

## Issues Found
- The Compose example used the obsolete top-level `version` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The Compose example omitted port `80/tcp`, but the setup wizard section recommended the default admin interface port 80. Added the `80:80/tcp` mapping so the post-wizard admin interface remains reachable.
- The Compose example mapped DHCP ports in bridge mode and implied that `cap_add: NET_ADMIN` was enough for DHCP. Updated the guidance to say DHCP should use `network_mode: host` on Linux instead of port mappings, matching AdGuard Home Docker documentation.
- The systemd-resolved workaround edited `/etc/systemd/resolved.conf` with a narrow `sed` replacement and missed the recommended resolver update. Replaced it with the official drop-in approach, including `DNS=127.0.0.1`, the `/etc/resolv.conf` symlink update, and `reload-or-restart`.
- The upstream DNS section said AdGuard Home queries the fastest available server by default. Updated it to describe the default load-balancing behavior, which favors upstreams with fewer failures and lower average lookup time.
- The firewall troubleshooting snippet allowed port 3000 but not the corrected post-wizard admin port 80. Added `sudo ufw allow 80/tcp`.

## Review Notes
The blocklist URLs were checked and returned HTTP 200 responses. The custom filtering rule syntax, DNS rewrite syntax, upstream resolver URL formats, Docker volume paths, cache settings, and Docker Compose commands are technically valid. Future improvements could mention that exposing ports 443 and 853 is only needed after configuring encrypted DNS certificates in AdGuard Home.
