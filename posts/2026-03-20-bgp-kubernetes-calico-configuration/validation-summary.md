# Validation Summary: How to Configure BGP on Kubernetes with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Calico CNI
- IPv4 routing
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico BGP peer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico service IP advertisement guide: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico outgoing NAT guide: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- `calicoctl node` overview: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico v3.27.0 operator manifest URL used in the post: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

## Issues Found
- The installation example enabled `natOutgoing` while the post described routed pod IPs on a physical BGP fabric. Calico documents that BGP-peered physical-network deployments should disable Calico SNAT in that case, so `natOutgoing` was changed to `Disabled`.
- The architecture diagram labeled a single pod with `/24` networks, which is not a valid pod address representation and did not match the configured `blockSize: 26`. The diagram was corrected to show per-node pod CIDR blocks.
- The `calicoctl node status` note implied the command could be run generically "via calicoctl". Calico documents `calicoctl node ...` commands as host-local node commands, so the note was corrected to say it must be run directly on a node running `calico/node`.
- The `serviceClusterIPs` and `serviceExternalIPs` examples used plausible sample CIDRs but did not say they must match the real cluster or advertised ranges. Comments were tightened so readers replace them with actual values.
- The node selector example was quoted to make the YAML selector string unambiguous.

## Review Notes
- The post pins Calico `v3.27.0`. The manifest URL is valid and the referenced fields remain supported in current Calico documentation, but the latest Calico release is newer than 3.27.0.
- `serviceClusterIPs` advertisement is technically correct, but in production it works best when upstream routers are configured for BGP multipath/ECMP as documented by Calico.
