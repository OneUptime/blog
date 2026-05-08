# Validation Summary: How to Prevent Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator PrometheusRule
- eBPF maps
- iperf3

## Sources Consulted
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Helm chart values for v1.19.3: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium `cilium-dbg config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get.html
- Cilium Kubernetes configuration reference for monitor aggregation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Hubble internals for ring buffer sizing: https://docs.cilium.io/en/stable/internals/hubble/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus template reference: https://prometheus.io/docs/prometheus/3.3/configuration/template_reference/

## Issues Found
- The baseline and verification commands used `cilium status` and `cilium config` inside the Cilium agent pod. Current Cilium documentation exposes the in-pod troubleshooting CLI as `cilium-dbg`, so these were changed to `cilium-dbg status --verbose` and `cilium-dbg config`.
- The alert used the older/non-current `cilium_endpoint_count` metric. Current Cilium metrics document `endpoint`, exported with the `cilium_` namespace as `cilium_endpoint`, so the expression was updated.
- The drop alert used `cilium_drop_count_total`, while the post enables Hubble drop metrics. Current Hubble metrics are exported under the `hubble_` namespace and document `drop_total`, so the expression was changed to `hubble_drop_total`.
- The endpoint regeneration alert omitted the `_seconds` suffix from the documented Cilium metric `endpoint_regeneration_time_stats_seconds`. The PromQL expression was updated to use `cilium_endpoint_regeneration_time_stats_seconds_sum` and `_count`.
- The Helm values showed `monitorAggregation` and `monitorAggregationInterval` as top-level keys. Current Cilium Helm values place these under `bpf` as `bpf.monitorAggregation` and `bpf.monitorInterval`, so the YAML was corrected.
- The Hubble event buffer capacity was set to `8192`. Hubble's user-visible ring buffer capacity must be one less than a power of two, so it was changed to `8191`.

## Review Notes
- I could not run local `helm` or `kubectl` validation because those binaries are not installed in this environment. YAML syntax was reviewed manually against the official documentation.
