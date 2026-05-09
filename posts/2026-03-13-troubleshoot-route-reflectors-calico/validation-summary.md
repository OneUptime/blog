# Validation Summary: How to Troubleshoot Route Reflectors in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico route reflectors
- calicoctl
- BGPPeer and BGPConfiguration resources

## Sources Consulted
- Calico documentation: Configure BGP peering, including route reflectors and disabling node-to-node mesh: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPPeer resource reference and selector syntax: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: Troubleshooting commands and BGP peer status: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The `calicoctl patch` examples used `--type merge`, but current Calico documentation lists JSON merge patch as not implemented for `calicoctl patch`. I removed `--type merge` and used the documented default patch behavior with `--patch`.
- The node-to-node mesh patch could fail if the default BGPConfiguration resource does not exist. I added the documented caveat that the default BGPConfiguration must be created first in that case.
- The verification section said to check a worker node but selected the `calico-node` pod on `rr-node-1`. I replaced the commands with the documented `sudo calicoctl node status` check on a worker node and a host route-table check for installed Calico routes.
- The architecture diagram showed workers peering with only one route reflector each, which contradicted the BGPPeer resources and the conclusion recommending that every worker peer with every route reflector. I updated the diagram so each worker peers with both route reflectors.

## Review Notes
The post remains version-agnostic. The commands assume Calico is running with the Linux/BIRD BGP dataplane and that `calicoctl node status` is executed directly on the worker node, as required by Calico documentation.
