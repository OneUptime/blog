# How to Check Whether a Container Image Verifier Supports Fulcio URI Identities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Cosign, Security, Troubleshooting

Description: Determine whether an image verification stack can match Fulcio URI SANs, distinguish policy-schema limitations from invalid certificates, and test identity enforcement end to end.

A container image signature can verify with Cosign and fail in another image consumer because the two verifiers support different certificate identities. A policy field named `subjectEmail` does not necessarily accept a GitHub workflow URI. Replacing that field's value with a URL cannot add support that the verifier does not implement.

Fulcio's [certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md) permits identity in different Subject Alternative Name forms, including email and URI. CI workflow identities commonly use a URI SAN. The certificate subject can be empty, so checking only the subject common name misses the relevant identity entirely.

## Inspect the actual signing certificate

Use the leaf certificate associated with the image digest and signature you are diagnosing. Keep the image reference immutable so a tag moving between attempts does not change the test input.

```bash
openssl x509 -in certificate.pem -noout \
  -subject -issuer -ext subjectAltName
```

An illustrative workflow identity might be:

```text
URI:https://github.com/example-org/service/.github/workflows/release.yml@refs/heads/main
```

Do not interpret the certificate's X.509 issuer name as its OIDC issuer. The latter is stored in Sigstore extensions and is a separate input to the trust decision. Use a library or established Sigstore verifier to decode and evaluate it.

## Read the exact verifier's policy schema

Identify the executable, package version, linked image library, and policy file actually used by the consumer. A container engine, image-copy tool, and admission controller may have different implementations even if all describe their feature as Sigstore verification.

For a concrete example, the current [containers/image policy reference](https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md) documents a `fulcio` requirement with mandatory `oidcIssuer` and `subjectEmail` fields. That documented schema is email-oriented; it does not document a URI subject selector in that object. Confirm the installed version and implementation before claiming URI support.

Do not assume the separate `pki` policy mode is interchangeable. Its trust and identity semantics are separately documented. Similarly, an image repository identity condition concerns the signed container reference, not the workload identity in the certificate SAN.

## Establish a reference verification result

For a publicly trusted GitHub Actions signature, Cosign's [verification guide](https://docs.sigstore.dev/cosign/verifying/verify/) documents issuer and identity constraints. A contextual command is:

```bash
cosign verify \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/example-org/service/.github/workflows/release.yml@refs/heads/main \
  registry.example.com/team/service@sha256:REPLACE_WITH_REAL_DIGEST
```

Replace the identity and digest with your expected values. A private Fulcio deployment also requires the appropriate configured trust material. This command is a reference check, not a replacement for the policy enforced at deployment time.

If it fails, investigate the signature format, trust roots, transparency evidence, issuer, and identity first. If it succeeds while the target consumer rejects the same digest, compare the consumer's supported certificate identity types and signature retrieval configuration.

## Test support with negative cases

A successful pull alone is weak evidence. The consumer might have selected a permissive policy scope or skipped the signature requirement. Build a small matrix:

| Test artifact or policy | Required result |
|---|---|
| Expected URI signer and issuer | Accept |
| Different workflow URI | Reject |
| Same URI text under an untrusted issuer | Reject |
| Unsigned image | Reject |
| Signature for a different digest | Reject |

Run the tests through the actual deployment or image-copy path. Preserve the effective policy scope and rejection reason. If the verifier cannot express the URI identity condition, record that as a capability limitation rather than treating every certificate as malformed.

## Choose a compatible enforcement path

Possible repairs include upgrading to a version with documented URI support, using a verifier that supports the required identity type at the deployment boundary, or changing the signing architecture under an explicitly reviewed policy. The right choice depends on what your runtime can enforce and how trust is distributed.

Avoid weakening the policy to accept any certificate under the Fulcio root. That allows identities other than the intended workflow. Do not transform a URI into a synthetic email address either; it changes the identity being authenticated and cannot rewrite the existing signed certificate.

Keep the capability test with your release process. A future package upgrade may add URI matching while also changing signature format or attachment handling. Repeating the positive and negative cases verifies the behavior you depend on, instead of relying on the broad claim that a tool supports Sigstore.
