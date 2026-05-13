# Validation Summary: How to Install Calico in nftables Mode Step by Step

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- kube-proxy
- nftables
- Linux networking
- kubectl

## Sources Consulted
- Calico Open Source documentation: Calico nftables data plane, https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Open Source documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: Felix configuration reference, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: FelixConfiguration resource reference, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Install Calico networking and network policy for on-premises deployments, https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Kubernetes documentation: kube-proxy configuration API, https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes blog: NFTables mode for kube-proxy, https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- nftables wiki: Quick reference, https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes

## Issues Found
- The post described Calico nftables dataplane installation as a Felix `iptablesBackend: nft` patch. That configures iptables-nft behavior, not the Calico nftables dataplane described in current Calico operator documentation. I changed the installation manifest to use `spec.calicoNetwork.linuxDataplane: Nftables`.
- The post omitted Calico's requirement that kube-proxy also run in nftables mode. I added the `KubeProxyConfiguration` snippet and restart guidance for kube-proxy and calico-node after a mode change.
- The post used outdated Calico v3.27.0 operator URLs and omitted the v3 CRD bundle used by the current operator installation path. I updated the commands to the current v3.32.0 manifests and added the CRD creation command.
- The kernel requirement was too low for Calico's current nftables dataplane documentation. I updated it from Linux 5.2+ to Linux 5.13+ with `nft` 1.0.1+.
- The `Installation` custom resource did not include the nftables dataplane field and used a less precise VXLAN value than the current Calico nftables example. I added `linuxDataplane: Nftables`, an IP pool name, and `VXLANCrossSubnet`.
- The verification command assumed a specific `ip calico-filter` table. I changed it to `nft list ruleset | grep calico`, which is less brittle while still verifying Calico-created nftables rules.
- The pod networking test created only one pod but instructed the reader to ping another pod IP. I changed it to create two BusyBox pods and ping from one to the other.

## Review Notes
The guide is now aligned with current Calico Open Source 3.32 nftables dataplane documentation. In future revisions, the author may want to add a short prerequisite step showing how to configure kubeadm with nftables kube-proxy before cluster creation, but the existing structure was preserved.
