# Validation Summary: Choosing Safe Cosign Certificate Identity and Issuer Values

## Status

validated

## Post Type

Technical Guide / Supply Chain Security Guide

## Technologies Covered

- Sigstore Cosign v3.1.3
- Sigstore keyless signing and verification
- Fulcio signing certificates and certificate extensions
- Rekor and certificate-transparency logs
- OpenID Connect (OIDC)
- GitHub Actions OIDC claims and reusable workflows
- OCI container-image verification
- Private Sigstore trusted roots
- Go regular-expression syntax

## Sources Consulted

- [Cosign v3.1.3 `verify` command reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md) - command syntax and the identity, issuer, regular-expression, registry-CA, and trusted-root flags.
- [Cosign v3.1.3 certificate options](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/certificate.go) - exact identity/issuer requirements and deprecation of the direct certificate-chain and CA inputs.
- [Cosign v3.1.3 verification options](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/verify.go) and [new-bundle validation](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/verify/common.go) - default bundle mode, `--trusted-root`, and rejection of direct CA inputs by the new-bundle verifier.
- [Cosign v3.1.3 verifier selection](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/verify/verify.go) - new-bundle detection and legacy fallback behavior.
- [sigstore-go v1.2.2 certificate identity matching](https://github.com/sigstore/sigstore-go/blob/v1.2.2/pkg/verify/certificate_identity.go) - exact string comparison and Go regular-expression matching semantics used by Cosign v3.1.3.
- [Sigstore OIDC verification cheat sheet](https://docs.sigstore.dev/quickstart/verification-cheat-sheet/) and [OIDC usage in Fulcio](https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/) - GitHub Actions certificate identity construction and issuer value.
- [Fulcio OIDC configuration](https://github.com/sigstore/fulcio/blob/v1.8.8/config/identity/config.yaml) and [Fulcio certificate OID mapping](https://github.com/sigstore/fulcio/blob/v1.8.8/docs/oid-info.md) - mapping `job_workflow_ref`, repository, ref, trigger, top-level workflow, and environment claims into the SAN and certificate extensions.
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) and [OIDC with reusable workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows) - token claims and the distinction between caller and called workflows.
- [Sigstore custom-component configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/) and [Sigstore TrustedRoot schema](https://github.com/sigstore/protobuf-specs/blob/v0.5.1/protos/sigstore_trustroot.proto) - private Fulcio, Rekor, CT-log, and timestamp-authority trust material.
- [Fulcio certificate issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/) - certificate SAN, OIDC issuer extension, certificate chain, and CT-log processing.

## Issues Found

1. **The wildcard issuer explanation attributed OIDC-issuer authorization to the trusted root.** A Sigstore `TrustedRoot` contains CA and service verification material, not an OIDC-issuer allowlist. Changed the explanation to state that `--certificate-oidc-issuer-regexp='.*'` accepts the accompanying identity regardless of the issuer value in an otherwise valid certificate chaining to the trusted CA roots.
2. **The Cosign v3.1.3 bundle-path wording could imply that direct CA inputs are always rejected.** Cosign prefers the new-bundle verifier but can fall back to legacy verification when no new bundle is found. Clarified that `--certificate-chain`, `--ca-roots`, and `--ca-intermediates` are deprecated and are rejected specifically when Cosign selects the new-bundle verifier, where CA trust must come from `--trusted-root`.

## Review Notes

- All shell examples are syntactically valid for Cosign v3.1.3 after replacing the explicit digest placeholder and supplying `IMAGE_BY_DIGEST` where used.
- Exact certificate identity and issuer checks use case-sensitive string equality. The regular-expression variants use Go regular-expression syntax and are not implicitly anchored, so the post's explicit anchors and escaped literal dots are appropriate.
- Current Fulcio maps GitHub's `job_workflow_ref` to the URI SAN. For reusable workflows this identifies the called workflow, while the caller repository, source `ref`, top-level `workflow_ref`, trigger, and optional environment are represented separately. The two identity/issuer flags do not enforce those other extensions.
- Fulcio's Source Repository Ref maps GitHub's `ref` claim, not `head_ref`; for a pull-request run it may therefore be a `refs/pull/.../merge` ref.
- The post's five links under “Official Documentation” were checked and resolve to the intended official references. The general Sigstore verification guide still includes some pre-v3 direct-CA and bundle-transition material, so the tagged Cosign v3.1.3 command and source references were used for the version-specific review.
