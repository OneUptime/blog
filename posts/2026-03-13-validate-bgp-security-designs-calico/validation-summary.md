# Validation Summary: How to Validate BGP Security Designs in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico BGPPeer and BGPFilter resources
- Kubernetes Secrets and RBAC

## Sources Consulted
- Calico Open Source documentation: Secure BGP sessions - https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico Open Source documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source documentation: BGPFilter resource - https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico Open Source documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- RFC 2385: Protection of BGP Sessions via the TCP MD5 Signature Option - https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The BGP password example created the Kubernetes Secret and referenced it from `BGPPeer`, but omitted the Calico requirement that the `calico-node` ServiceAccount must be able to read the referenced Secret. Added a minimal Role and RoleBinding example for `get`, `list`, and `watch` access in `calico-system`.
- The post referred to AS path filtering as a Calico BGP security layer. Current Calico `BGPFilter` matching supports CIDR, prefix length, source, interface, peer type, priority, and communities, but not arbitrary AS path matching. Updated the wording and diagram to refer to import/export route filters instead.

## Review Notes
The `BGPPeer` password `secretKeyRef`, `filters` field, and `BGPFilter` `importV4` prefix-length rules match the current Calico Open Source API documentation. The Secret namespace should match the namespace where `calico-node` runs; this post uses the common operator namespace `calico-system`.
