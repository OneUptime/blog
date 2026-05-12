# Validation Summary: How to Secure BGP Security Designs in Calico

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- Calico (Project Calico) BGP
- Kubernetes (BGPPeer, BGPFilter CRDs)
- BGP routing protocol (MD5 authentication, prefix-length filters, AS path filtering, RPKI)
- kubectl / calicoctl
- Mermaid (diagram syntax)

## Sources Consulted
- Calico BGPPeer reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPFilter reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico releases: https://github.com/projectcalico/calico/releases
- calicoctl release history: https://github.com/projectcalico/calicoctl/releases

## Issues Found
No technical issues found. Verified specifically:
- `BGPPeer.spec.password.secretKeyRef.{name,key}` is a valid field shape for BGP MD5 password configuration.
- `BGPFilter.spec.importV4` with rules containing `action`, `cidr`, and `prefixLength.{min,max}` is the correct schema. `action` accepts `Accept` and `Reject`.
- A trailing catch-all `- action: Accept` is valid (rules evaluate sequentially, first match wins).
- `BGPPeer.spec.filters` is a list of BGPFilter resource names — referencing `secure-prefix-filter` by name is correct.
- The `calico-system` namespace is correct for operator-managed installs (the default modern installation method).
- calicoctl v3.26+ is a real and valid version line.

## Review Notes
- Namespace caveat: `calico-system` applies to operator-managed installs. Manifest-based installations place `calico/node` in `kube-system`, so the BGP password secret would need to live there instead. The post does not call this out, but operator installs are the standard path today, so the example is reasonable as-is.
- calicoctl v3.26+ is accurate but slightly dated as of May 2026 (current line is v3.30–v3.32). Not incorrect, just conservative.
- BGP MD5 (RFC 2385) is a legacy mechanism; TCP-AO (RFC 5925) is the modern replacement. Calico still uses MD5, so the post is correct in describing current Calico behavior. Worth noting as a future improvement if Calico adds TCP-AO support.
- The post mentions AS path filtering and session logging in the diagram but only demonstrates MD5 and prefix-length filters in the YAML. That is consistent with the introduction ("For internal Kubernetes clusters, the first two are most relevant") and is a deliberate scoping choice, not an error.
- Password constraint: Calico requires BGP passwords to be 80 characters or fewer. The example password `StrongBGPauth$ecret2024` is well within that limit.
