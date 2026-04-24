# Validation Summary: How to Use Local DNS with Portainer (Pi-hole/AdGuard) - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker / Docker Compose stacks
- Pi-hole
- AdGuard Home
- DNS / dnsmasq
- systemd-resolved
- OpenSSL

## Sources Consulted
- Pi-hole Docker configuration: https://docs.pi-hole.net/docker/configuration/
- Pi-hole FTL configuration reference: https://docs.pi-hole.net/ftldns/configfile/
- Pi-hole CLI reference: https://docs.pi-hole.net/main/pihole-command/
- Pi-hole FAQ on local DNS record precedence: https://docs.pi-hole.net/main/faq/
- RFC 8375, `home.arpa.` special-use domain: https://www.rfc-editor.org/rfc/rfc8375
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- AdGuard Home OpenAPI spec: https://github.com/AdguardTeam/AdGuardHome/blob/master/openapi/openapi.yaml
- AdGuard Home configuration wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- AdGuard Home Docker wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker networking reference: https://docs.docker.com/engine/network/
- systemd `resolved.conf` reference: https://www.freedesktop.org/software/systemd/man/resolved.conf.html

## Issues Found
- The Pi-hole stack used legacy environment variables (`WEBPASSWORD`, `PIHOLE_DNS_`, `DNSMASQ_LISTENING`) while current Pi-hole Docker documentation for `pihole/pihole:latest` documents `FTLCONF_webserver_api_password`, `FTLCONF_dns_upstreams`, and `FTLCONF_dns_listeningMode`. I updated the stack to the current variables.
- The Pi-hole stack comment said host networking was required for DNS on port 53, but current Pi-hole Docker docs describe `--net=host` as an optional alternative to explicit port publishing. I corrected that note.
- The `NET_ADMIN` comment implied it was generally required. Current Pi-hole docs say it is recommended mainly for DHCP-related operation and can be skipped when DHCP/RA are not in use. I corrected that note.
- The post used the `.home` suffix for local DNS examples. RFC 8375 reserves `home.arpa.` for this purpose, so I updated the examples, search-domain settings, and certificate names to `home.arpa`.
- The introduction implied DNS alone removes the port from service URLs. DNS maps names to addresses, not ports, so I corrected the example to `portainer.home.arpa:9443`.
- The Pi-hole CLI example wrote files into `/etc/dnsmasq.d` and then ran `pihole restartdns`. In current Pi-hole, `misc.etc_dnsmasq_d` defaults to `false`, and the documented reload commands do not reread `*.conf` files. I replaced that section with the supported `pihole-FTL --config misc.dnsmasq_lines ...` approach.
- The old wildcard Pi-hole example used `address=/*.home/...`, which is not valid dnsmasq syntax. Per the dnsmasq man page, `address=/domain/ip` already matches the domain and its subdomains. I corrected the catch-all example accordingly.
- The AdGuard Home API example hardcoded port `3000`. Official AdGuard docs indicate `3000` is the initial setup UI port, while the admin interface URL is configurable. I changed the example to use the configured admin URL plus `/control/rewrite/add`.
- The `/etc/resolv.conf` example was presented as a generic static-DNS method, but on many Linux systems it is temporary because network managers overwrite it. I clarified that it is a temporary test.
- The verification command `docker exec pihole pihole -t | grep ...` was an interactive tailing example that can hang. I replaced it with a one-shot log grep against Pi-hole’s documented log location.

## Review Notes
- The post is technically accurate after the fixes above and is still relevant as of 2026-04-24.
- The AdGuard wildcard rewrite example is supported by the official configuration docs. Its use with the HTTP API is an inference from the OpenAPI spec using the same `RewriteEntry` schema for rewrite creation.
- The guide still uses `:latest` image tags. That is valid, but pinning image versions would make the post more reproducible over time.
