# Validation Summary: How to Build Zero Trust Network Access

## Status
validated

## Post Type
Guide / Architectural tutorial

## Technologies Covered
- Zero Trust Network Access (ZTNA) architecture
- NIST SP 800-207 / CISA Zero Trust Maturity Model
- Identity standards: SAML 2.0, OIDC, SCIM, FIDO2, WebAuthn
- MFA, conditional access, risk-based authentication
- Device posture / MDM / EDR
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Open Policy Agent (OPA) for authorization
- mTLS, certificate-based device identity
- SIEM / UEBA logging architecture
- SQL (PostgreSQL-style INTERVAL syntax for log queries)
- Python (sample continuous verification class)

## Sources Consulted
- Kubernetes Network Policies docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS debugging (CoreDNS `k8s-app: kube-dns` label, `kubernetes.io/metadata.name` namespace label): https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- NIST SP 800-207 Zero Trust Architecture
- CISA Zero Trust Maturity Model v2.0 (April 2023): https://www.cisa.gov/sites/default/files/2023-04/zero_trust_maturity_model_v2_508.pdf
- SCIM 2.0 (IETF RFC 7643/7644)
- WorkOS — SCIM vs JIT comparison: https://workos.com/blog/scim-vs-jit-what-s-the-difference
- Oracle A-Team — Just-In-Time vs SCIM provisioning
- Microsoft Windows 10 release information (build 10.0.19044 = 21H2): https://learn.microsoft.com/en-us/windows/release-health/release-information

## Issues Found
1. **SCIM/JIT terminology error** — The post originally stated "Just-in-time (JIT) provisioning through SCIM" under Pillar 1: Identity. This conflates two distinct protocols: JIT provisioning is driven by SAML/OIDC assertions at first login, while SCIM is a separate push/pull protocol for full user lifecycle management (RFC 7643/7644). They are complementary, not synonymous. Updated to: "Just-in-time (JIT) provisioning via SAML or OIDC, paired with SCIM for ongoing lifecycle management."

## Review Notes
- The Kubernetes NetworkPolicy snippet is syntactically valid against `networking.k8s.io/v1`. The well-known `kubernetes.io/metadata.name` namespace label has been control-plane-managed since Kubernetes 1.21, and `k8s-app: kube-dns` is the correct CoreDNS pod label (retained for backward compatibility with the original kube-dns deployment). The DNS egress rule correctly uses `namespaceSelector` + `podSelector` in the same `to` entry (logical AND).
- The five-pillar model (Identity, Device, Network, Application, Data) matches the CISA Zero Trust Maturity Model v2.0. The post does not explicitly attribute the pillars to CISA; a reader familiar with the DoD's 7-pillar model could be momentarily confused, but the post's pillar list is itself accurate. No fix required.
- Listed minimum OS versions (Windows 10.0.19044 = 21H2, macOS 12 Monterey, iOS 15, Android 12) are 2021-era releases and somewhat lenient for a post dated 2026-01-30; vendors increasingly require macOS 13+/iOS 16+ by 2026. Not factually wrong, but readers in 2026 may want to set higher minimums for new deployments.
- YAML config snippets for the "ZTNA Gateway" and "conditional access policy" are explicitly illustrative/generic (not tied to a specific product schema). They are internally consistent and not misleading.
- All cited standards (FIDO2, WebAuthn, SAML 2.0, OIDC, SCIM, OPA) are current and appropriate.
- Mermaid diagrams parse and render with standard Mermaid syntax.
