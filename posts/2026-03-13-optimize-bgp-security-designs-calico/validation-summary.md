# Validation Summary: How to Optimize BGP Security Designs in Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (Secret resource, kubectl)
- BGP (Border Gateway Protocol)
- BGP MD5 session authentication
- BGPPeer and BGPFilter custom resources
- calicoctl
- Mermaid (diagram syntax)

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPFilter source/validation rules: https://github.com/projectcalico/calico/blob/master/api/pkg/apis/projectcalico/v3/bgpfilter.go
- Calico BGP configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- GitHub issue #8376 (prefix length matching feature): https://github.com/projectcalico/calico/issues/8376

## Issues Found
- **Missing `matchOperator` field in BGPFilter rules**: The original `secure-prefix-filter` BGPFilter had two import rules that set `cidr: 0.0.0.0/0` along with `prefixLength` but omitted `matchOperator`. Calico's API validation requires that "cidr and matchOperator must both be set or both be empty". Without `matchOperator`, the resource would be rejected by the API server. Fix: added `matchOperator: In` to both Reject rules so that the rules match routes whose prefix falls within `0.0.0.0/0` and whose prefix length is in the specified range.

## Review Notes
- The `BGPPeer.spec.password.secretKeyRef` shape (with `name` and `key` only, no namespace) is correct; the secret must live in the same namespace as the `calico-node` pod (typically `calico-system` for Helm installs or `kube-system` for manifest installs). The post correctly creates the secret in `calico-system`.
- BGP passwords in Calico must be 80 characters or fewer; the sample password (`StrongBGPauth$ecret2024`) satisfies this constraint.
- The trailing `- action: Accept` rule without other fields is valid; only `action` is required per the BGPFilter rule schema. It is also somewhat redundant because Calico's default action when no rule matches is `Accept`, but it serves as a clear explicit catch-all.
- ASN 64513 used in the example sits in the 16-bit private ASN range (64512–65534), which is appropriate for internal/lab examples.
- The introduction mentions four key BGP security controls (MD5 auth, prefix length limits, AS path filtering, RPKI), but the post only demonstrates the first two in code. AS path filtering and session logging appear in the Mermaid diagram but have no accompanying configuration — not technically incorrect, but a future revision could either drop them from the diagram or add brief examples for completeness.
- `calicoctl v3.26+` is mentioned as a prerequisite; the `BGPFilter` resource and `password.secretKeyRef` field have been GA in Calico for several releases, so this version pin is reasonable.
