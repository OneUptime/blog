# Validation Summary: How to Test a Custom OIDC Client Audience Across Sigstore Python and Fulcio

## Status
validated

## Post Type
Technical troubleshooting and integration testing guide.

## Technologies Covered
- Sigstore and sigstore-python
- Fulcio certificate authority
- OpenID Connect (OIDC), OAuth 2.0, and JWT audiences
- Python and command-line signing
- Private trust configuration and bundle verification

## Sources Consulted
- Official sigstore-python CLI reference: https://github.com/sigstore/sigstore-python#usage
- Official CLI implementation, including token acquisition and trust configuration loading: https://github.com/sigstore/sigstore-python/blob/main/sigstore/_cli.py
- Official IdentityToken implementation: https://github.com/sigstore/sigstore-python/blob/main/sigstore/oidc.py
- Official client trust configuration model: https://github.com/sigstore/sigstore-python/blob/main/sigstore/models.py
- Historical hardcoded-audience report: https://github.com/sigstore/sigstore-python/issues/1401
- Fulcio OIDC requirements and issuer-specific identity mappings: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- Fulcio configuration implementation, including client-id, verifier configuration, and published issuer audiences: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go
- Fulcio certificate request authentication and proof-of-possession handling: https://github.com/sigstore/fulcio/blob/main/pkg/server/grpc_server.go
- Fulcio identity authentication interface: https://github.com/sigstore/fulcio/blob/main/pkg/identity/issuer.go
- JWT audience definition, RFC 7519 section 4.1.3: https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.3
- Published sigstore package metadata: https://pypi.org/project/sigstore/

## Issues Found
- The server-side negative test did not explain how to get a wrong-audience token past the client's audience check. Added instructions to match the Python client ID to the negative token while retaining the original Fulcio configuration. This isolates server rejection from local parsing rejection.
- A token with a different audience can still be accepted if its audience array also contains Fulcio's expected client ID. Clarified that the negative token must exclude that client ID.

## Review Notes
- Reviewed all command flags and their placement against the official CLI implementation. The trust configuration is a JSON ClientTrustConfig containing trust material and signing configuration, rather than a standalone PEM certificate.
- Confirmed that IdentityToken accepts client_id, requires aud/sub/iat/exp/iss, checks audience and time, wraps parsing failures in IdentityError, and deliberately disables JWT signature verification. The synthetic token uses an unknown illustrative issuer, for which the implementation selects sub as the proof-of-possession identity.
- Confirmed that disabling ambient acquisition causes interactive issuer acquisition when no explicit identity token is supplied. Provider support still governs which audiences can be issued.
- The historical issue is closed and describes earlier behavior; current source supports custom client IDs. The post correctly recommends checking the installed version instead of extrapolating from the issue.
- The example domains, audience, artifact, and trust configuration are deployment-specific placeholders. Live signing, server rejection, and bundle verification were not executed because no private deployment, trust configuration, or genuine credentials were supplied.
- Referenced project links resolve to the intended resources. The author profile is attribution, not a technical source.
- The extracted Python fixture passed a syntax compilation check. Runtime execution could not be completed: isolated package installation did not finish, and invocation failed with ModuleNotFoundError for sigstore. API behavior and CLI options were therefore verified from official source and documentation, not claimed as successful runtime tests. The targeted git diff whitespace check passed, and both validation files passed structure/content checks.
