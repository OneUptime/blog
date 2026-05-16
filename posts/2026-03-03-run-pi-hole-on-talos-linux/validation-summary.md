# Validation Summary: How to Run Pi-hole on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Pi-hole (Docker image `pihole/pihole:latest`, which is currently v6)
- Kubernetes (Deployment, Service, PVC, Secret, ConfigMap)
- MetalLB (LoadBalancer with shared IP for TCP+UDP DNS)
- dnsmasq / pihole-FTL (DNS resolver)
- `ekofr/pihole-exporter` for Prometheus metrics

## Sources Consulted
- Pi-hole Docker repository: https://github.com/pi-hole/docker-pi-hole
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5→v6 upgrade guide: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Pi-hole `pihole` CLI source (master): https://raw.githubusercontent.com/pi-hole/pi-hole/master/pihole
- Pi-hole command reference: https://docs.pi-hole.net/main/pihole-command/
- MetalLB releases: https://github.com/metallb/metallb/releases
- eko/pihole-exporter README: https://github.com/eko/pihole-exporter

## Issues Found

1. **Outdated environment variables in the Pi-hole Deployment (critical)** — The manifest used the legacy v5 environment variables `WEBPASSWORD`, `PIHOLE_DNS_`, `DNSSEC`, and `DNSMASQ_LISTENING`. Per Pi-hole's official v5→v6 Docker upgrade guide, "nearly all environment variables from previous versions have been removed" in v6, and because the manifest pulls `pihole/pihole:latest` (v6 since February 2025), these legacy variables no longer take effect. Replaced with the v6 `FTLCONF_*` equivalents:
   - `WEBPASSWORD` → `FTLCONF_webserver_api_password`
   - `PIHOLE_DNS_` → `FTLCONF_dns_upstreams`
   - `DNSSEC` → `FTLCONF_dns_dnssec`
   - `DNSMASQ_LISTENING` → `FTLCONF_dns_listeningMode`

2. **Non-existent CLI subcommand `pihole -a adlist add` (incorrect)** — The post showed a `kubectl exec ... pihole -a adlist add URL` snippet for adding blocklists from the CLI. The `pihole` script (verified against the upstream source) has no `adlist` subcommand and the `-a` flag is only used in the `debug` context. Adlists in v6 are managed via the admin web UI or the REST API. Removed the invalid command and kept the `pihole -g` gravity-refresh step (which is still valid as an alias for `updateGravity`).

3. **Renamed CLI command `pihole restartdns` (incorrect)** — In v6 the subcommand for flushing the cache and reloading DNS is `pihole reloaddns` (with `pihole reloadlists` available for a reload without a cache flush). `restartdns` is no longer a recognized subcommand. Updated the example accordingly.

## Review Notes

- The Pi-hole Docker image tag `pihole/pihole:latest` is convenient but risky: every `kubectl rollout restart` can pull a new major version and pick up breaking changes (as happened with the v5→v6 transition). For a long-lived deployment, pinning to a specific tag (e.g. `pihole/pihole:2025.07.0`) is safer, but that is a style/operations preference rather than a technical error.
- The `pihole-dnsmasq` PVC mounted at `/etc/dnsmasq.d` is no longer read by Pi-hole v6 by default — v6 ignores `/etc/dnsmasq.d/` unless `FTLCONF_misc_etc_dnsmasq_d: 'true'` is also set. The mount is harmless (it just provides persistent storage that the container does not consume), so it was left in place, but a future revision could either remove it or add the opt-in flag.
- The `/etc/pihole/custom.list` file is retained in v6 for backwards compatibility and is still loaded by pihole-FTL, so the custom-DNS-records snippet remains functional. The web UI's "Local DNS records" page (or the REST API) is the more idiomatic v6 approach.
- `ekofr/pihole-exporter` was originally written against the v5 API. The maintainer has been working on v6 support but readers running v6 may need a recent build, a fork, or to generate an "application password" in the v6 admin UI. The Deployment as written is structurally correct; its runtime compatibility depends on the exporter version pulled at deploy time.
- MetalLB v0.13.12 is older (v0.15.x is the current stable line) but the pinned manifest URL still resolves and the `IPAddressPool` / `L2Advertisement` CRDs used here have been stable since v0.13, so the snippet works as written.
- The "blocked domain returns 0.0.0.0" claim matches Pi-hole's default `IP` reply mode (`FTLCONF_dns_blocking_mode: NULL`), which returns `0.0.0.0` for A and `::` for AAAA.
