# Validation Summary: How Fulcio Issues a 10-Minute Certificate from an OIDC Token

## Status
validated

## Post Type
Technical guide and architecture walkthrough

## Technologies Covered
- Fulcio
- Sigstore
- OpenID Connect (OIDC) and JSON Web Tokens (JWTs)
- Cosign v3.1.3
- X.509 code-signing certificates and PKCS#10 certificate signing requests
- Certificate Transparency and Signed Certificate Timestamps
- Rekor v1 and Rekor v2
- RFC 3161 timestamp authorities
- The Update Framework (TUF)
- GitHub Actions workload identity

## Sources Consulted
- [Fulcio repository and public-instance certificate lifetime](https://github.com/sigstore/fulcio)
- [Sigstore public-deployment specification](https://github.com/sigstore/architecture-docs/blob/main/sigstore-public-deployment-spec.md)
- [Fulcio architecture specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Fulcio certificate-issuing overview](https://github.com/sigstore/fulcio/blob/main/docs/how-certificate-issuing-works.md)
- [Fulcio OIDC requirements and identity mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Fulcio certificate profile](https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md)
- [Fulcio OID registry](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio v2 API definition](https://github.com/sigstore/fulcio/blob/main/fulcio.proto)
- [Current Fulcio certificate-request implementation](https://github.com/sigstore/fulcio/blob/main/pkg/server/grpc_server.go)
- [Sigstore client signing and verification specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [Rekor v2 architecture specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-v2-spec.md)
- [Rekor v2 client requirements](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/)
- [Cosign blob-signing documentation](https://docs.sigstore.dev/cosign/signing/signing_with_blobs/)
- [Cosign blob-verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Cosign CI quickstart](https://docs.sigstore.dev/quickstart/quickstart-ci/)
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign legacy-bundle verification advisory](https://github.com/sigstore/cosign/security/advisories/GHSA-fx35-mq7g-6g98)
- [Public Sigstore v1 signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config.v0.2.json)
- [Public Sigstore Rekor v2 signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config_rekor_v2.v0.2.json)
- [RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)
- [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [go-oidc v3.20.0 token verifier](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go)

## Issues Found
- The opening implied that Fulcio consumes an OIDC token for only one certificate request. Fulcio does not enforce token single use, so this was changed to say that the token authenticates a certificate request and does not become a long-lived signing credential.
- The token-validation description referred generically to “time claims.” The current verifier checks expiration and an optional not-before claim but does not freshness-check `iat`, so the wording now names the checks precisely while retaining `iat` in the documented minimum-claims contract.
- The CT sequence placed final leaf signing before precertificate submission. It now states the correct order: sign the precertificate, submit it to CT, receive an SCT, and issue the final leaf with the SCT normally embedded.
- The proof-of-possession explanation incorrectly implied that it prevents use of a captured token with another key. It now explains that proof of possession proves control of the submitted key, while a bearer of a still-valid stolen token can generate a fresh key and request a certificate.
- The challenge was described as issuer-defined. It is selected by Fulcio configuration and advertised by Fulcio's configuration API, so the wording was corrected.
- The email identity requirements were absolute even though trusted private Fulcio deployments can explicitly skip the `email_verified` check. The public/default behavior and private-deployment exception are now distinguished.
- The certificate-lifetime explanation implied that expiry stops use of the private key. It now explains that expiry constrains the interval in which the signature must be proven to have existed; the private key itself remains cryptographically usable.
- The signed-time discussion treated Rekor generically. Rekor v1 can authenticate `integratedTime` with a verified SET, but Rekor v2 does not issue SETs or act as a timestamp authority. The post now distinguishes the versions and explains the RFC 3161 requirement for Rekor v2.
- The Cosign example did not identify the major version required for the standardized bundle default. It is now pinned to patched Cosign v3.1.3 at publication; patched v2.6.5 still defaults to the legacy bundle format.
- The GitHub Actions ambient-identity description omitted the required `id-token: write` permission. That prerequisite is now explicit.
- The operational issuer check required exact equality with a fixed issuer. Fulcio also supports configured wildcard/meta-issuer patterns, so the check now covers both forms.

## Review Notes
- The commands and flags were verified against Cosign v3.1.3: `sign-blob`, `verify-blob`, `--bundle`, `--yes`, `--certificate-identity`, and `--certificate-oidc-issuer` are current and valid.
- The public Fulcio deployment's 10-minute certificate lifetime, SAN mappings, empty Subject, key usages, issuer-v2 extension `1.3.6.1.4.1.57264.1.8`, GitHub Actions workflow identity, and SAN-plus-issuer verification policy were verified as correct.
- Fulcio's older `docs/certificate-specification.md` still names deprecated issuer OID `1.3.6.1.4.1.57264.1.1`; the current OID registry, architecture specification, client specification, and implementation use issuer-v2 OID `1.3.6.1.4.1.57264.1.8` while the implementation also emits the deprecated extension for compatibility.
- All external links in the post resolved to the intended official resources during review.
