# Validation Summary: Validating Node Termination Handling in Cilium IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- CiliumNode and CiliumEndpoint custom resources
- kubectl
- jq

## Sources Consulted
- Cilium documentation: CRD-Backed by Cilium Cluster-Pool IPAM, https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium documentation: Cluster Scope IPAM, https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium documentation: Cilium Operator, https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium documentation: Endpoint CRD, https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Kubernetes documentation: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl drain, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: kubectl cordon, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes documentation: Safely Drain a Node, https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/

## Issues Found
- The post described the jq CIDR check as detecting CIDR overlaps, but the command only detects duplicate CIDR strings. I changed the wording to "duplicate CIDR allocations" and adjusted the introductory validation list accordingly.
- The termination test described cordon and drain as simulating node termination. Kubernetes documents drain as preparation for maintenance or shutdown, not node deletion by itself. I clarified that the node should be deleted or the backing instance terminated in a disposable test cluster to validate CiliumNode cleanup.
- The post used `kubectl get ciliumendpoints --field-selector spec.nodeName=<test-node>`, but Kubernetes field selectors are resource-specific and CiliumEndpoint documentation does not define `spec.nodeName` as a selectable field. I changed the check to use Pods, where `spec.nodeName` is a documented supported field selector.
- The troubleshooting guidance advised directly patching finalizers. I changed it to investigate the managing controller first and remove finalizers manually only as a last resort.

## Review Notes
The post focuses on Cilium cluster-pool IPAM semantics. The `spec.ipam.podCIDRs` field is documented for cluster-pool IPAM, while other Cilium IPAM modes may use different fields or cloud-provider-specific allocation behavior.
