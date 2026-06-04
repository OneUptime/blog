# Validation Summary: How to Use Cilium Hubble UI to Visualize Real-Time Network Traffic Between K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble UI
- Hubble CLI
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- Prometheus and PromQL
- Grafana
- Istio service mesh traffic examples

## Sources Consulted
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Service Map & Hubble UI - https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium command reference: `cilium hubble ui` - https://docs.cilium.io/en/latest/cmdref/cilium_hubble_ui/
- Cilium documentation: Monitoring & Metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Layer 7 Protocol Visibility - https://docs.cilium.io/en/stable/observability/visibility/
- Hubble CLI `hubble observe --help` from the current official Hubble release.
- Cilium Helm chart 1.19.4 rendered templates for `hubble-metrics` Service and Hubble ServiceMonitor.

## Issues Found
- The Helm install used Cilium `1.14.5`, which is outdated for a 2026 tutorial. Updated it to the current stable documentation version, `1.19.4`.
- The Helm install enabled Hubble Relay and UI but did not explicitly enable Hubble for metrics. Added `--set hubble.enabled=true`, matching the metrics documentation.
- The metrics list used deprecated `http` metrics. Replaced it with `httpV2`, which the Cilium metrics documentation recommends for current installs.
- The Hubble CLI installation used the old `master` branch URL and only handled `amd64`. Updated it to the official `main/stable.txt` URL and added `arm64` detection from the Cilium docs.
- Several examples used `--http-status 500-599`, but Hubble CLI expects an HTTP status prefix such as `5+`, not a numeric range. Updated those examples to `--http-status 5+`.
- The slow-request example grepped for `latency=...`, which is not the standard compact Hubble output. Changed it to match millisecond durations shown in HTTP response flows.
- The "Top talkers by bytes" PromQL query used `hubble_flows_processed_total`, which counts flows and does not include source, destination, or byte labels by default. Replaced it with a flow-rate-by-verdict query that matches the documented labels.
- The dropped-packets PromQL query grouped by `drop_reason`, but Hubble's documented drop metric label is `reason`. Updated the query accordingly.
- The NetworkPolicyDenials alert used a non-existent `drop_reason` label and a human-readable value. Changed it to the documented `reason` label with `POLICY_DENIED`.
- Istio sidecar examples used `--from-label istio-proxy`, which is not a valid label selector form for Hubble. Replaced those examples with `security.istio.io/tlsMode=istio` label filters.
- Added the Helm-native `hubble.metrics.serviceMonitor.enabled=true` path before the manual ServiceMonitor example, matching official Cilium documentation.
- Replaced brittle Hubble compact-output greps with JSON output and `jq` for drop reason and destination-pod summaries.

## Review Notes
HTTP flow visibility and HTTP metrics require Cilium Layer 7 protocol visibility for the relevant traffic. The post already focuses on Hubble usage, but future improvements could add a short prerequisite note about enabling L7 visibility for HTTP-specific examples.
