# Validation Summary: How to Customize Flannel with Calico Network Policy for Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico Open Source
- Flannel
- Canal
- Calico FelixConfiguration
- Calico GlobalNetworkPolicy
- Flannel VXLAN and WireGuard backends

## Sources Consulted
- Calico documentation: Install Calico for policy and flannel (aka Canal) for networking - https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Global network policy reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: IP pool reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: System requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes documentation: kubeadm init - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes documentation: kube-controller-manager flags - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes documentation: kubeadm configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Flannel documentation: Backends - https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Calico v3.27.0 Canal manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml

## Issues Found
- The GlobalNetworkPolicy DNS allow rule placed `ports` at the rule level and used `protocol` under an individual port entry. Calico policy ports belong under the source or destination match, and port matching requires a TCP or UDP protocol on the rule. Changed the policy to allow both UDP and TCP DNS to kube-dns on destination port 53.
- The IPPool block-size section incorrectly stated that Calico manages IPAM in Canal mode. The Canal manifest uses host-local IPAM with `subnet: usePodCidr`, and Flannel uses Kubernetes-assigned PodCIDRs. Replaced the IPPool example with kubeadm controller-manager `node-cidr-mask-size` configuration for per-node PodCIDR sizing.
- The WireGuard section used Calico Felix `wireguardEnabled`, which applies to Calico-managed pod networking rather than a Canal cluster using Flannel VXLAN for the data path. Replaced it with guidance to use Flannel's WireGuard backend before rollout, or migrate to Calico native networking before enabling Calico WireGuard.

## Review Notes
- The post pins the Canal manifest to Calico v3.27.0, which is older than the current Calico documentation version reviewed. The manifest URL is still plausible, but future updates should consider whether the guide should track a newer Calico release.
- The MTU recommendation of 1450 for a 1500-byte underlay with VXLAN is consistent with the common 50-byte VXLAN overhead, but production clusters should still confirm the actual underlay MTU and any cloud-provider encapsulation overhead.
