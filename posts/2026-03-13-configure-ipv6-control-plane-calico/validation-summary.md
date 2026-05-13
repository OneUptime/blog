# Validation Summary: Configure IPv6 Control Plane with Calico

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes IPv4/IPv6 dual-stack networking
- IPv6 pod and service networking
- Calico IPPool and FelixConfiguration resources
- calicoctl and kubectl CLI usage
- Linux IPv6 forwarding

## Sources Consulted
- Calico documentation: Configure Kubernetes control plane to operate over IPv6 - https://docs.tigera.io/calico/latest/networking/ipam/ipv6-control-plane
- Calico documentation: Configure dual stack or IPv6 only - https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: calicoctl create and get command references - https://docs.tigera.io/calico/latest/reference/calicoctl/create and https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The prerequisites only mentioned the API server service CIDR. Added the kube-controller-manager and kube-proxy `--cluster-cidr` requirement and the kubelet `--node-ip=<IPv4>,<IPv6>` note for bare-metal dual-stack nodes, matching Kubernetes dual-stack documentation.
- The post implied that setting FelixConfiguration alone enables IPv6 pod assignment. Added the Calico manifest settings for `IP6=autodetect`, `FELIX_IPV6SUPPORT=true`, `CALICO_IPV6POOL_CIDR`, and CNI IPAM `assign_ipv6`, which Calico documents for IPv6-only and dual-stack manifest installations.
- The FelixConfiguration example included an `iptablesBackend: Auto` comment claiming it selected an IPv6-compatible `ip6tables` backend. Removed that field and comment because IPv6 support is controlled by `ipv6Support` / `FELIX_IPV6SUPPORT`; iptables backend selection is not the mechanism for enabling IPv6.
- The IPPool comment said `ipipMode: Never` and `vxlanMode: Never` enabled BGP route advertisement. Reworded it to clarify that disabling encapsulation requires BGP or other routing between nodes.
- The connectivity test pinged a hard-coded address (`fd00:10:244::1`) that may not exist. Changed it to ping another pod's actual IPv6 address.
- The best-practice advice about `/48` or `/64` pod CIDRs was too broad. Replaced it with guidance to size the IPv6 pod CIDR for node count and per-node allocations, noting Calico's default IPv6 block size of `/122`.

## Review Notes
The post remains a compact guide rather than a full cluster bootstrap procedure. Operator-based Calico installations may prefer configuring IPv6 pools through the `Installation` resource at install time instead of manually creating IPPools with `calicoctl`.
