# Validation Summary: How to Use Image Signing with Cosign and Sigstore in Kubernetes Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Cosign
- Sigstore
- Rekor transparency log
- Kubernetes admission controllers
- Kyverno
- Open Policy Agent

## Sources Consulted
- Sigstore Cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore overview: https://docs.sigstore.dev/
- Sigstore Rekor documentation: https://docs.sigstore.dev/logging/overview/
- Sigstore Policy Controller overview: https://docs.sigstore.dev/policy-controller/overview/
- Kyverno image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Open Policy Agent Kubernetes admission control documentation: https://www.openpolicyagent.org/docs/latest/kubernetes-introduction/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The post described Sigstore's transparency log as providing "tamper-proof signature records." Official Sigstore and Rekor documentation describes the log as immutable, append-only, and tamper-resistant. Updated the wording to "tamper-resistant, append-only signature records."
- The post said image signing "ensures images haven't been tampered with and come from trusted sources." Signature verification supports integrity and trusted identity checks, but the trusted-source guarantee depends on the verifier's configured policy and expected signer identity. Updated the wording to say this helps ensure integrity and trusted identities when verification policy is configured.

## Review Notes
The post is a high-level technical guide and does not include concrete command examples or configuration snippets beyond command names. Future improvements could include keyless Cosign examples that specify expected certificate identity and OIDC issuer during verification.
