# Validation Summary: Avoid Mistakes When Configuring the IPv6 Control Plane with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes dual-stack networking
- IPv6
- FelixConfiguration
- Calico Node resources
- Calico BGPConfiguration and BGPPeer resources
- calicoctl
- kubectl
- Linux ip6tables

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico IP autodetection guide: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico dual-stack and IPv6 guide: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes dual-stack validation guide: https://kubernetes.io/docs/tasks/network/validate-dual-stack/

## Issues Found
- The FelixConfiguration example used `ipv6AutodetectionMethod`, which is not a FelixConfiguration field. I removed it from the Felix example and added the documented manifest-based `IP6=autodetect` and `IP6_AUTODETECTION_METHOD=cidr=...` command in the node address detection step.
- The BGPPeer example comment said `nodeSelector: all()` would restrict the peer to specific nodes. I changed the comment to use a label selector example, because omitting `node` and `nodeSelector` creates a global peer and label selectors are used for restriction.
- The BGPConfiguration example used `serviceLoadBalancerIPs` while describing pod CIDR advertisement. I changed the example to `serviceClusterIPs` and updated the surrounding comments to describe Kubernetes service CIDR advertisement accurately.
- The pod IPv6 lookup assumed `.status.podIPs[1]` was always IPv6. I changed it to list all pod IPs and select the address containing `:`, matching Kubernetes dual-stack validation patterns without depending on address-family order.

## Review Notes
The post is technically relevant and the remaining examples use current Calico v3 API resource names and documented kubectl/calicoctl command patterns. Calico's latest Felix documentation lists `ipv6Support` with a default of `true`, while Calico's IPv6 setup guide still documents setting `FELIX_IPV6SUPPORT=true`; keeping the explicit FelixConfiguration setting is acceptable for clarity but may be redundant on newer installations.
