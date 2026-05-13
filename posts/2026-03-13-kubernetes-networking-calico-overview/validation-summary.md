# Validation Summary: How to Understand Kubernetes Networking for Calico Users

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes networking model
- Container Network Interface (CNI)
- Calico Open Source
- Calico IPAM and IPPool resources
- IP-in-IP, VXLAN, and BGP routing
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- kube-proxy and Calico eBPF dataplane

## Sources Consulted
- Kubernetes Services, Load Balancing, and Networking documentation: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes Cluster Networking documentation: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- CNI Specification: https://www.cni.dev/docs/spec/
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico networking options documentation: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico CNI plugin configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico workload endpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
- The introduction said every node can reach every pod IP. Kubernetes documents the requirement more specifically as agents on a node being able to communicate with all pods on that node, so the wording was corrected.
- The pod-to-pod mechanism table and conclusion mentioned BGP and VXLAN but omitted IP-in-IP. Calico supports IP-in-IP and VXLAN overlays, so IP-in-IP was added.
- The CNI flow said the Calico CNI plugin notifies Felix directly. Calico CNI manages workload endpoint lifecycle, and Felix watches programmed state and datastore resources, so the diagram was corrected to avoid implying a direct notification path.
- The IPAM description said Calico selects an IP from the configured IPPool. Calico IPAM assigns from available IP pools by default, so the wording was adjusted.
- The post referenced `CalicNetworkPolicy`, which is not a valid Calico resource name. It was corrected to Calico `NetworkPolicy`, alongside `GlobalNetworkPolicy`.
- The IPPool sizing best practice referred to maximum pod count per node. Since an IPPool CIDR is cluster-wide address space, this was corrected to maximum expected cluster-wide pod count.

## Review Notes
The examples use current Calico Open Source API fields for `IPPool`, including `cidr`, `ipipMode`, and `natOutgoing`. The `calicoctl ipam show` command is current. Future revisions could mention `vxlanMode` in the IPPool example if the surrounding text emphasizes VXLAN, but the existing IP-in-IP example is valid.
