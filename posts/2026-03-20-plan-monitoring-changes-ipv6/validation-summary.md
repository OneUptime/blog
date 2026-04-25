# Validation Summary: How to Plan Monitoring Changes for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Prometheus
- PromQL
- Grafana
- Alertmanager
- Blackbox Exporter
- Kubernetes service discovery
- node_exporter
- curl

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Grafana configuration reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana HTTPS setup example showing `http_addr` / `http_port`: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-https/
- Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Local `curl --help all` output for `-G`, `--data-urlencode`, and `-g/--globoff`

## Issues Found
- The Kubernetes scrape example rewrote every pod IP as `[address]:8080`, which is only correct for IPv6 literals. I changed it to use separate relabel rules for IPv6 and IPv4 when rebuilding `__address__` from `__meta_kubernetes_pod_ip`.
- The Prometheus query `curl` example placed `up{ip_version='ipv6'}` directly in the URL. `curl` treats `{}` as URL-globbing syntax unless globbing is disabled, so I changed the example to use `-G --data-urlencode` instead.
- The `IPv6TrafficDrop` alert used `and` between two instant vectors with incompatible label sets, which does not reliably express "IPv6 traffic is zero while IPv4 traffic is still flowing" under PromQL's exact label matching rules. I changed the expression to compare aggregated IPv6 and IPv4 request rates.
- After fixing the `IPv6TrafficDrop` alert to aggregate traffic, the expression no longer preserved an `instance` label. I updated the alert annotation so it no longer referenced `{{ $labels.instance }}`.
- The Grafana panel snippet contained a `//` comment inside a `json` block, which made the example invalid JSON. I removed the comment line.
- The query labeled "Dual-stack service availability" only calculated IPv6 target availability. I renamed the label so it matches what the query actually returns.
- The checklist and conclusion overstated that binding to `[::]:port` universally provides dual-stack access, and the Grafana row used socket syntax that does not match Grafana's documented `http_addr` / `http_port` configuration model. I revised that guidance to describe enabling IPv6 listening explicitly where needed.
- The Blackbox Exporter scrape example omitted the standard relabel step that copies `__param_target` into `instance`. Without that step, multiple probe targets collapse onto the exporter's own address in the resulting label set. I added the missing relabel.

## Review Notes
- The post assumes metrics already carry an `ip_version` label. That is a valid approach, but the exact way that label gets attached depends on instrumentation, exporter behavior, or relabeling outside the examples shown here.
- The "Top IPv6 source IPs" query assumes a `client_ip` label exists on the metric. That is workload-specific and technically fine as an example, but it is not a universal Prometheus label.
- The Blackbox Exporter example uses `[::1]:9115`, which is correct for an exporter reachable on IPv6 loopback. Environments that expose the exporter on a different address will need to substitute the actual exporter listener.
- Local validation completed for the edited examples: fenced YAML and JSON blocks parsed successfully, and the bash snippet passed `bash -n`. PromQL examples were reviewed manually against Prometheus documentation.
