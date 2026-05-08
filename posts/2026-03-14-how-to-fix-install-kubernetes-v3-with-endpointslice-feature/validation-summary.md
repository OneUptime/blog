# Validation Summary: How to Fix Install Kubernetes v3 with EndpointSlice feature enabled

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumEndpointSlice
- Kubernetes EndpointSlice
- Kubernetes CLI (`kubectl`)
- Cilium CLI and `cilium-dbg`
- Helm
- Prometheus Operator `PrometheusRule`

## Sources Consulted
- Cilium CiliumEndpointSlice documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpointslice/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes `kubectl logs` and rollout command references: https://kubernetes.io/docs/reference/kubectl/
- Helm `helm upgrade` documentation: https://helm.sh/docs/helm/helm_upgrade/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The title and description referred to "Kubernetes v3" and generic EndpointSlice enablement, which was technically misleading. Updated them to describe CiliumEndpointSlice, the actual Cilium feature being configured.
- The introduction implied Cilium's CiliumEndpointSlice feature was the same as Kubernetes EndpointSlice. Clarified that Kubernetes EndpointSlice and CiliumEndpointSlice are separate features with related scalability goals but different purposes.
- The Helm values did not enable CiliumEndpointSlice. Added `ciliumEndpointSlice.enabled: true`, which is the documented Helm value for CES.
- The identity label exclusion example used an invalid nested `labels.exclude` structure. Replaced it with the documented space-separated `labels` pattern string.
- The prerequisites omitted CiliumEndpointSlice compatibility requirements. Added the documented requirements that CiliumEndpoint CRDs be enabled and that Egress Gateway not be required.
- Several troubleshooting commands used `cilium endpoint`, `cilium policy`, `cilium bpf`, `cilium metrics`, and `cilium health`, which are not commands in the current standalone Cilium CLI. Replaced those examples with `cilium-dbg` or `cilium-health` executed inside the Cilium agent pod.
- The validation steps did not verify CiliumEndpointSlice CRD or object creation. Added `kubectl get crd ciliumendpointslices.cilium.io` and `kubectl get ciliumendpointslices --all-namespaces`.

## Review Notes
CiliumEndpointSlice is currently documented by Cilium as a beta feature. The article is technically valid after correction, but future reviews should re-check the CES stability status and compatibility notes against the Cilium version targeted by the post.
