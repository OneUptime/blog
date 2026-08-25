# Validation Summary: Verify a Fulcio Certificate's GitHub Workflow with Build Signer OIDs

## Status

validated

## Post Type

Technical guide and security verification reference

## Technologies Covered

- Fulcio and Sigstore keyless signing
- GitHub Actions and reusable workflows
- OpenID Connect (OIDC) claims
- X.509 certificates and Sigstore private-enterprise OIDs
- Cosign v3 signature verification
- Sigstore standardized JSON bundles
- `jq` and OpenSSL command-line tools
- CI/CD and software supply-chain policy

## Sources Consulted

- [Fulcio OID directory](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/oid-info.md)
- [Fulcio GitHub identity and extension templates](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/identity/config.yaml)
- [Fulcio certificate extension constants and DER renderer](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/certificate/extensions.go)
- [Fulcio OIDC requirements and GitHub SAN mapping](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/oidc.md#github)
- [Fulcio's reviewed dependency versions](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/go.mod) and [go-oidc v3.20.0 token verifier](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go)
- [GitHub Actions OIDC claim reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions job workflow identity context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context)
- [GitHub OIDC behavior with reusable workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows)
- [GitHub reusable-workflow reference syntax](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#calling-a-reusable-workflow)
- [Sigstore standardized bundle protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto) and [common X.509 protobuf types](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_common.proto)
- [Cosign v3.1.3 `verify` command reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md) and [v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign signature verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore client verification requirements](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [`jq` manual](https://jqlang.org/manual/)
- [OpenSSL `base64`/`enc` documentation](https://docs.openssl.org/3.6/man1/openssl-enc/) and [OpenSSL `x509` documentation](https://docs.openssl.org/3.6/man1/openssl-x509/)
- [IANA Private Enterprise Numbers registry entry for Sigstore](https://www.iana.org/assignments/enterprise-numbers/?page=573)

## Issues Found

- The post said that `iat` was used to validate the token alongside `aud`, `exp`, and optional `nbf`. Fulcio's current go-oidc verifier records the issued-at value but does not enforce it as a validity check. The sentence now distinguishes the claims that participate in validation from `iat`, which records issuance time, while retaining the correct point that none has a dedicated certificate extension.
- The reusable-workflow upgrade guidance referred to an exact `@v4` certificate URI. GitHub's `job_workflow_ref` is a full ref, so a reusable workflow selected through the `v4` tag appears in the SAN and Build Signer URI as `@refs/tags/v4`. The explanation and release-channel policy example now use the exact certificate value.

## Review Notes

- The Fulcio review used main commit `2a7ebbb7b5787335588a8f41c54a40ff4507f47c` from 2026-08-24, and the Cosign checks used v3.1.3, the current release on the validation date.
- The bundle extraction pipeline was run successfully against an official Cosign v3.1.3 public-infrastructure bundle. Its v0.3 single-certificate path and the v0.1/v0.2 leaf-first chain fallback match the standardized schema.
- OpenSSL 3.6.2 testing confirmed the empty subject, Code Signing extended key usage, and punctuation-prefixed display of DER-encoded UTF8String extension values described in the post.
- GitHub's `sha` and `ref` values are event-dependent; for example, pull-request runs may report a synthetic merge ref and SHA. The post correctly avoids treating them as necessarily the checked-out PR head by calling them the run-triggering revision and requiring a separate artifact-to-source binding.
- GitHub changed the default `sub` format for repositories created after July 15, 2026 to include immutable owner and repository IDs. The post remains correct because it describes `.1.24` as the raw subject and makes no assumption about its format.
- All links in the post's Official Documentation section resolved to their intended current pages.
