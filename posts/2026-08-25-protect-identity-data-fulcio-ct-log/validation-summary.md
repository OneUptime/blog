# Validation Summary: Protect Identity Data in Fulcio's Public CT Log

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Sigstore and Fulcio
- X.509 certificates and Certificate Transparency
- Cosign 3.1.3
- Rekor v1 and Rekor v2
- OpenID Connect (OIDC)
- GitHub Actions workload identities
- OpenSSL
- RFC 3161 timestamp authorities
- TUF, `TrustedRoot`, and `SigningConfig`

## Sources Consulted

- Fulcio README and certificate-transparency behavior - https://github.com/sigstore/fulcio#certificate-transparency
- Fulcio security model - https://github.com/sigstore/fulcio/blob/main/docs/security-model.md
- Fulcio certificate specification - https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md
- Fulcio OIDC guidance - https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- Fulcio OID directory - https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md
- Current Fulcio identity configuration - https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- Fulcio 1.8.6 release introducing the raw Token Subject extension - https://github.com/sigstore/fulcio/releases/tag/v1.8.6
- Fulcio 1.8.8 release - https://github.com/sigstore/fulcio/releases/tag/v1.8.8
- Fulcio certificate-issuing and precertificate flow - https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/
- Fulcio architecture specification - https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md
- Sigstore client architecture, timestamp, and transparency-service requirements - https://github.com/sigstore/architecture-docs/blob/main/client-spec.md
- Sigstore threat model - https://docs.sigstore.dev/about/threat-model/
- Sigstore signing overview - https://docs.sigstore.dev/cosign/signing/overview/
- Cosign timestamp verification guidance - https://docs.sigstore.dev/cosign/verifying/timestamps/
- Cosign 3.1.3 release - https://github.com/sigstore/cosign/releases/tag/v3.1.3
- Cosign 3.1.3 sign-option definitions - https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/sign.go
- Cosign 3.1.3 signing-config validation - https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go
- Rekor v2 client and timestamp requirements - https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md
- Sigstore public `SigningConfig` - https://github.com/sigstore/root-signing/blob/main/targets/signing_config_rekor_v2.v0.2.json
- GitHub Actions OIDC claim reference - https://docs.github.com/en/actions/reference/security/oidc
- OpenSSL 3.6 `x509` documentation - https://docs.openssl.org/3.6/man1/openssl-x509/

## Issues Found

- The OpenSSL command combined `-text` with `-ext subjectAltName`. On current OpenSSL, `-ext subjectAltName` filters the extension output and hides Fulcio’s custom Sigstore OIDs, defeating the following inspection instruction. I removed that option so `-text` prints the SAN and every certificate extension.
- The workload-identity explanation said the workflow URI lets verifiers authorize reviewed build instructions. Because the URI can contain a mutable branch or tag ref, it authorizes the governed workflow identity but does not by itself pin the exact reviewed bytes. I corrected that wording; Fulcio’s separate Build Signer Digest is the immutable reference.
- The private-deployment checklist incorrectly required a private OIDC issuer and treated private CT, Rekor, and a generic audit log as interchangeable. I changed this to a trusted configured issuer and separated the private-CA audit mechanism, accepted timestamp path, and any signature-transparency service required by verifier policy.
- The trust-distribution bullet named TUF or trusted-root documents without requiring authenticated delivery or a signing configuration. I corrected it to require authenticated distribution of current `TrustedRoot` and `SigningConfig` material through private TUF or another secure out-of-band channel.
- The post implied that Fulcio can be pointed at Rekor. Fulcio submits certificates or precertificates to CT; signing clients upload signing material to Rekor, and a CT log must accept the private CA chain. I corrected the component responsibilities and acceptance condition.
- The `--tlog-upload=false` guidance was outdated for Cosign 3.1.3. The flag is deprecated and rejected on the default signing-config path. I replaced it with the current Rekor-free `SigningConfig` approach and clarified that Rekor v1 supplied a signed `integratedTime`, while Rekor v2 requires a separate accepted timestamp such as RFC 3161.
- The bundle-redaction sentence said the logs already hold the original certificate. Fulcio commonly logs a precertificate containing the same identity metadata, while Rekor receives the final certificate and signature only after the client upload. I corrected the wording to distinguish those records.

## Review Notes

- The raw Token Subject extension (`1.3.6.1.4.1.57264.1.24`) was introduced in Fulcio 1.8.6. It is present in current Fulcio 1.8.8 behavior, but older or lagging deployments may not include it.
- GitHub’s current upstream mapping still constructs the SAN from `https://github.com/` plus `job_workflow_ref` and maps repository, workflow, commit, ref, owner, run, visibility, and optional deployment-environment claims into Fulcio extensions.
- Rekor v2 does not return a signed entry timestamp or meaningful `integratedTime`; current Sigstore public signing configuration includes a separate RFC 3161 timestamp authority.
- All external documentation links in the post returned HTTP 200 and their section anchors targeted the intended material.
