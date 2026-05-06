# Validation Summary: How to Configure Calico for IPv6 in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes dual-stack networking
- Calico IPPool and Calico IPAM
- Calico BGPConfiguration and BGPPeer
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- `calicoctl`

## Sources Consulted
- Calico, Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico, Installing on on-premises deployments: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico, Create multiple IP pools: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico BGP configuration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peer reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes, IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes, Validate IPv4/IPv6 dual-stack: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes, Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The original install step omitted the separate `operator-crds.yaml` manifest that current Calico operator install docs require. I added the CRD install step and updated the manifest version to the current install-doc series used by Calico's official documentation.
- The post implied Calico alone enables dual-stack. I added the missing prerequisite that Kubernetes must already be configured with matching IPv4 and IPv6 pod and service CIDRs before Calico is installed.
- The IPv6 pool examples used `natOutgoing: Disabled` / `false` together with a ULA range (`fd00::/8`) and claimed those addresses were routable. Calico's IPv6 docs explicitly call out that private IPv6 ranges do not NAT by default, so I changed the examples to enable NAT for that address plan and corrected the explanation.
- The post said `blockSize: 122` means 4 addresses per block. Calico's IPPool reference states that `/122` is the default IPv6 block size and provides 64 addresses per block, so I corrected both occurrences.
- Step 2 conflicted with Step 1 by defining the same IPv6 pool again. I clarified that the standalone `IPPool` example is for out-of-band pool management rather than for creating a duplicate overlapping pool alongside the operator-managed pool.
- The command `calicoctl get ipam blocks --inet6` does not match the documented `calicoctl` IPAM commands. I replaced it with the supported `calicoctl ipam show --show-blocks`.
- The BGPConfiguration comment said `serviceClusterIPs` advertises pod CIDRs. That field advertises Kubernetes Service CIDRs over BGP, so I corrected the comment.
- The BGPPeer example used an invalid IPv6 literal (`2001:db8::upstream`) and a deprecated `keepOriginalNextHop` field. I replaced the peer address with a valid documentation-prefix IPv6 example and removed the deprecated field.
- The Kubernetes NetworkPolicy example used an invalid IPv6 CIDR (`2001:db8:client::/48`). I replaced it with a syntactically valid IPv6 documentation prefix.
- The verification section relied on `kubectl get pods -o wide` to show both pod IPs, but Kubernetes documents `.status.podIPs` as the correct dual-stack validation path. I replaced that check with a documented go-template against `status.podIPs`.
- The Service test assumed an IPv6 Service IP always exists. Kubernetes dual-stack Services are still `SingleStack` by default unless `ipFamilyPolicy` is set to `PreferDualStack` or `RequireDualStack`, so I added that caveat and changed the example to use an explicit IPv6 Service IP placeholder.
- The command `calicoctl get bgp routes` does not match the documented `calicoctl get` resource types. I replaced it with supported BGP inspection commands.

## Review Notes
- As of 2026-05-06, Calico's current public install documentation examples use the `v3.31.4` operator manifest series, while the article originally referenced `v3.27.0`.
- The article now distinguishes between pod route advertisement and Service CIDR advertisement: Calico exports workload routes from IP pools, while `serviceClusterIPs` is specifically for advertising Kubernetes Service ranges.
- The examples use ULA IPv6 ranges (`fd00::/8`). If a cluster uses globally routed IPv6 addresses instead, `natOutgoing` may not be needed.
- I validated the snippets against documentation and API references, but I did not run a live Kubernetes or Calico cluster in this workspace.
