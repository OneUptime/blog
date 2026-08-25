# Validation Summary: Why Fulcio Rejects an OIDC Token: Debugging iss, aud, sub, exp, and nbf Claims

## Status
validated

## Post Type
Troubleshooting Guide / Technical Reference

## Technologies Covered
- Fulcio and Sigstore
- OpenID Connect (OIDC)
- JSON Web Tokens (JWT), JSON Web Signatures (JWS), and JSON Web Key Sets (JWKS)
- Cosign
- GitHub Actions OIDC
- SPIFFE and Kubernetes workload identities
- Python 3, shell, `curl`, `jq`, and `date`

## Sources Consulted
- [Fulcio OIDC requirements and identity mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Fulcio OID directory and token-claim mappings](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio identity configuration](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/identity/config.yaml)
- [Fulcio issuer configuration and verifier construction](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/config/config.go)
- [Fulcio CI-provider template processing](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/identity/ciprovider/principal.go) and [email identity processing](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/identity/email/principal.go)
- [Fulcio API schema for issuer configuration and challenge claims](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/fulcio.proto) and [Fulcio proof-of-possession specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Fulcio dependency manifest](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/go.mod), confirming `go-oidc` v3.20.0
- [`go-oidc` v3.20.0 discovery behavior](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/oidc.go), [issuer/audience/time verification](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go), and [JWKS key selection](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/jwks.go)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html), [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html), and [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) and [GitHub's immutable subject-claim rollout](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)
- [GitHub Actions Toolkit OIDC API](https://github.com/actions/toolkit/blob/main/packages/core/README.md#oidc-token), [Cosign OIDC provider selection](https://github.com/sigstore/cosign/blob/main/internal/auth/auth.go), and [Cosign's GitHub provider](https://github.com/sigstore/cosign/blob/main/pkg/providers/github/github.go)
- [Python `base64` documentation](https://docs.python.org/3/library/base64.html), [Python `json` documentation](https://docs.python.org/3/library/json.html), [curl manual](https://curl.se/docs/manpage.html), and [jq manual](https://jqlang.org/manual/)

## Issues Found
1. **Proof-of-possession wording implied that a private key is submitted** - Fulcio receives a public key or a CSR; the requester retains the corresponding private key. Updated the introduction, challenge explanation, and checklist to state that the proof must use the private key corresponding to the submitted public key.
2. **The discovery command produced a double slash for a trailing-slash issuer** - The post correctly treated a trailing slash as part of the issuer identity, but `"$OIDC_ISSUER/.well-known/openid-configuration"` constructed the wrong discovery path when that slash was present. Changed it to `"${OIDC_ISSUER%/}/.well-known/openid-configuration"` and clarified that this removes the slash only for discovery URL construction, not issuer comparison.
3. **The issuer instructions omitted Fulcio's wildcard `meta-issuers` path** - Exact `oidc-issuers` entries are not the only supported lookup mechanism. Added the configured `meta-issuers` pattern case while retaining the requirement that the concrete token and discovery issuer values match exactly.
4. **The GitHub audience wording was too narrow and the Toolkit example omitted asynchronous handling** - GitHub's default audience is the repository owner's URL, and that owner can be a user or organization. Replaced “organization audience” with “repository-owner audience” and changed the executable Toolkit example to `await core.getIDToken('sigstore')`.
5. **The `iat` statement blurred the documented contract and current enforcement** - Fulcio documents `iat` as required, but its pinned `go-oidc` v3.20.0 verifier does not reject a missing, old, or future `iat`. Clarified both the documented requirement and the current implementation behavior.
6. **The JWS key-ID checks incorrectly made `kid` mandatory** - `go-oidc` can try every suitable issuer key when a token omits `kid`. Updated the header guidance and checklist so `kid` must match a current issuer key only when it is present, while a JWKS key must still verify the signature.
7. **Provider-specific field names were imprecise** - Replaced the generic GitHub “runner” wording with the actual `runner_environment` claim, normalized the other claim names, and identified Fulcio's supported `skip-email-verification: true` setting and its trusted-private-issuer constraint.

## Review Notes
- The review used Fulcio main commit `2a7ebbb7b5787335588a8f41c54a40ff4507f47c` from 2026-08-24. That revision pins `github.com/coreos/go-oidc/v3` v3.20.0; the five-minute `nbf` leeway and lack of `iat` enforcement are version-specific implementation details.
- The local Python decoder was executed successfully against a sample compact JWS. It intentionally decodes only the header and payload and does not authenticate the token, which the post now consistently emphasizes.
- The macOS/BSD and GNU `date` fallback was checked, and the sample value `1787652300` resolves to 2026-08-25 10:05:00 UTC.
- The July 15, 2026 GitHub immutable-subject rollout details match current GitHub documentation and do not apply to GitHub Enterprise Server.
