# Validation Summary: Monitoring CiliumCIDRGroup Resources in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- CiliumCIDRGroup
- CiliumNetworkPolicy
- Hubble
- Prometheus
- Grafana
- Helm
- kubectl
- jq
- Prometheus Operator

## Sources Consulted
- Cilium CiliumCIDRGroup documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumcidrgroup/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.19.3 CiliumCIDRGroup CRD: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumcidrgroups.yaml
- Cilium v1.19.3 Hubble drop metrics source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/hubble/metrics/drop/handler.go
- Cilium v1.19.3 Hubble flow metrics source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/hubble/metrics/flow/handler.go
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The CiliumCIDRGroup manifest used `apiVersion: cilium.io/v2alpha1`. Current Cilium CRDs serve `cilium.io/v2` as the storage API and mark `v2alpha1` deprecated, so the example was updated to `apiVersion: cilium.io/v2`.
- The prerequisite and troubleshooting text said Cilium v1.14+ was sufficient. Because the post now uses the non-deprecated `cilium.io/v2` CiliumCIDRGroup API, this was updated to Cilium v1.18+.
- The shell script piped `kubectl` JSONPath output for `.spec.externalCIDRs` to `jq length`. kubectl JSONPath array output is not guaranteed to be valid JSON, so this was changed to fetch the object as JSON and count `.spec.externalCIDRs` with jq.
- The Helm values placed `serviceMonitor.enabled` under `prometheus`, which enables the Cilium agent ServiceMonitor path rather than Hubble metrics scraping. This was corrected to `hubble.metrics.serviceMonitor.enabled: true`, and `operator.prometheus.enabled: true` was included for operator metrics.
- The PromQL examples used `reason="POLICY_DENIED"`. Hubble's drop metric labels use the human-readable drop reason string from `GetDropReasonDesc()`, so the filter was corrected to `reason="Policy denied"`.

## Review Notes
- Cilium's current CiliumCIDRGroup documentation page still shows a `v2alpha1` example, but the generated Cilium v1.19.3 CRD marks `v2alpha1` deprecated and uses `v2` as storage. The post was corrected to the non-deprecated API requested by the review criteria.
- Hubble metrics provide traffic-level visibility and do not directly validate whether external IP ranges are stale. The post's recommendation to add reconciliation for external ranges remains accurate.
