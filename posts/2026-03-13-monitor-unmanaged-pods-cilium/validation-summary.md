# Validation Summary: How to Monitor Unmanaged Pods in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI / eBPF-based networking)
- Cilium CLI (`cilium`)
- Cilium Endpoints (CEP)
- Kubernetes (`kubectl`)
- Hubble (mentioned in prerequisites)
- Prometheus / PrometheusRule (monitoring.coreos.com/v1)
- kube-state-metrics (`kube_pod_status_phase`)
- jq, comm (shell utilities)
- Multus (mentioned as secondary CNI scenario)

## Sources Consulted
- Cilium documentation — Endpoints and endpoint lifecycle: https://docs.cilium.io/en/stable/network/concepts/endpoint/
- Cilium CLI reference (`cilium endpoint list`, `cilium status`, `cilium connectivity test`): https://docs.cilium.io/en/stable/cmdref/
- Cilium metrics reference (`cilium_endpoint_state`, label `endpoint_state`): https://docs.cilium.io/en/stable/observability/metrics/
- kube-state-metrics documentation for `kube_pod_status_phase` (gauge with value 1 for current phase, 0 otherwise; series per pod-phase pair): https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator PrometheusRule CRD (`monitoring.coreos.com/v1`): https://prometheus-operator.dev/docs/api-reference/api/
- PromQL aggregation operators (`sum` vs `count` semantics): https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators

## Issues Found

1. **Incorrect PromQL aggregation in alerting rule (`count` vs `sum`).**
   - The original rule used `count(kube_pod_status_phase{phase="Running"})` and `count(cilium_endpoint_state{endpoint_state="ready"})`.
   - `kube_pod_status_phase` exposes one series per pod-phase combination with a value of 1 when the pod is in that phase and 0 otherwise. `count()` returns the number of matching series (≈ every pod), not the number of Running pods. The correct aggregation is `sum()`.
   - Similarly, `cilium_endpoint_state` is exposed per cilium-agent with the value being the count of endpoints in that state. `count()` returns the number of agents reporting the metric, not the total ready endpoints. The correct aggregation is `sum()`.
   - **Fix:** Replaced `count(...)` with `sum(...)` in both legs of the `CiliumUnmanagedPodsDetected` expression so the rule actually compares running pod count to ready endpoint count.

## Review Notes
- The `cilium endpoint list | wc -l` example will overcount by one (table header) and on multi-agent clusters this command must be exec'd inside a `cilium-agent` pod — Step 3 covers the per-node exec form. Not technically wrong, just worth noting for readers.
- `cilium status --output json | jq '.cilium.controllers[] ...'` works against the per-agent status output (reached via `kubectl exec ... -- cilium-dbg status -o json` on newer Cilium versions, or `cilium status -o json` inside the agent pod). The local-cluster Cilium CLI tool's `cilium status -o json` has a different schema. The blog's Step 4 wording could be tightened on this point but the query path itself is valid for the in-agent variant.
- The `CiliumUnmanagedPodsDetected` rule does not exclude pods using `hostNetwork: true`, which intentionally have no Cilium endpoint. In clusters with hostNetwork workloads (kube-proxy, ingress controllers, monitoring agents, etc.) the alert will fire continuously. Operators should filter with `kube_pod_status_phase{phase="Running", ...} unless on(pod, namespace) kube_pod_info{host_network="true"}` or similar — left as-is since the post frames this as a starting-point alert.
- Cilium 1.14+ exposes a more direct metric `cilium_unmanaged_pods` (when the operator is configured to report it). A future revision could prefer that signal over the pod-count vs endpoint-count subtraction.
- Hubble is listed as a prerequisite but is not actually used in any step — a minor inconsistency, not a technical error.
