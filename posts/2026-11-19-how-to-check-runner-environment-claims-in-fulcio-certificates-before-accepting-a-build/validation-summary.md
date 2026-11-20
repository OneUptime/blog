# Validation Summary: Check Runner Environment Claims in Fulcio Certificates Before Accepting Builds

## Status

validated

## Post Type

Technical guide with Python certificate inspection and acceptance-policy examples.

## Technologies Covered

- Sigstore and Fulcio certificate extensions
- GitHub Actions OIDC and provider-specific CI runner claims
- CircleCI identity mappings
- Python, cryptography, and pyasn1
- X.509, ASN.1 DER, and artifact signature verification
- CI/CD release and admission policies

## Sources Consulted

- Fulcio OID documentation: https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md
- Fulcio provider identity templates: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- GitHub Actions OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- cryptography X.509 reference: https://cryptography.io/en/latest/x509/reference/
- pyasn1 DER codec reference: https://pyasn1.readthedocs.io/en/latest/pyasn1/codec/der/contents.html
- Python pathlib reference: https://docs.python.org/3/library/pathlib.html#pathlib.Path.read_bytes
- Sigstore signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Author profile link: https://github.com/nawazdhandala

## Issues Found

No technical issues found.

## Review Notes

- Confirmed runner environment OID `1.3.6.1.4.1.57264.1.11` and its DER-encoded universal UTF8String representation. Provider values are not universally standardized.
- Confirmed GitHub's issuer URL and the exact `github-hosted` and `self-hosted` runner values. The upstream GitHub template maps `runner_environment`; CircleCI handles SSH reruns with a different mapping.
- Both Python snippets compile. The documented certificate loading, extension lookup, raw extension bytes, and DER decoding APIs support the inspection example. Missing extensions raise `ExtensionNotFound`; decoding errors propagate, and the explicit check rejects empty values and trailing data.
- The allowlist uses exact issuer and runner matches. `verified_issuer` denotes the authenticated OIDC issuer, rather than the certificate CA's X.509 issuer name. Missing string values represented by `None` or an empty string are rejected.
- The post correctly requires certificate and artifact-signature verification before trusting extension data, preserves signer-identity checks, and distinguishes a runner claim from build provenance or workflow protection. The runner predicate alone does not check signer identity.
- No terminal commands or deployable configuration snippets are present. The Python APIs used are not marked deprecated in the consulted documentation, and the post makes no release-specific compatibility promise.
- All referenced links resolve to the intended resources; the author's www.github.com URL redirects to github.com. Upstream main and latest documentation links are mutable, so deployment-specific mapping verification remains necessary as described in the post.
- No live Fulcio issuance, staging workflow, or admission-controller integration was exercised. README.md was left unchanged.
- Executed eight allowlist cases successfully: the approved pair and rejection of self-hosted, missing, empty, differently cased, unknown runner, unknown issuer, and missing issuer inputs. Certificate fixture execution could not complete because the isolated dependency installation did not finish; certificate API behavior was checked against official documentation.
