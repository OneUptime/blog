# Validation Summary: How to Monitor Docker Container IPv6 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker CLI
- Docker Engine API
- Docker Compose
- IPv6
- tcpdump
- `ss` / Linux socket inspection
- Prometheus
- cAdvisor

## Sources Consulted
- Docker bridge network driver docs: https://docs.docker.com/network/drivers/bridge/
- Docker IPv6 networking docs: https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose network reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference (`ports` syntax): https://docs.docker.com/reference/compose-file/services/
- Docker `stats` CLI reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Engine API v1.51 reference (`GET /containers/{id}/stats`): https://docs.docker.com/reference/api/engine/version/v1.51/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- cAdvisor README: https://github.com/google/cadvisor
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor Prometheus metric definitions: https://github.com/google/cadvisor/blob/master/metrics/prometheus.go
- Local `ss --help` output from iproute2
- Local `tcpdump --help` output
- Local `timeout --help` output

## Issues Found
- The bridge-discovery example used `docker network inspect ... --format "{{.Options}}" | grep ...`, which does not reliably return the default Linux bridge interface name. I changed it to check `com.docker.network.bridge.name` when set and otherwise derive the typical `br-<network-id-prefix>` name from the network ID.
- The packet-capture example used `kill %1`, which depends on shell job control and is unreliable in scripted usage. I replaced it with `timeout -s INT 30 tcpdump ...` to make the 30-second capture example work predictably on Linux and stop `tcpdump` cleanly.
- The description referenced `netstat`, but the post actually uses `ss`. I corrected the description to match the commands shown.
- The `/proc/net/tcp6` example was labeled as if it showed readable IPv6 TCP connections, but it only emitted raw kernel-table fields. I changed the example to use `ss -t6 -n` as the readable command and kept `/proc/net/tcp6` as a raw fallback.
- The connection-count examples used `grep ESTAB`; this works, but `ss` supports state filtering directly. I changed the commands to `ss -Htan6 state established | wc -l` for cleaner, documented filtering.
- The cAdvisor image reference used `gcr.io/cadvisor/cadvisor:latest`, which is outdated for current releases. I updated it to the current registry and a pinned release tag: `ghcr.io/google/cadvisor:v0.56.2`.
- The Prometheus section implied the byte counters were IPv6-specific. Docker stats and cAdvisor byte counters are aggregate per-interface totals, while cAdvisor's IPv6-specific metric is `container_network_tcp6_usage_total`. I corrected the wording and updated the example queries accordingly.

## Review Notes
- Docker's IPv6 documentation states IPv6 support applies to Docker daemons on Linux hosts. Readers using Docker Desktop or non-Linux hosts may see different networking behavior.
- The `br-<network-id-prefix>` bridge name is the typical Linux implementation for user-defined bridge networks, but Docker's bridge docs treat underlying network-device details as implementation details. The post now states this more carefully.
- Docker was not installed in the local review environment, so Docker commands were validated against the current official CLI and API documentation rather than executed locally.
