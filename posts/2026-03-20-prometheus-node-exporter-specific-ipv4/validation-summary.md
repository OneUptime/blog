# Validation Summary: How to Configure Prometheus Node Exporter to Listen on a Specific IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus Node Exporter
- Prometheus configuration YAML
- systemd
- Linux networking
- UFW
- iptables
- curl

## Sources Consulted
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- systemd.special manual: https://www.freedesktop.org/software/systemd/man/249/systemd.special.html
- curl man page: https://curl.se/docs/manpage.html
- Official `node_exporter -h` output verified locally from the Prometheus Node Exporter `v1.7.0` and `v1.11.1` release tarballs

## Issues Found
- The introduction said Node Exporter defaults to `0.0.0.0:9100`. I corrected this to `:9100` on all network interfaces, which matches the official README and current `node_exporter -h` output.
- The install example pinned `NODEEXPORTER_VERSION` to `1.7.0`, which is outdated as of April 24, 2026. I updated it to the current stable release `1.11.1`.
- The systemd unit used `After=network.target`. I changed it to `Wants=network-online.target` and `After=network-online.target` because binding to a specific IP requires the address to be configured before startup.
- The UFW example did not specify TCP even though Node Exporter serves metrics over TCP. I made the UFW rules protocol-specific to match the iptables example and reduce accidental overexposure.
- The Prometheus scrape example did not include `10.0.0.5:9100`, but the verification section queried Prometheus for that exact instance. I updated the scrape target list so the verification example matches the configured host.
- The Prometheus API `curl` example placed a raw selector with `{}` directly in the URL. I changed it to `curl -G --data-urlencode` so the query is URL-encoded correctly and does not trigger curl URL globbing.

## Review Notes
- The `relabel_configs` block that copies `__address__` into `instance` is technically valid but redundant; Prometheus already uses `__address__` as the default `instance` label if it is not explicitly set.
- The install snippet remains architecture-specific because it downloads the `linux-amd64` build.
- `network-online.target` only helps at boot. If the bound IPv4 changes later, Node Exporter will still need a restart to rebind to the new address.
