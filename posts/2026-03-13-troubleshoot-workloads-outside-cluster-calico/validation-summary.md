# Validation Summary: How to Troubleshoot Workloads Outside the Cluster with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD 2
- Linux static routing
- kubectl

## Sources Consulted
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPPeer resource, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- BIRD 2.17.3 User's Guide, https://bird.nic.cz/doc/bird-2.17.3.html
- Kubernetes kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath support reference, https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Linux ip-route manual, https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Debian NetworkConfiguration documentation, https://wiki.debian.org/NetworkConfiguration

## Issues Found
- The static route persistence example appended `10.244.0.0/16 via <kubernetes-node-ip>` to `/etc/network/routes`, which is not a generally valid persistence method on Debian/Ubuntu-style hosts. I changed it to show `post-up` and `pre-down` `ip route` directives for the relevant `/etc/network/interfaces` iface stanza.
- The BIRD configuration imported routes from Calico but did not export BIRD routes into the Linux kernel routing table. I added `protocol device` and `protocol kernel` with IPv4 `export all` so routes learned over BGP can be installed for host forwarding.
- The BGP option only configured the external host side. Calico also needs a `BGPPeer` for the external host, so I added a minimal per-node `projectcalico.org/v3` `BGPPeer` manifest using the external host IP and AS number.

## Review Notes
- The example assumes Calico's default AS number `64512`; this is correct by default but should be adjusted if the cluster's `BGPConfiguration` or node-specific AS number differs.
- The pod CIDR `10.244.0.0/16` is an example and must match the actual Calico IP pool or routed pod CIDR in a real deployment.
