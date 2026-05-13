# Validation Summary: How to Diagnose External Connectivity Broken After Calico Upgrade

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- kubectl
- IPPool configuration
- GlobalNetworkPolicy
- iptables NAT / MASQUERADE

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction implied that Calico upgrades commonly change existing default IP-in-IP, NAT, or encapsulation behavior between versions. Calico documents these as IPPool and installation configuration fields, and its upgrade guide specifically warns users to preserve manual manifest changes. I changed the wording to say failures typically stem from configuration changes introduced during the upgrade, such as regenerated manifests or operator settings not preserving previous networking configuration.
- The root-cause list said "natOutgoing disabled or changed to different behavior in new version." The Calico IPPool documentation defines `natOutgoing` as a boolean setting that controls masquerading for traffic from Calico networked containers to destinations outside Calico IP pools. I changed this to "natOutgoing disabled or not preserved during the upgrade."
- The root-cause list said "Default GlobalNetworkPolicy changed between versions." Calico GlobalNetworkPolicy is a user-defined, non-namespaced policy resource, not a built-in default policy that normally changes between versions. I changed this to "GlobalNetworkPolicy or other egress policy changed during the upgrade."

## Review Notes
- The diagnostic commands are broadly valid. `kubectl run`, `kubectl exec`, `calicoctl get ippool -o yaml`, and `calicoctl get globalnetworkpolicy -o yaml` match current official command references.
- The `k8s-app=calico-node` selector and `kube-system` namespace are accurate for manifest-based Calico installations, but operator-based installations may use different namespaces such as `calico-system`.
- The local environment did not have `kubectl` installed, so kubectl command validation was performed against the official Kubernetes reference documentation.
