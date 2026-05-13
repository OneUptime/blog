# Validation Summary: How to Configure Workloads Outside the Cluster with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD 2
- Linux static routing
- Calico network policy

## Sources Consulted
- Calico Open Source documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source documentation: Configure outgoing NAT - https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico Open Source documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- BIRD 2.18 User's Guide - https://bird.nic.cz/doc/bird-2.18.html
- Debian Wiki: NetworkConfiguration - https://wiki.debian.org/NetworkConfiguration

## Issues Found
- The static route persistence example wrote directly to `/etc/network/routes`, which is not a generic Debian/Ubuntu networking configuration file. Updated the example to state that persistence depends on the host's network manager and showed an ifupdown-style `post-up` route command as an example.
- The BIRD example imported Calico routes into BIRD but did not export them into the Linux kernel routing table, so the external host would not necessarily route pod CIDRs after learning them over BGP. Added a BIRD `protocol kernel` block with IPv4 export enabled.
- The BGP peering example configured only the external host side. Calico also needs a matching `BGPPeer` resource for the session. Added a minimal `calicoctl create` example using `node`, `peerIP`, and `asNumber`.
- The external-to-pod test implied that `kubectl` would be run on the external host. Clarified that the pod IP should be obtained from a machine with `kubectl` access before testing from the external host.

## Review Notes
- The post is technically relevant and the corrected routing examples align with Calico's BGP model. Production environments should still account for routing redundancy, Calico encapsulation/NAT settings, and host-specific persistent network configuration.
