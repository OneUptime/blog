# Validation Summary: How to Validate Argo CD show resources permanently out-of-sync

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Argo CD
- Kubernetes
- CiliumNetworkPolicy
- Helm
- Prometheus and Grafana
- eBPF

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium operator internals for CiliumIdentity and CiliumEndpoint behavior: https://docs.cilium.io/en/latest/internals/cilium_operator/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/

## Issues Found
- The prerequisite version claim used a broad Kubernetes v1.21+ and Cilium v1.14+ statement that is not accurate for all current Cilium releases. Changed it to require a Kubernetes version supported by the selected Cilium release.
- The post used `cilium endpoint list`, `cilium identity list`, `cilium metrics list`, `cilium bpf tunnel list`, and `cilium endpoint get` as if they were current top-level Cilium Kubernetes CLI commands. Current documentation places endpoint, metrics, and BPF inspection under `cilium-dbg`, typically run inside a Cilium agent pod. Updated those examples to use `kubectl ... exec ds/cilium -- cilium-dbg ...` or Kubernetes CRD inspection where appropriate.
- The post used `cilium health status`, but current documentation exposes this as `cilium-health status`. Updated the command to run `cilium-health status` from a Cilium agent pod.
- The Cilium operator selector used `name=cilium-operator`, while current Cilium tooling defaults to `io.cilium/app=operator`. Updated the selector.
- The troubleshooting section referenced a fixed `cilium-init` init container name and a fixed minimum kernel version. Reworded this to use the actual init container name from the deployed pod and the kernel requirements for the selected Cilium release.
- The policy troubleshooting examples referenced `cilium-dbg policy get`, which is documented but deprecated. Replaced those checks with Kubernetes policy resource inspection and endpoint inspection.
- Added validation commands for `CiliumEndpoint` and `CiliumIdentity` resources to better align the post with the Argo CD out-of-sync topic.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically valid for the documented `cilium.io/v2` API shape. The guide remains mostly a validation checklist rather than a full Argo CD remediation guide; a future improvement would be adding a dedicated Argo CD compare/resource-tracking configuration example for clusters where generated Cilium resources inherit Argo CD tracking metadata.
