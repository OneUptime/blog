# Validation Summary: How to Deploy Pi-hole via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Pi-hole
- DNS
- DNSSEC
- Unbound

## Sources Consulted
- Pi-hole Docker configuration: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5 to v6 migration notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole command reference: https://docs.pi-hole.net/main/pihole-command/
- Pi-hole FTL configuration reference: https://docs.pi-hole.net/ftldns/configfile/
- Pi-hole Unbound guide: https://docs.pi-hole.net/guides/dns/unbound/
- Pi-hole web interface source (navigation and page labels): https://github.com/pi-hole/web
- Docker Compose version field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`network_mode`, `ports`, `volumes`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking reference: https://docs.docker.com/compose/how-tos/networking/
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- `mvance/unbound` image README: https://github.com/MatthewVance/unbound-docker/blob/master/README.md

## Issues Found
- The post used several Pi-hole Docker environment variables from the pre-v6 configuration model (`WEBPASSWORD`, `PIHOLE_DNS_`, `DNSSEC`, `REV_SERVER*`). I replaced them with the current `FTLCONF_...` equivalents documented by Pi-hole v6.
- The post claimed `network_mode: host` was required for DNS on port 53. That is incorrect. Docker bridge networking with published `53/tcp` and `53/udp` also works, so I corrected the note and added the recommended `FTLCONF_dns_listeningMode: 'ALL'` setting for bridge mode.
- The Compose snippets used the top-level `version` field, which Docker now marks as obsolete. I removed it from the examples.
- The first Compose snippet referenced named volumes without declaring them. I added the required top-level `volumes` section and removed the outdated `/etc/dnsmasq.d` persistence mount, which Pi-hole v6 does not use by default.
- The custom DNS CLI examples were outdated. `pihole -a --localrecord` and `pihole restartdns` are not current Pi-hole v6 commands. I replaced them with a supported `pihole-FTL --config dns.hosts ...` example and `pihole reloaddns`.
- The allowlist example used deprecated CLI syntax (`pihole -w`, `pihole -w -d`). I replaced it with the current `pihole allow` and `pihole allow remove` commands.
- The UI path for gravity updates was wrong. The current Pi-hole v6 web UI exposes this under `Tools > Update Gravity`, not `Gravity > Update Gravity`.
- One blocklist URL was dead (`nicehash/spam-blocklists` returned `404`), and the SomeoneWhoCares URL used a non-canonical hostname. I replaced them with currently reachable URLs.
- The Unbound section was technically incorrect as written. The referenced `mvance/unbound:latest` image does not provide local recursive resolution on `127.0.0.1:5335` by default; its default configuration forwards to Cloudflare over TLS. I rewrote the section so it accurately describes pointing Pi-hole at an already configured local Unbound instance on `127.0.0.1:5335`.
- The conclusion overstated the privacy outcome by claiming Unbound "eliminate[s] DNS-based tracking entirely." I corrected this to the narrower, accurate claim that it reduces dependence on commercial recursive resolvers and limits how much of your history any single upstream resolver can see.
- I also softened a few "every device" / "all devices" statements so they no longer overstate DNS-based filtering behavior for clients that may bypass router-advertised DNS.

## Review Notes
- The post is now technically sound for current Pi-hole v6 and modern Docker Compose usage.
- The examples still use `:latest` image tags. This is functional, but pinning explicit image tags would make the guide more reproducible.
- Pi-hole filtering remains DNS-based. Clients using hardcoded DNS, DNS-over-HTTPS, or DNS-over-TLS can bypass router-level DNS settings unless you enforce filtering at the network edge.
- The revised Unbound section is intentionally limited to the Pi-hole side of the configuration. A future improvement would be a separate, fully validated Dockerized Unbound example with a complete recursive `unbound.conf`.
