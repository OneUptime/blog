# Validation Summary: How to Deploy Pi-hole via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Pi-hole
- Portainer
- Docker Compose
- Docker networking and port publishing
- `systemd-resolved`
- DNS monitoring

## Sources Consulted
- Pi-hole Docker documentation: https://docs.pi-hole.net/docker/
- Pi-hole Docker configuration reference: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker tips and tricks: https://docs.pi-hole.net/docker/tips-and-tricks/
- Pi-hole Docker v5 to v6 upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole API overview: https://docs.pi-hole.net/api/
- Pi-hole API authentication: https://docs.pi-hole.net/api/auth/
- Pi-hole API OpenAPI spec (`/api/stats/summary`, `/api`, `/auth`): https://ftl.pi-hole.net/master/docs/specs/main.yaml and https://ftl.pi-hole.net/master/docs/specs/stats.yaml
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker port publishing docs: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker Compose file reference on top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post used removed Pi-hole v5-era container environment variables: `WEBPASSWORD`, `PIHOLE_DNS_`, and `DNSMASQ_LISTENING`. I replaced them with the current Pi-hole v6 equivalents `FTLCONF_webserver_api_password`, `FTLCONF_dns_upstreams`, and `FTLCONF_dns_listeningMode` based on the official Pi-hole Docker docs and v5-to-v6 upgrade guide.
- The post mounted `/etc/dnsmasq.d` as if it were part of the default persistent setup. In Pi-hole v6 this directory is no longer read unless `FTLCONF_misc_etc_dnsmasq_d` is enabled, and the docs say it is not needed for most fresh deployments. I removed that volume from the example to keep the stack accurate for a fresh install.
- The Compose example configured the container DNS resolver with `127.0.0.1`. Pi-hole’s Docker configuration docs explicitly say it is not recommended to set the container DNS server to `localhost`/`127.0.0.1`, so I removed the `dns:` block.
- The comment suggesting host network mode as the better DNS option was misleading in this context because the example already uses published ports, and Pi-hole’s Docker docs describe host networking as an alternative rather than something to combine with `-p`/published ports. I removed the conflicting comment.
- The prerequisite said a static IP was needed for the Pi-hole container. With published ports, clients point at the Docker host IP, so the accurate requirement is a static IP or DHCP reservation for the Pi-hole host. I corrected that wording.
- The `systemd-resolved` instructions were incomplete. Pi-hole’s own Docker tips note that disabling the stub listener alone leaves `/etc/resolv.conf` pointing at the stub resolver, which can break host DNS resolution. I replaced the commands with the current documented approach that disables the stub listener, updates `/etc/resolv.conf`, and restarts `systemd-resolved`.
- The monitoring section used the legacy `admin/api.php` endpoint. Current Pi-hole versions expose the REST API at `/api`, with overview metrics available from `GET /api/stats/summary`, and authentication may be required on password-protected instances. I updated the monitoring guidance accordingly.
- The Compose snippet used the top-level `version: "3.8"` field. Current Docker Compose documentation marks this field as obsolete, so I removed it.

## Review Notes
- The post now aligns with current Pi-hole v6 Docker configuration and API behavior as of 2026-05-01.
- Monitoring the web UI at `/admin/` is the safest unauthenticated uptime check. API-based monitoring is still valid, but password-protected Pi-hole instances can return `401 Unauthorized` unless the monitor authenticates first.
- The StevenBlack and AdAway list URLs were reachable when checked on 2026-05-01.
