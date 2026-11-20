# Validation Summary: How to Check Whether a New CI Provider Is Trusted by the Public Fulcio Service

## Status
validated

## Post Type
Technical guide with a runnable shell example.

## Technologies Covered
- Sigstore and the public Fulcio certificate authority
- OpenID Connect (OIDC), JWT claims, discovery, and JWKS
- CI/CD provider identity mapping and onboarding
- Cosign keyless signing and identity-based verification
- X.509 subject alternative names (SANs) and certificate extensions
- Shell commands, curl, and jq

## Sources Consulted
- [Live public Fulcio configuration](https://fulcio.sigstore.dev/api/v2/configuration): fetched successfully with curl and inspected with the post's jq filter.
- [Fulcio configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go): issuer selection, wildcard forms, audience configuration, and API response construction.
- [Fulcio OIDC integration guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md): CI provider metadata, claim templates, SAN design, and provider-name matching.
- [Fulcio new identity-provider requirements](https://github.com/sigstore/fulcio/blob/main/docs/new-idp-requirements.md): admission criteria and issue-before-PR process.
- [Codeberg Actions onboarding issue #2442](https://github.com/sigstore/fulcio/issues/2442): the reported distinction between obtaining a CI token and having its issuer trusted by public Fulcio.
- [OpenID Connect Core 1.0, ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation): issuer, audience, signature, and expiration validation.
- [Sigstore signature verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/): verification using expected certificate identity and OIDC issuer.
- [curl manual](https://curl.se/docs/manpage.html): --fail, --silent, and --show-error behavior.
- [jq manual](https://jqlang.org/manual/): array iteration, object construction shorthand, and field selection.

## Issues Found
- The text instructed readers to save the configuration response with a timestamp, but the example only saved the JSON response. Added a UTC timestamp in fulcio-configuration-fetched-at.txt after a successful curl request, using && so a failed fetch does not generate a new success timestamp. The existing JSON filename and jq filter remain unchanged.

## Review Notes
- The live response contained 27 issuer entries: 18 fixed issuer entries and 9 wildcard entries. The example's five field names matched the response, and jq correctly returned null for the unused issuer URL form. All observed audiences were sigstore. These observations describe the response during review and are not guarantees of future deployment state.
- Verified that wildcard matching is implementation-defined and that the API response is configuration evidence, not proof of successful issuance. Public, staging, and private deployments must be assessed separately.
- Confirmed the CI metadata naming rule, SAN and extension template guidance, and admission requirements against Fulcio's official sources. The article correctly separates source changes, onboarding requests, deployed configuration, and successful workflow tests.
- The Codeberg issue supports the historical example. It is a report of an integration failure, not an independent issuance test or a permanent support statement.
- Reviewed the distinction between decoding JWT claims and authenticating a token, and the need for identity-specific verification and negative policy tests. In the canary discussion, issuer means the certificate's OIDC issuer extension, rather than its X.509 CA issuer distinguished name.
- Executed the configuration fetch and jq projection against the public endpoint and checked the UTC timestamp command locally. No CI credentials were supplied, so certificate issuance, artifact signing, and positive or negative end-to-end verification were not executed.
- The linked technical resources resolved. The post does not pin a Fulcio or Cosign version; upstream main-branch documentation and the live deployment can change. No deprecated command options were found in the example.
