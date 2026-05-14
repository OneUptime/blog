# Validation Summary: Cilium Endpoint Health

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium endpoint lifecycle
- Cilium CLI and cilium-dbg
- Prometheus metrics and PrometheusRule alerts
- eBPF datapath regeneration

## Sources Consulted
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg endpoint log command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_log.html
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium v1.19.3 metrics source for endpoint metric labels and histogram names: https://github.com/cilium/cilium/blob/v1.19.3/pkg/metrics/metrics.go
- Cilium config set command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_set.html

## Issues Found
- The post used `cilium endpoint list/get/log` for endpoint inspection. Current Cilium documentation exposes these commands through the in-agent `cilium-dbg` CLI, so the examples now execute `cilium-dbg` inside a Cilium agent pod.
- The endpoint state table included `not-ready` and omitted documented states such as `restoring`, `waiting-to-regenerate`, `disconnected`, and `invalid`. Updated the state reference and lifecycle diagram to match Cilium's documented endpoint states.
- The state-counting command parsed a human-readable table column with `awk`, which is brittle and pointed at the wrong command. Replaced it with `cilium-dbg endpoint list -o json` and `jq`.
- The regeneration inspection example attempted to read regeneration time from `.status["external-identifiers"]`, which is not endpoint regeneration duration. Replaced it with a detailed endpoint status query and metric scraping for regeneration timing.
- The post recommended `cilium endpoint regenerate`, which is not present in the current documented `cilium-dbg endpoint` command set. Reworked the step to inspect failed regeneration, enable debug logging, check logs, and restart the affected workload after correcting the underlying issue.
- The Prometheus endpoint-state alert used the label `state`; Cilium's current metric source emits the label as `endpoint_state`. Updated the alert expression.
- The slow-regeneration alert used `cilium_endpoint_regeneration_time_seconds_bucket`; the current histogram is `cilium_endpoint_regeneration_time_stats_seconds_bucket`. Updated the metric name.

## Review Notes
The guide is technically relevant and salvageable. It does not pin a Cilium version, so the fixes target current stable Cilium documentation and v1.19.3 source behavior as of 2026-05-14. Future improvements could include separate examples for the Kubernetes `CiliumEndpoint` CRD (`kubectl get cep`) versus local per-agent `cilium-dbg` inspection.
