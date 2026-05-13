# Validation Summary: How to Configure Calico on Bare Metal with Binaries for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes custom resources
- Calico IPPool, BGPConfiguration, BGPPeer, FelixConfiguration, and Node resources
- calicoctl
- systemd service environment variables
- BGP networking

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico IP autodetection guide: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico binary install without package manager: https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The IPPool example used `spec.encapsulation: None`, which is not a valid IPPool field in current Calico resource documentation. I changed it to `spec.ipipMode: Never`, which is the documented IPPool field for disabling IP-in-IP encapsulation.
- The node service example set `CALICO_IPV4POOL_CIDR` and `CALICO_IPV4POOL_IPIP` after Step 1 had already created the pool explicitly. These startup variables only control creation of a default pool when no pools exist, so I removed them from the per-node service example and added `IP=autodetect` so the documented `IP_AUTODETECTION_METHOD` setting is actually used.
- The conclusion referred to "IP pool encapsulation to None", matching the invalid field. I updated it to "IP pool IPIP mode to Never".

## Review Notes
The remaining Calico CRD fields and calicoctl commands are consistent with current Calico documentation. For future improvement, the post could be clearer about whether it targets a Kubernetes `calico/node` service, a non-cluster-host binary install, or a Kubernetes DaemonSet deployment, because Calico documents slightly different environment variable conventions for those paths.
