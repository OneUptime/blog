# Validation Summary: How to Monitor IP Autodetection in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IP autodetection
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Open Source documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
1. The configuration example used an `IPPool`, which configures pod address allocation and routing behavior, not Calico node IP autodetection. Replaced it with the documented operator `Installation` configuration using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`.
2. The state and verification commands focused on pod IPs and IP pools instead of the Calico Node resources where autodetected node addresses are recorded. Updated the commands to inspect Calico nodes and Kubernetes node internal IPs.
3. The `awk '{print $8}'` command on `kubectl get pods -A -o wide` would print the node column, not pod IPs, in the standard all-namespaces wide output. Replaced it with a quoted `kubectl get nodes -o custom-columns=... --no-headers` command that directly selects Kubernetes node internal IPs.
4. The architecture diagram showed IPPool block allocation to pod IPs, which is Calico IPAM behavior but not node IP autodetection. Updated it to show Kubernetes node internal IP selection, Calico autodetection, the Calico Node `ipv4Address`, and inter-node routing.
5. The conclusion repeated "in Calico". Removed the duplicate wording.

## Review Notes
The `calicoctl ipam show --show-blocks` and `calicoctl ipam check` commands are valid, but they validate IPAM state rather than node IP autodetection directly. They remain useful supporting checks when investigating Calico networking changes.
