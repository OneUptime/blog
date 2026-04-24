# Validation Summary: How to Deploy AdGuard Home via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- AdGuard Home
- DNS
- DNS-over-HTTPS (DoH)
- DNS-over-TLS (DoT)
- Pi-hole

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- AdGuard Home Docker docs: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- AdGuard Home configuration docs: https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- AdGuard Home DHCP docs: https://github.com/AdguardTeam/AdGuardHome/wiki/DHCP
- AdGuard DNS filter repository: https://github.com/AdguardTeam/AdGuardSDNSFilter
- AdGuard Home overview: https://adguard.com/en/adguard-home/overview.html
- AdGuard Home in-depth overview: https://adguard.com/en/blog/in-depth-review-adguard-home.html
- Cloudflare DoH docs: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/
- Quad9 services docs: https://docs.quad9.net/services/
- Google Public DNS DoH docs: https://developers.google.com/speed/public-dns/docs/doh/
- Pi-hole `cloudflared` guide: https://docs.pi-hole.net/guides/dns/cloudflared/
- Pi-hole `dnscrypt-proxy` guide: https://docs.pi-hole.net/guides/dns/dnscrypt-proxy/
- Pi-hole FTLDNS configuration: https://docs.pi-hole.net/ftldns/configfile/
- RFC 7858 (DNS-over-TLS): https://datatracker.ietf.org/doc/html/rfc7858
- RFC 8484 (DNS-over-HTTPS): https://datatracker.ietf.org/doc/html/rfc8484

## Issues Found
- The post referred to the built-in filter as `AdGuard Base filter`. Updated it to `AdGuard DNS filter`, which is the default filter documented for AdGuard Home.
- The NiceHash blocklist URL returned HTTP 404 during validation on 2026-04-24. Removed the dead URL and kept the verified AdAway list.
- The post-setup admin UI line hard-coded port `80`, even though the setup section already allows choosing a different admin port. Updated the text to reference the configured port.
- The router recommendation used public DNS `1.1.1.1` as a secondary resolver. Updated it to recommend leaving secondary DNS blank or using a second AdGuard Home instance, because a public secondary resolver can bypass filtering for some clients.
- The Pi-hole comparison table said DNSSEC requires `dnsmasq` config. Updated it to `Built-in`, matching current Pi-hole FTLDNS configuration.
- The comparison table used fixed `~50MB RAM` figures for both products. Replaced them with `Varies by lists and traffic` because the exact footprint is workload-dependent and not documented as a stable fixed value.
- The conclusion said DoH/DoT “prevents ISP monitoring of your DNS queries.” Revised this to say it encrypts upstream DNS traffic and reduces direct ISP visibility, which is the technically accurate scope of those protocols.

## Review Notes
- The Docker/Portainer stack YAML is syntactically valid and consistent with AdGuard Home’s official Docker image volume and port mapping guidance for plain DNS, the setup UI, HTTPS/DoH, and DoT.
- The upstream DoH endpoints for Cloudflare, Quad9, and Google all validated successfully during live checks on 2026-04-24.
- The guide does not configure AdGuard Home’s DHCP server. If a reader wants AdGuard Home to provide DHCP directly from Docker, the official docs recommend host networking rather than bridge-mode port mappings.
