# Validation Summary: How to Configure Calico on MicroK8s for a New Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico CNI
- calicoctl
- Calico IPPool resources
- Calico FelixConfiguration resources

## Sources Consulted
- MicroK8s CNI Configuration: https://canonical.com/microk8s/docs/configure-cni
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking configuration: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The introduction and prerequisites implied that Calico needs to be enabled separately on MicroK8s. Updated the wording to state that MicroK8s 1.19 and newer use Calico as the default CNI.
- The post described tuning IP-in-IP for the MicroK8s default path, but MicroK8s documentation says the default Calico deployment uses the VXLAN backend. Updated the wording and encapsulation example to focus on `vxlanMode`.
- The CIDR change example replaced the Calico IPPool directly but did not update the MicroK8s Calico manifest or kube-proxy `--cluster-cidr`, which MicroK8s documents as required for changing the pod CIDR. Replaced the example with the MicroK8s-specific workflow: update `cni.yaml`, update `kube-proxy`, delete the existing default IPPool if present, re-apply the manifest, and restart MicroK8s.
- The single-node encapsulation example patched both `ipipMode` and `vxlanMode`. Calico's IPPool documentation states these modes should not be set together. Updated the example to patch only `vxlanMode` for the default MicroK8s VXLAN backend.

## Review Notes
The Calico `IPPool` and `FelixConfiguration` resource examples use current `projectcalico.org/v3` APIs and valid field names. The CIDR change workflow is safest for a new cluster before workloads are scheduled, because changing pod CIDRs on an active cluster can disrupt existing pod networking.
