# Validation Summary: IPv6 Networking in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes dual-stack networking
- IPv6
- Calico
- Cilium
- `kubectl`
- Linux networking (`sysctl`, `ip6tables`)

## Sources Consulted
- Rancher IPv4/IPv6 Dual-stack reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/dual-stack
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Downward API reference (`status.podIPs`): https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Calico dual-stack / IPv6 documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Cilium Installation using Rancher: https://docs.cilium.io/en/latest/installation/k8s-install-rancher-existing-nodes/

## Issues Found
- The overview said Rancher dual-stack setup required API server flags. For Rancher-managed RKE2 clusters, the key user-facing configuration is the CNI plus pod and service CIDRs, so the wording was corrected.
- The prerequisites claimed Kubernetes `1.21+` provided stable dual-stack support. Kubernetes documents dual-stack as stable in `v1.23`, so the prerequisite was corrected to `1.23+`.
- The cluster configuration section omitted two Rancher/RKE2 requirements: dual-stack must be configured when the cluster is first created, and Rancher requires Stack Preference to match the networking mode. A short correction was added.
- The Calico section incorrectly instructed readers to apply a separate Tigera operator `Installation` manifest with VXLAN-based settings. RKE2 documents that bundled Calico automatically detects dual-stack configuration, creates separate IPv4/IPv6 IP pools, and uses BGP rather than VXLAN in dual-stack mode, so that section was rewritten.
- The Cilium section used a generic standalone Helm install command, which is not the standard Rancher-managed RKE2 path described by Rancher and RKE2. It was replaced with the supported Rancher/RKE2 configuration pattern: set `cni: cilium` and enable the `Enable IPv6 Support` option in Rancher.
- The verification commands did not reliably show both pod IP families, and the `kubectl run` example omitted `--restart=Never` and `--command`, which are required for the command to work as intended. Those commands were corrected.
- The service verification example inspected all Services instead of the example dual-stack Service, and the troubleshooting section used a generic CNI heading for a Calico-specific log command. Both were narrowed to the actual resources being discussed.

## Review Notes
- RKE2 documents an additional IPv6-only caveat for nodes that learn their default route via router advertisements: `net.ipv6.conf.all.accept_ra=2` may be required so the default route does not expire. The post is focused on dual-stack, so this was left as a review note rather than added to the main steps.
- Kubernetes dual-stack is enabled by default starting in `1.21`, but the feature state is `stable` beginning in `1.23`. The revised prerequisite reflects the stability claim made by the post.
