# Validation Summary: How to Configure Calico in nftables Mode for a New Cluster

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Calico
- Kubernetes
- kube-proxy
- nftables
- Calico FelixConfiguration
- Calico IPPool
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico nftables data plane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes virtual IPs and service proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- The post used `iptablesBackend: nft` to confirm and configure Calico nftables mode. This configures the iptables-nft backend, not Calico's nftables dataplane. Updated the checks and patch example to use `nftablesMode: Enabled`.
- The prerequisites listed Linux 5.2+. Calico's nftables dataplane documentation requires Linux 5.13 or later with `nft` 1.0.1 or later. Updated the prerequisite.
- The kube-proxy section implied editing the ConfigMap was sufficient. Added a `kubectl rollout restart daemonset/kube-proxy -n kube-system` command so kube-proxy reloads the new mode.
- The IPPool manifest used `encapsulation: VXLAN`, which is an operator Installation IP pool field, not a `projectcalico.org/v3` IPPool field. Updated the Calico IPPool example to use `vxlanMode: Always`.
- The Felix patch used `routeRefreshInterval` as the nftables refresh control. Updated it to `nftablesRefreshInterval`, which is the nftables-specific Felix refresh interval.
- The conclusion referred to setting Felix to the `nft` backend. Updated it to say nftables mode is enabled.

## Review Notes
The NetworkPolicy example uses the current `networking.k8s.io/v1` API and is valid. The `nft list tables` check is a reasonable verification step, though exact table output can vary by Calico version and enabled features.
