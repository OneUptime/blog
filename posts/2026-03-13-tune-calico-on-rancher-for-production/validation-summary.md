# Validation Summary: Tune Calico on Rancher for Production

## Status
validated

## Post Type
Tutorial / production tuning guide

## Technologies Covered
- Calico Open Source
- Rancher RKE and RKE2
- Kubernetes CNI networking
- Calico IPPool and FelixConfiguration resources
- Calico eBPF dataplane
- Kubernetes ConfigMaps, DaemonSets, and HelmChartConfig resources

## Sources Consulted
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico multiple IP pools documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico eBPF enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- RKE2 network options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE1 network plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post described BGP tuning in the description and introduction but did not include a BGP configuration section. Removed the BGP references so the scope matches the actual technical content.
- The MTU example patched `FelixConfiguration.spec.vethMTU`, which is not the current documented way to configure workload MTU. Replaced it with the RKE2 `HelmChartConfig` `installation.calicoNetwork.mtu` example and a manifest-based `calico-config` `veth_mtu` patch plus `calico-node` restart.
- The original `calico-config` example used the `calico-system` namespace generically. Updated the manifest-based example to use `kube-system`, matching Calico manifest documentation and RKE/RKE2 chart placement.
- The IPPool example could overlap an existing default IP pool and used `ipipMode` alongside a VXLAN pool. Added guidance to migrate or disable overlapping pools first, used an RKE2-style pod CIDR example range, and simplified the VXLAN pool to match Calico's documented multiple-pool examples.
- The Felix tuning comment claimed conntrack table sizing, but the example did not configure conntrack fields. Changed the comment to accurately describe route and iptables refresh interval tuning.
- The eBPF section used a manual kube-proxy DaemonSet patch as the primary RKE2 approach and included `bpfKubeProxyIptablesCleanupEnabled`. Replaced the primary example with the RKE2-supported `disable-kube-proxy: true` plus Calico chart `linuxDataplane: BPF` and `kubeProxyManagement: Enabled` configuration. Kept a separate manifest-based Calico example using `bpfEnabled`.
- The best-practices log command was incomplete because `kubectl logs -n calico-system` does not identify a pod or selector. Replaced it with a selector-based `kubectl logs -A -l k8s-app=calico-node --tail=100` command.
- The best practice to set `reportingInterval: 0s` was too unconditional. Qualified it so operators only disable Felix status reporting after confirming they do not rely on those reports.

## Review Notes
RKE2 support for the Calico eBPF dataplane is version-gated in the RKE2 documentation. Future revisions should mention the exact supported RKE2 release lines when targeting a specific Rancher/RKE2 version.
