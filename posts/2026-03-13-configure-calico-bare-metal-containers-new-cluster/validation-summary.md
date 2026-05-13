# Validation Summary: How to Configure Calico on Bare Metal with Containers for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPPool, BGPConfiguration, BGPPeer, FelixConfiguration, and Installation resources
- BGP routing
- MTU configuration
- calicoctl and kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The IPPool example used `encapsulation: None`, which is an operator Installation IP pool field, not a `projectcalico.org/v3` IPPool field. Changed it to `ipipMode: Never`, which is the documented IPPool field for disabling IP-in-IP encapsulation. VXLAN defaults to `Never` on a new pool.
- The IPPool section showed `blockSize` without noting that Calico only allows it to be set when the pool is created. Added a short caveat so readers do not expect to edit it directly after installation.
- The introduction referred specifically to tuning the eBPF dataplane, but the guide does not enable or configure Calico eBPF mode. Reworded this to "dataplane" to avoid implying eBPF-specific configuration.
- The jumbo-frame MTU example implied that setting 9000 is generally valid for jumbo environments. Clarified that the full pod network path must support 9000-byte frames.

## Review Notes
The BGPConfiguration, BGPPeer, FelixConfiguration patch, calicoctl apply/get/node status commands, and operator Installation MTU patch are consistent with current Calico documentation. For existing clusters, readers should verify the active default pool and current encapsulation mode before applying changes, because pool CIDR and block-size changes are not normal in-place edits.
