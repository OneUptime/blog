# Validation Summary: How to Configure a Private Fulcio Instance with Your Own OIDC Issuer

## Status

validated

## Post Type

Technical guide/tutorial

## Technologies Covered

- Fulcio
- Sigstore
- OpenID Connect (OIDC) and JWT ID tokens
- Cosign v3
- Private PKI and KMS-backed certificate authorities
- Certificate Transparency (CT) and Rekor
- CI/CD workload identities and claim templates
- TUF, Sigstore trusted-root documents, and signing-configuration documents

## Sources Consulted

- [OpenID Connect Core 1.0, Section 2: ID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [Fulcio OIDC integration guide](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/oidc.md)
- [Fulcio identity configuration example](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/identity/config.yaml)
- [Fulcio configuration schema and validation](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/config/config.go)
- [Fulcio CI-provider claim and template implementation](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/identity/ciprovider/principal.go)
- [Fulcio email identity and federated issuer-claim implementation](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/identity/email/principal.go)
- [Fulcio server flags and startup behavior](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/cmd/app/serve.go)
- [Fulcio HTTP listener implementation](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/cmd/app/http.go)
- [Fulcio v2 API and configuration endpoint](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/fulcio.proto)
- [Sigstore OID and CI claim requirements](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/oid-info.md)
- [Fulcio setup and signing-backend guidance](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/setup.md)
- [Fulcio architecture specification](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/fulcio-spec.md)
- [go-oidc v3.20.0 token verification](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go)
- [Cosign custom-component configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign Fulcio option deprecation](https://github.com/sigstore/cosign/blob/58aae9e112fa1de80594eed34667e920ac4d4a3b/cmd/cosign/cli/options/fulcio.go)
- [Cosign certificate identity and issuer options](https://github.com/sigstore/cosign/blob/58aae9e112fa1de80594eed34667e920ac4d4a3b/cmd/cosign/cli/options/certificate.go)

## Issues Found

- The minimum OIDC claim list and email-token example omitted `sub`, even though OpenID Connect Core requires it in an ID token. Added `sub` to both places so the example is standards-compliant.
- The phrase “effective issuer” blurred two different values: Fulcio authenticates and discovers the provider using the standard `iss`, while email-only `issuer-claim` changes the issuer embedded in the certificate. Reworded the OIDC contract to refer explicitly to the token's standard `iss` and the configured issuer URL.
- The `ca-cert` wording did not make clear that the field contains PEM certificate data rather than a filesystem path. Clarified the expected value.
- The negative test claimed every not-yet-valid token is rejected. Fulcio currently pins go-oidc v3.20.0, which permits five minutes of clock skew for `nbf`; updated the explanation and test case to reflect that allowance.
- The multiline Fulcio launch example lacked shell continuations, so it was not executable as a shell command. Changed it to a Bash block with continuations. Also documented that Fulcio's HTTP listener is plaintext and therefore needs TLS termination before external exposure, while an exposed gRPC listener needs its TLS flags.
- The public configuration endpoint exposes issuer configuration but not CI templates, CA settings, or CT settings. Narrowed the instruction to checking the expected issuer, audience, and type there; the post's issuance tests remain necessary for the rest.
- Current Cosign v3 deprecates `--fulcio-url` in favor of a signing configuration. Replaced the old framing and distinguished the signing-configuration document used by signing hosts from the authenticated trusted-root material used by verification hosts.

## Review Notes

- The review used Fulcio main commit `2a7ebbb7b5787335588a8f41c54a40ff4507f47c` from 2026-08-24 and Cosign main commit `58aae9e112fa1de80594eed34667e920ac4d4a3b` from 2026-08-19. The post correctly advises pinning a deployed release because these schemas and flags can change.
- The email, generic CI, SPIFFE, Kubernetes, URI, and username identity descriptions match the reviewed Fulcio implementations. The caveat around `skip-email-verification` remains appropriate because release support must be checked before use.
- The CI extension names, YAML anchors, template behavior, missing-claim failure, and claim-over-default precedence are correct.
- The KMS CA flags, CT flags, `/api/v2/configuration` endpoint, exact Cosign identity/issuer policy, private trust bootstrap, and TUF/trusted-root guidance are current.
- All eight external links in the post's Official Documentation section returned HTTP 200 during review.
- The exact CI YAML snippet parsed and passed Fulcio's configuration validation. Relevant upstream Fulcio tests also passed: `go test ./pkg/config ./pkg/identity/ciprovider ./pkg/identity/email ./pkg/identity/spiffe ./pkg/identity/kubernetes ./pkg/identity/uri ./pkg/identity/username`.
