# Validation Summary: How to Check Whether a Container Image Verifier Supports Fulcio URI Identities

## Status

validated

## Post Type

Technical troubleshooting guide with certificate-inspection and image-verification commands.

## Technologies Covered

- Sigstore and Fulcio certificate identities
- Cosign container image signature verification
- OpenSSL X.509 certificate inspection
- containers/image signature policy and policy scopes
- GitHub Actions OIDC workload identities
- Certificate SANs, trust roots, and transparency evidence

## Sources Consulted

- [Fulcio specification and certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md) — issued-certificate SAN types, empty subjects, and OIDC issuer extensions.
- [containers/image policy reference](https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md) — mandatory Fulcio fields, separate PKI semantics, signed repository identities, policy scope selection, and signature retrieval requirements.
- [containers/image Fulcio certificate verification implementation](https://github.com/containers/image/blob/main/signature/fulcio_cert.go) — issuer comparison and matching against certificate email addresses.
- [Cosign verification guide](https://docs.sigstore.dev/cosign/verifying/verify/) — verification flags, certificate identities, and signed image digest checks.
- [Sigstore CI quickstart](https://docs.sigstore.dev/quickstart/quickstart-ci/) — GitHub Actions workflow URI and OIDC issuer used with Cosign image verification.
- [Sigstore OIDC verification cheat sheet](https://docs.sigstore.dev/quickstart/verification-cheat-sheet/) — supported identity forms and GitHub Actions issuer/identity examples.
- [Cosign custom component configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/) — custom trust material for private Sigstore deployments.
- [OpenSSL x509 command reference](https://docs.openssl.org/3.6/man1/openssl-x509/) — certificate input, subject, issuer, and selected-extension output flags.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. Both shell examples use documented commands and options. The workflow identity and issuer match the official GitHub Actions examples.
- The Fulcio profile requires an empty subject for issued certificates and permits email, URI, and otherName SAN identities. The post correctly directs readers to the SAN and distinguishes the certificate issuer name from the OIDC issuer extension.
- The referenced containers/image schema requires oidcIssuer and subjectEmail in its fulcio object. Its implementation checks EmailAddresses rather than URI SANs, supporting the post's warning about substituting a URI into subjectEmail. The pki object has separate identity and trust rules.
- Policy scope selection and signature retrieval can affect results independently of certificate validity. The positive and negative matrix appropriately checks intended signer enforcement, issuer restrictions, signature presence, and digest binding through the actual consumer.
- No concrete package version is claimed. The linked main-branch documentation is mutable, so installed-version verification remains necessary. GitHub marks the containers/image repository as archived; this does not invalidate the documented schema or establish support in a successor implementation.
- This was a documentation and source-code review, not a live deployment test. No signing certificate, real image digest, registry, or target consumer configuration was supplied. The example certificate filename, registry/repository, identity, and digest must correspond to real test inputs before execution; the negative-case matrix was not run.
- The technical reference links resolve to the intended official resources. The example workflow URI and registry are illustrative identifiers rather than claimed live resources.
