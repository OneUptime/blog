# Validation Summary: How to Prevent Install Kubernetes v3 with EndpointSlice feature enabled

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes EndpointSlice
- Cilium
- Cilium CLI and cilium-dbg
- Helm
- Prometheus and PrometheusRule
- eBPF networking

## Sources Consulted
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium limiting identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The title and description referred to "Kubernetes v3", which is not a Kubernetes version line relevant to EndpointSlice. Updated them to refer to preventing issues with Kubernetes EndpointSlice enabled.
- The Cilium Helm values used `labels.exclude`, which is not the supported current shape. Replaced it with the documented `labels` string value using an exclusion pattern, `labels: "!job-name"`.
- The baseline metrics command used stale metric-name patterns such as `endpoint_count`, `identity_count`, and `policy_regeneration`. Updated the command to use `cilium-dbg metrics list` and current endpoint/identity/regeneration patterns.
- The Prometheus alert used `cilium_identity_count`, which is not the current Cilium metric name. Updated it to `sum(cilium_identity) > 5000`.
- Several node-local Cilium diagnostics were written as Kubernetes-facing `cilium` CLI commands even though they are `cilium-dbg` or `cilium-health` commands. Updated the affected examples to run through `kubectl exec -n kube-system ds/cilium -- ...`.
- The operator pod selector used `name=cilium-operator`; current Cilium defaults and sysdump command reference use `io.cilium/app=operator`. Updated the selector.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not present in the current command reference. Replaced it with `cilium-dbg bpf nodeid list` for node datapath entries.

## Review Notes
The post is technically valid after correction, but it remains a broad operational guide rather than a focused EndpointSlice-specific tutorial. The Cilium identity label exclusion example is intentionally conservative because Cilium already excludes common rollout labels such as `pod-template-hash` and `controller-revision-hash` by default.
