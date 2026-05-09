# Validation Summary: How to Troubleshoot Installation Issues with Calico in nftables Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kube-proxy
- nftables
- iptables
- Linux kernel modules
- calicoctl and kubectl

## Sources Consulted
- Calico nftables data plane guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kube-proxy nftables mode blog: https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- Local nft(8) manual output for `nft --version` and ruleset inspection usage

## Issues Found
- The post incorrectly used `FelixConfiguration.spec.iptablesBackend: nft` as the way to enable Calico nftables mode. Current Calico operator documentation configures the Linux dataplane with `Installation.spec.calicoNetwork.linuxDataplane: Nftables`, so the inspection and patch commands were updated to use the `Installation` resource.
- The post stated that Felix requires `nft` 0.9.1 or later. Current Calico nftables documentation requires Linux kernel 5.13 or later with `nft` 1.0.1 or later, so the version guidance was corrected.
- The conclusion described Felix as being configured for the `nft` backend. This was revised to say that the Calico installation is configured for the `Nftables` Linux dataplane.
- The common error note for unsupported nftables was broadened to include unsupported nftables userspace, matching the current kernel and `nft` version requirements.

## Review Notes
The kube-proxy `mode: nftables` guidance is accurate for Kubernetes 1.31 and later. The post could be improved in the future by adding a Kubernetes version check before switching kube-proxy, because Calico documents nftables kube-proxy support as requiring Kubernetes 1.31.0 or later.
