# Validation Summary: How to Test Network Policies with Calico on MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MicroK8s
- Kubernetes NetworkPolicy
- Calico
- Calico GlobalNetworkPolicy
- calicoctl
- BusyBox wget

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico quickstart for MicroK8s: https://docs.tigera.io/calico/latest/getting-started/kubernetes/microk8s
- MicroK8s CNI configuration documentation: https://canonical.com/microk8s/docs/change-cidr
- BusyBox command reference for wget: https://busybox.net/BusyBox.html

## Issues Found
- The prerequisites did not mention enabling MicroK8s DNS, but the connectivity tests use the Kubernetes service DNS name `db-svc.db-tier.svc.cluster.local`. Added `microk8s enable dns` to the prerequisites.
- The prerequisites said `calicoctl` must be installed, but Calico's MicroK8s quickstart requires it to be installed and configured for the cluster. Clarified that requirement.
- The BusyBox `wget` commands used `--timeout=5`. BusyBox documents the timeout flag as `-T SEC`, so the examples were updated to use `wget -T 5`.

## Review Notes
The Kubernetes NetworkPolicy manifests use the current `networking.k8s.io/v1` API. The default-deny policy, additive allow policy behavior, combined `namespaceSelector` and `podSelector` peer, and Calico `GlobalNetworkPolicy` fields match the referenced documentation.
