# Validation Summary: How to Use Local DNS with Portainer (Pi-hole/AdGuard)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Pi-hole
- AdGuard Home
- Docker Compose / Docker networking
- Local DNS and dnsmasq-based overrides
- Reverse proxy concepts (Nginx, Traefik)

## Sources Consulted
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5 to v6 upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole CLI docs (`pihole` command): https://docs.pi-hole.net/main/pihole-command/
- Pi-hole web interface README: https://github.com/pi-hole/web
- AdGuard Home Getting Started: https://adguard-dns.io/kb/adguard-home/getting-started/
- AdGuard Home FAQ: https://adguard-dns.io/kb/adguard-home/faq/
- AdGuard Home configuration reference: https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- RFC 8375 (`home.arpa` special-use domain): https://www.rfc-editor.org/rfc/rfc8375.html

## Issues Found
1. **The Pi-hole stack used removed pre-v6 environment variables.** `WEBPASSWORD` and `PIHOLE_DNS_` were replaced in current Pi-hole docs by `FTLCONF_webserver_api_password` and `FTLCONF_dns_upstreams`. Updated the stack to use the current variable names.

2. **The Pi-hole config-file workflow would not work as written on current Pi-hole v6.** Pi-hole v6 no longer reads `/etc/dnsmasq.d/` by default. Added `FTLCONF_misc_etc_dnsmasq_d: "true"` and `FTLCONF_dns_listeningMode: "ALL"` so the shown Portainer stack matches the later custom `dnsmasq` steps.

3. **The command snippets used the wrong reload behavior for custom `dnsmasq` files.** Current Pi-hole reload commands do not re-read arbitrary `dnsmasq` config files. Replaced `pihole restartdns` with a container restart so the custom files are actually applied.

4. **The post implied local DNS alone removes service port numbers.** DNS only maps names to IP addresses; it does not replace per-service ports. Updated the introduction, examples, and summary to clarify that a reverse proxy is what lets you drop port numbers.

5. **The Pi-hole shell example assumed `bash`.** Changed `docker exec -it pihole bash` to `docker exec -it pihole sh` for better portability across container images.

## Review Notes
- The examples use `.home.lab`, which works for a private DNS setup, but RFC 8375 reserves `home.arpa` as the special-use suffix for residential home networks. This was left unchanged because the article's examples are still technically functional.
- The AdGuard Home mapping `8888:80` is valid if the setup wizard keeps the default internal web UI port of `80`. If readers change the internal web UI port during setup, the published host port mapping would need to change as well.
- Both stack examples use `:latest` tags. This is valid, but the exact behavior can change over time as upstream images are updated.
