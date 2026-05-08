# Validation Summary: How to Update the Calico BGPConfiguration Resource Safely

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Calico Open Source
- BGPConfiguration custom resource
- BGP peering and route reflectors
- Kubernetes
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico service IP advertisement guide: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The review section said to record advertised routes, but the listed commands only show BGP session status, BGPConfiguration content, and Kubernetes node details. Changed the sentence to say the commands record the current BGP configuration and node details for comparison.
- The conclusion recommended validating changes with dry-run, but the official `calicoctl apply` reference does not document a dry-run option. Changed this to recommend validating the updated manifest before applying it.

## Review Notes
The BGPConfiguration fields and examples use current Calico API names, including `asNumber`, `nodeToNodeMeshEnabled`, `serviceClusterIPs`, `serviceExternalIPs`, `serviceLoadBalancerIPs`, `communities`, and `prefixAdvertisements`. The `calicoctl patch bgpconfiguration default -p ...` command matches the official BGP peering documentation. The post correctly warns that disabling node-to-node mesh without replacement BGPPeer resources can break pod networking.
