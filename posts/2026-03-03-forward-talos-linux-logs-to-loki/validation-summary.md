# Validation Summary: How to Forward Talos Linux Logs to Loki

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine config `machine.logging`, `talosctl patch machineconfig`, `talosctl service`)
- Grafana Loki (Helm chart, LogQL, Loki ruler alert rules)
- Vector (socket source, `remap` VRL transform, `loki` sink, `throttle` and `filter` transforms)
- Promtail (mentioned only as not-recommended)
- Grafana (dashboards, panels)
- Kubernetes (ConfigMap, Deployment, Service manifests, Helm)

## Sources Consulted
- Talos Linux v1.10 machine config reference — https://www.talos.dev/v1.10/reference/configuration/v1alpha1/config/
- Sidero Labs / Talos logging guide — https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/logging-and-telemetry/logging
- Vector `socket` source docs — https://vector.dev/docs/reference/configuration/sources/socket/
- Vector `loki` sink docs — https://vector.dev/docs/reference/configuration/sinks/loki/ (and known endpoint footgun https://github.com/vectordotdev/vector/issues/8702)
- Vector `remap`/`throttle`/`filter` transform docs — https://vector.dev/docs/reference/configuration/transforms/
- Promtail `scrape_configs` syslog source (Loki repo) — https://github.com/grafana/loki/blob/main/clients/pkg/promtail/scrapeconfig/scrapeconfig.go
- Loki Helm chart move / Alloy migration notes — https://grafana.com/docs/loki/latest/setup/upgrade/upgrade-to-community/
- Grafana Alloy docs — https://grafana.com/docs/alloy/
- Loki `max_look_back_period` deprecation — https://github.com/grafana/loki/issues/4178
- talosctl CLI reference for `service` and `patch machineconfig`

## Issues Found
1. **Promtail "syslog" scrape source cannot ingest Talos `json_lines`.** The original "Using Promtail as an Alternative Bridge" section presented a Promtail config whose `syslog` scrape strictly expects RFC5424/RFC3164 syslog framing and would silently fail (or reject) raw newline-delimited JSON from Talos. Replaced the entire example with a short, accurate "A Note on Promtail" subsection explaining the incompatibility and pointing readers at Grafana Alloy (the maintained successor to Promtail).

2. **`talos-node` is not a field Talos emits.** Talos's `json_lines` output always includes `talos-service`, `talos-level`, `talos-time`, and `msg`, but does **not** include a `talos-node` field. The Vector `remap` transform that did `.node = del(.talos-node) ?? "unknown"` would always produce `"unknown"`. Removed that line and updated the `loki` sink to derive the `node` label from `{{ host }}`, which Vector's `socket` source automatically populates with the source IP. Also quoted `"talos-service"` and `"talos-level"` in the VRL paths because they contain hyphens.

3. **`chunk_store_config.max_look_back_period` is removed in current Loki.** This field was deprecated around Loki 2.3 and removed; using it now produces `field max_look_back_period not found` and prevents Loki from starting. Replaced with `limits_config.max_query_lookback: 720h` (the current equivalent) under the same `limits_config` block already present in the example.

4. **Best-practices and architecture bullets recommended Promtail.** Updated the architecture overview and Best Practices list to recommend Vector, Fluent Bit, or Grafana Alloy instead of Vector/Promtail, consistent with fix #1.

## Review Notes
- **`grafana/loki-stack` Helm chart is deprecated** but the chart is still installable and the example `helm install` commands still work today. Left them in place to avoid restructuring the Installing Loki section, but readers starting fresh in 2026 should consider the `loki` chart (now in `grafana-community/helm-charts`) plus Grafana Alloy as the long-term path.
- **`timberio/vector:latest-alpine`** image is still published but the canonical registry path is now `docker.io/timberio/vector` / `ghcr.io/vectordotdev/vector`. Tag works as written.
- **`endpoint: "http://loki.monitoring.svc:3100"`** in the Vector `loki` sink is correctly the base URL. Including `/loki/api/v1/push` here is a common mistake; the post avoids it.
- **`talosctl patch machineconfig` JSON-patch** to add `/machine/logging` will fail if the path already exists. For idempotency, `replace` (or a `strategic` merge patch) is safer in production scripts. Left as-is since it's labeled as an example script.
- **Vector socket TCP default framing** is `newline_delimited`, which matches Talos's TCP behavior (UDP is one message per packet); the example correctly does not need to set `framing.method`.
- **`talosctl service kubelet restart --nodes <ip>`** syntax is valid (`<service> <action>`).
- **Loki ruler alert rules**: syntactically valid Prometheus-style YAML; users will still need to wire the ruler component (mounting rules into the Loki ruler pod and configuring its storage) — out of scope for the post but worth flagging for readers.
