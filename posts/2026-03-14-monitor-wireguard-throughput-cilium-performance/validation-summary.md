# Validation Summary: Monitoring WireGuard Throughput in Cilium Performance

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Prometheus
- Grafana
- Prometheus Operator alerting rules
- Node exporter / Linux network interface counters

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium command reference for `cilium encryption status`: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The post claimed Cilium automatically exports `cilium_wireguard_peers`. This metric is not present in the current Cilium metrics reference. Replaced it with the documented `cilium_feature_adv_connect_and_lb_transparent_encryption{mode="wireguard"}` feature metric and kept peer inspection in the CLI verification path.
- The `kubectl exec` metrics command used `cilium metrics list` inside the Cilium pod. Current Cilium agent command documentation uses `cilium-dbg metrics list`, so the command was corrected.
- The example listed `cilium_drop_count_total{reason="Encryption"}` as a key metric. The Cilium metrics reference documents `drop_count_total` with `reason` and `direction` labels but does not document an `Encryption` reason value. The example was changed to reference the generic drop counter and its documented labels.
- The DaemonSet wrote Prometheus text metrics to `/tmp/metrics` but never served an HTTP endpoint on port 9101. The container command now runs the collection loop in the background and serves `/tmp` with BusyBox `httpd`.
- The DaemonSet here-doc used an indented delimiter, which would not terminate correctly in `/bin/sh`. The delimiter and Prometheus metric lines were aligned so the generated shell script is valid.
- The alert and Grafana panel used the undocumented `cilium_wireguard_peers` metric. They were changed to monitor the documented WireGuard transparent encryption feature metric.
- The verification command used `cilium encrypt status`, which is not the current Cilium CLI command. It was changed to `cilium encryption status --per-node-details`.
- The Prometheus API `curl` example placed the query directly in the URL. It was changed to use `--data-urlencode`, matching Prometheus API guidance and avoiding shell/URL encoding problems.

## Review Notes
Node exporter can already expose network interface byte counters such as `node_network_transmit_bytes_total` for interfaces it collects, so a custom DaemonSet may be unnecessary in environments where node exporter includes `cilium_wg0`. The post keeps the custom exporter because it is central to the example, but production setups should avoid duplicate collection when node exporter already provides the same interface statistics.
