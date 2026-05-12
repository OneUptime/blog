# Validation Summary: How to Secure BGP Peering in Calico

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- BGP (Border Gateway Protocol)
- MD5 BGP session authentication
- Calico BGPPeer resource
- Calico BGPFilter resource
- Calico GlobalNetworkPolicy / HostEndpoint policies
- kubectl / calicoctl
- Kubernetes Secrets

## Sources Consulted
- [Calico BGPPeer resource reference](https://docs.tigera.io/calico/latest/reference/resources/bgppeer)
- [Calico BGPFilter resource reference](https://docs.tigera.io/calico/latest/reference/resources/bgpfilter)
- [Calico Secure BGP sessions documentation](https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp)
- [Calico v3.26 release announcement (Tigera)](https://www.tigera.io/blog/whats-new-in-calico-v3-26/) — confirms BGPFilter was introduced in v3.26
- [projectcalico/calico PR #7271 — Add new BGPFilter resource](https://github.com/projectcalico/calico/pull/7271)

## Issues Found
- **BGPFilter version claim was incorrect.** The post stated the BGPFilter resource was added in Calico v3.27+. Per Tigera's release announcement and the upstream PR, BGPFilter was actually introduced in Calico v3.26. Changed "(Calico v3.27+)" to "(Calico v3.26+)" to match upstream history. This also keeps the version claim consistent with the post's own prerequisites section, which already lists Calico v3.26+ as the minimum.

## Review Notes
- The BGPPeer `password.secretKeyRef` structure (`name` + `key`) is correct per the current Calico reference.
- Placing the BGP password secret in the `calico-system` namespace is correct for operator-installed Calico — the docs explicitly state the secret must live in the namespace where `calico-node` runs. Users running Calico via manifest install (where `calico-node` lives in `kube-system`) will need to adjust the namespace accordingly; the post could note this caveat but it is not technically wrong as written.
- The `filters` field on BGPPeer accepts a list of BGPFilter names — the YAML example is correct.
- BGPFilter `matchOperator: In` and the `prefixLength` `min`/`max` fields match the official schema.
- The GlobalNetworkPolicy example assumes the cluster has HostEndpoint resources defined and labeled (since `GlobalNetworkPolicy` against host traffic applies via HostEndpoints). The post does not call this out explicitly; readers without HostEndpoints configured will find the policy has no effect. Not a technical error, but a useful pre-condition to flag in a future revision.
- The post uses `calico-system` consistently, which aligns with Tigera operator installations (the most common modern deployment path).
