# Validation Summary: How to Troubleshoot BGP Security Designs in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPPeer and BGPFilter custom resources
- Kubernetes Secrets and RBAC

## Sources Consulted
- Calico BGP peer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP filter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico secure BGP sessions guide: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico configure BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp

## Issues Found
- The post created a Kubernetes Secret for the BGP password but did not grant the calico-node ServiceAccount permission to read it. Added the required Role and RoleBinding because Calico requires get/list/watch access to the referenced Secret.
- The post listed AS path filtering as a Calico BGP security control and showed it in the diagram. Calico BGPFilter supports route filtering by fields such as prefix length, source, interface, peer type, priority, and communities, but the official resource reference does not document AS-path matching for rejecting routes. Updated the wording and diagram to use route filtering instead.

## Review Notes
The BGPPeer password secretKeyRef format, BGPFilter importV4 prefixLength rules, kubectl Secret command, and BGPPeer filters list are consistent with the current Calico documentation. The Secret namespace should match the namespace where calico-node runs; the examples use calico-system, which is correct for common operator-based installations.
