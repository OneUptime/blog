# Validation Summary: Why vCluster NetworkPolicy May Not Isolate Host Traffic

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- vCluster 0.36 with containerized control planes and Shared Nodes
- Kubernetes NetworkPolicy
- Kubernetes SIG Network Policy API ClusterNetworkPolicy
- Container Network Interface (CNI) and network-policy enforcement
- Kubernetes namespace synchronization
- Kubernetes Pod Security Admission
- Multus and secondary network interfaces

## Sources Consulted

- [vCluster 0.36: Sync NetworkPolicies to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/network-policies)
- [vCluster 0.36: Managed network policy configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/network-policy)
- [vCluster 0.36: Namespace synchronization limitations](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/namespaces#networkpolicy-syncing-is-disabled)
- [vCluster 0.36: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster 0.36: Shared-node admission policy examples](https://www.vcluster.com/docs/vcluster/security/shared-nodes-admission-examples)
- [vCluster 0.36: Architecture](https://www.vcluster.com/docs/vcluster/introduction/architecture/)
- [vCluster v0.36.1 tagged configuration defaults](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.yaml)
- [vCluster v0.36.1 generated NetworkPolicy template](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/networkpolicy.yaml)
- [vCluster v0.36.1 NetworkPolicy translator](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/networkpolicies/translate.go)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes API reference: NetworkPolicy v1](https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Network Plumbing Working Group: MultiNetworkPolicy](https://github.com/k8snetworkplumbingwg/multi-networkpolicy)
- [Kubernetes SIG Network Policy API reference](https://network-policy-api.sigs.k8s.io/reference/spec/)
- [Network Policy API v1alpha2 migration from AdminNetworkPolicy and BaselineAdminNetworkPolicy](https://network-policy-api.sigs.k8s.io/blog/2025/10/09/api-update-for-v1alpha2-clusternetworkpolicy-replaces-adminnetworkpolicy-and-baselineadminnetworkpolicy/)
- [Network Policy API installation and implementation requirements](https://network-policy-api.sigs.k8s.io/getting-started/)

## Issues Found

- The post did not state that vCluster 0.36 disables tenant NetworkPolicy synchronization when namespace synchronization is enabled. Added the documented incompatibility, clarified that mapped namespaces require platform-owned host policies, and limited the canary sync rollout step to deployments without namespace synchronization.
- The post used the superseded `AdminNetworkPolicy` and `BaselineAdminNetworkPolicy` names and linked to a nonexistent anchor on the Kubernetes NetworkPolicy page. Updated the guidance to the current `ClusterNetworkPolicy` API with `Admin` and `Baseline` tiers, made implementation support explicit, and replaced the link with the SIG Network Policy API reference.
- The traffic matrix and networking caveats omitted the standard NetworkPolicy exception for traffic between a Pod and its resident node. Added the exception, made the host-management test expectation conditional on a separate host control for resident-node paths, and identified Pod Security Admission as the control for rejecting `hostNetwork` Pods.
- The admission guidance referred only to "unrestricted" `ipBlock` peers, which was too ambiguous to define a safe boundary. Changed it to require an explicit allowlist for `ipBlock` peers.
- The statement that NetworkPolicy covers the primary Pod interface was too absolute because the standard API has no interface selector. Reworded it to require separate enforcement and testing for Multus and direct-underlay secondary interfaces.

## Review Notes

The configuration fields and defaults were verified across the released vCluster 0.36 line. The relevant v0.36.0 and v0.36.1 chart defaults and NetworkPolicy templates are unchanged. Both NetworkPolicy YAML examples passed client-side `kubectl` dry-run parsing, the vCluster settings rendered successfully with the v0.36.1 Helm chart, and all three `kubectl get` commands use valid current flags. `ClusterNetworkPolicy` is an optional alpha-stage CRD, so operators must install the API and use a compatible host network-policy implementation before relying on its `Admin` tier.
