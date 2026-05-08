# Validation Summary: Troubleshooting IP Availability Publication in Cilium IPAM

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium IPAM
- CiliumNode custom resources
- Kubernetes
- kubectl
- jq

## Sources Consulted
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd/
- Cilium CRD-backed IPAM concepts: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium multi-pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/multi-pool/
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium command reference for default Cilium pod selectors: https://docs.cilium.io/en/latest/cmdref/cilium_features_status.html
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post implied that `spec.ipam.pool` and `status.ipam.used` checks apply broadly to all Cilium IPAM modes. Added a scope note clarifying that these checks apply to CiliumNode-backed pool publication modes, while cluster-pool and multi-pool IPAM expose different CiliumNode fields.
- The operator log command used the stale selector `name=cilium-operator`. Updated it to `io.cilium/app=operator`, which matches current Cilium CLI defaults for operator pod selection.
- The stale-data comparison compared available IP count with all pods scheduled on a node, which mixes different quantities and includes pods that may not consume Cilium-managed pod IPs. Updated it to compare `status.ipam.used` count with running, non-host-network pods that have pod IPs.
- The verification command used `cilium status | grep IPAM`, but IPAM allocation details are shown by the node daemon debug CLI. Replaced it with `kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep IPAM`.

## Review Notes
The remaining pool-size calculation is correct for CRD-backed and ENI-style pool publication, but it is intentionally not a generic capacity formula for every Cilium IPAM mode. The post now calls out that scope explicitly.
