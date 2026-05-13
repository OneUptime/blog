# Validation Summary: Configure Service CIDR Reachability with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services and ClusterIP networking
- BGP routing
- calicoctl
- BIRD route inspection

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses - https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: BGPConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes documentation: Services - https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used `ping` to test a Kubernetes ClusterIP. Kubernetes Services are implemented for service ports and protocols such as TCP/UDP/SCTP, and ICMP ping is not a valid ClusterIP service test. Changed the example to use `curl -k https://$CLUSTER_IP:443/readyz` against the default `kubernetes` service.
- The BGP verification comments implied that `calicoctl node status` checks advertised routes. Official Calico documentation describes it as a local-node command for checking Calico node and BGP peering status. Updated the comment and command to `sudo calicoctl node status`.
- The post used `calicoctl apply -f` with a partial `default` BGPConfiguration. Official Calico documentation says `apply` replaces the existing resource specification in its entirety, so a partial update can remove other BGP settings. Changed the update command to `calicoctl patch bgpconfiguration default --patch ...`.

## Review Notes
- The BGPConfiguration fields `serviceClusterIPs`, `serviceExternalIPs`, and `serviceLoadBalancerIPs` are valid on the global `default` BGPConfiguration.
- Calico documentation notes that `CALICO_ADVERTISE_CLUSTER_IPS` was used in earlier versions and takes precedence over `serviceClusterIPs` if still configured. The post does not mention that legacy setting; this is not incorrect for new configurations but may be a useful future troubleshooting note.
