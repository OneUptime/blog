# Validation Summary: Investigate Fulcio GitLab Signing Failures with Empty ci_config_ref_uri

## Status
validated

## Post Type
Technical troubleshooting guide with a Python diagnostic example.

## Technologies Covered
- Sigstore Fulcio and CI-provider identity templates
- GitLab CI/CD and OIDC ID tokens
- JWT/JWS and Base64url encoding
- Python standard library (`base64`, `json`, and `pathlib`)
- Certificate SANs, provenance extensions, and Cosign verification

## Sources Consulted
- Fulcio issue 2189, including the original error and closure discussion: https://github.com/sigstore/fulcio/issues/2189
- GitLab ID-token authentication and claim reference: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- Fulcio upstream identity configuration: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- Fulcio CI-provider implementation: https://github.com/sigstore/fulcio/blob/main/pkg/identity/ciprovider/principal.go
- Raw CI-provider source for direct inspection: https://raw.githubusercontent.com/sigstore/fulcio/main/pkg/identity/ciprovider/principal.go
- GitLab Sigstore signing and verification guidance: https://docs.gitlab.com/ci/yaml/signing_examples/
- Sigstore signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Python Base64 documentation: https://docs.python.org/3/library/base64.html
- Python JSON documentation: https://docs.python.org/3/library/json.html
- Python pathlib documentation: https://docs.python.org/3/library/pathlib.html
- RFC 7515, compact JWS serialization and Base64url encoding: https://www.rfc-editor.org/rfc/rfc7515

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and includes executable diagnostic code.
- Confirmed that issue 2189 reports a missing-key template error and was closed on March 9, 2026, with a comment crediting a GitLab fix. The post correctly avoids claiming that this resolved every pipeline context or naming an unverified fixed GitLab release.
- Confirmed that GitLab documents both configuration claims as null unless the pipeline definition is in the same project. The example configuration URI omits the scheme. Comparing deployed-version documentation and testing fork/merge-request contexts remains appropriate.
- Confirmed that the upstream GitLab mapping prefixes the configuration URI with `https://` for the SAN, build-signer URI, and build-config URI. Both associated digest mappings use `ci_config_sha`.
- Inspected the CI-provider implementation: templates use `missingkey=error`, token claims override configured defaults, and SAN parsing follows template evaluation. Missing, null, and empty claims are not interchangeable. Null is stringified by the inspected implementation; an empty string need not produce the missing-key error. The post appropriately avoids promising identical failure behavior and calls for inspecting the issued certificate.
- Extracted and compiled the exact Python example, then executed it with synthetic token payloads covering missing claims, null, empty strings, whitespace-only strings, nonempty strings, integers, booleans, lists, and objects. All nine cases produced the expected output for all three inspected claims. Also verified rejection of a token without three compact segments.
- The diagnostic groups whitespace-only values with empty strings. It reports states and type names without printing claim values. It is deliberately a decoder, not a signature verifier or comprehensive malformed-input validator. No real credentials were used during testing.
- Verified that issuer/identity checks and selection of the intended trust roots are consistent with Sigstore verification guidance. Avoiding fabricated identity defaults is appropriate because those values become certificate identity and provenance metadata.
- All four technical links in the post resolved to the intended resources. The Python APIs used are supported standard-library APIs; the post contains no CLI commands or standalone configuration snippets requiring execution.
- No live GitLab pipeline, Fulcio deployment, certificate issuance, or artifact verification was performed. Deployment-specific behavior still requires the canary and negative-context checks described in the post. Upstream main-branch source and unversioned documentation can change after this review.
