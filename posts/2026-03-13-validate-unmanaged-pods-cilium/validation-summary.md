# Validation Summary: Validate Unmanaged Pods in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEndpoint CRDs
- Kubernetes hostNetwork pods
- Cilium Prometheus metrics

## Sources Consulted
- Cilium Troubleshooting: Ensure pod is managed by Cilium: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference index showing Cilium CLI and cilium-dbg commands: https://docs.cilium.io/en/latest/cmdref/
- Cilium node taints and unmanaged pods documentation: https://docs.cilium.io/en/stable/installation/taints/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Azure CNI chaining unmanaged pod restart guidance: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/

## Issues Found
- The post used `cilium endpoint list`, but the current Cilium client CLI does not expose that endpoint subcommand in the official command reference. Replaced those checks with `kubectl get ciliumendpoints --all-namespaces`, which Cilium documents as the Kubernetes-wide way to inspect managed endpoints, and retained `cilium status` only for the managed pod summary.
- The endpoint comparison used pod IPs and an incorrectly named `CALICO_POD` variable. Replaced it with a namespace/name comparison between running non-host-network pods and `CiliumEndpoint` objects, excluding Cilium health endpoints because Cilium documents those as non-pod endpoints.
- The host-network pod check used `kubectl get pods -o wide | grep "true"`, but the default wide output does not include `spec.hostNetwork`. Removed that command and kept the JSONPath query against `spec.hostNetwork`.
- The best-practices section referenced a `--ensure-no-host-ns-pods` flag that is not present in the official Cilium documentation. Replaced it with Cilium's documented `node.cilium.io/agent-not-ready` taint guidance for preventing pods from starting before Cilium is ready.
- The metrics recommendation was vague. Updated it to reference documented endpoint and unmanaged pod metrics.

## Review Notes
The post is technically relevant and useful after correction. Future improvements could mention Cilium's official `k8s-unmanaged.sh` helper script directly, but the corrected CRD-based comparison is valid and keeps the post's original flow.
