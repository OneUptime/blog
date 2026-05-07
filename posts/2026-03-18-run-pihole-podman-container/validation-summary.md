# Validation Summary: How to Run Pi-hole in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Pi-hole Docker container
- DNS and DNSSEC
- dnsmasq configuration
- Pi-hole CLI and API
- SQLite-backed Pi-hole gravity database

## Sources Consulted
- Pi-hole Docker configuration documentation: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5 to v6 upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole command documentation: https://docs.pi-hole.net/main/pihole-command/
- Pi-hole API documentation: https://docs.pi-hole.net/api/
- Pi-hole API OpenAPI specs: https://github.com/pi-hole/FTL/tree/master/src/api/docs/content/specs
- Pi-hole domain database documentation: https://docs.pi-hole.net/database/domain-database/
- Pi-hole Docker image README: https://github.com/pi-hole/docker-pi-hole
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The container examples used deprecated Pi-hole v5 environment variables (`WEBPASSWORD`, `PIHOLE_DNS_`, `DNSSEC`, and `REV_SERVER*`). Replaced them with current Pi-hole v6 `FTLCONF_*` variables.
- The examples omitted `FTLCONF_dns_listeningMode=ALL`, which Pi-hole recommends for bridge-style container networking so DNS is reachable through published ports.
- The custom DNS example reused the same named volumes as the basic container. Changed it to separate volumes to avoid sharing Pi-hole databases between two running containers.
- The examples used private SELinux relabeling (`:Z`) on volumes that may be shared across examples. Changed these to shared relabeling (`:z`) per Podman volume labeling behavior.
- The post used removed or obsolete Pi-hole commands such as `pihole -w`, `pihole -b`, `pihole --wild-block`, `pihole restartdns`, and chronometer output via `pihole -c -e`. Replaced them with current `pihole allow`, `pihole deny`, `pihole --wild`, `pihole reloaddns`, and `pihole api` commands.
- The monitoring examples used the removed legacy `/admin/api.php` API. Replaced these with current Pi-hole v6 API usage through `pihole api`.
- The query log example described `pihole -t 20` as showing the last 20 entries, but the current `tail` argument is a filter. Replaced it with `pihole api 'queries?length=20'`.
- Pi-hole v6 does not read `/etc/dnsmasq.d/` by default. Added the required `misc.etc_dnsmasq_d` configuration step and changed the reload step to restart the container so FTL re-reads dnsmasq configuration files.

## Review Notes
The guide is technically relevant and salvageable. Rootless Podman users may still need host-level configuration to bind low-numbered port 53, which the post already notes in the summary.
