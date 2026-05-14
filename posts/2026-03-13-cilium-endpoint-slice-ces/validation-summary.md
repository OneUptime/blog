# Validation Summary: Cilium EndpointSlice (CES): Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEndpoint and CiliumEndpointSlice CRDs
- Helm
- kubectl
- Prometheus and PromQL

## Sources Consulted
- Cilium CiliumEndpointSlice documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpointslice/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium operator command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium cilium-dbg endpoint command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium v2alpha1 Go API reference for CiliumEndpointSlice/CoreCiliumEndpoint: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/k8s/apis/cilium.io/v2alpha1
- kube-state-metrics CustomResourceStateMetrics label reference: https://pkg.go.dev/k8s.io/kube-state-metrics/v2/pkg/customresourcestate

## Issues Found
- The description and introduction incorrectly framed CES as service discovery/load-balancing support and as complementary to Kubernetes EndpointSlice. Updated the text to clarify that CiliumEndpointSlice is distinct from Kubernetes EndpointSlice and is used for Cilium endpoint propagation, routing, and policy decisions.
- The Helm value `enableCiliumEndpointSlice=true` was not the documented current chart value. Replaced it with `ciliumEndpointSlice.enabled=true`.
- The batch-size example changed `operator.endpointGCInterval`, which controls endpoint garbage collection rather than CES batch size. Replaced it with the documented operator flag `--ces-max-ciliumendpoints-per-ces` via `operator.extraArgs`.
- The example CES manifest used a namespaced `spec.endpoints` shape. CiliumEndpointSlice is cluster-scoped and stores `endpoints` at the top level, so the YAML was corrected.
- Several troubleshooting commands used `cilium` inside the agent pod. Current Cilium documentation uses `cilium-dbg` for local agent inspection, so those commands were corrected.
- The post suggested `cilium endpoint regenerate`, which is not a documented current `cilium-dbg endpoint` command. Replaced it with documented endpoint inspection and status-log commands.
- The validation `jq` expression counted `.items[].spec.endpoints`, which does not match the CES API shape. Updated it to `.items[].endpoints`.
- The monitoring section included non-documented or incorrect metric names such as `cilium_endpoint_count` and synthetic CES count metrics. Updated the examples to use documented Cilium metric names and kube-state-metrics custom resource labels.

## Review Notes
CES remains documented as a beta feature in current Cilium documentation. The kube-state-metrics `kube_customresource_info` query assumes CustomResourceStateMetrics are configured for `CiliumEndpointSlice`; without that configuration, that PromQL query will not return CES objects.
