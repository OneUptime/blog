# How to Verify the Exact CI Workflow Behind a Fulcio Certificate Using Build Signer OIDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, GitHub Actions, OIDC, X.509, Cosign, CI/CD, Supply Chain Security

Description: Distinguish the executing workflow, initiating workflow, source repository, and immutable revisions in a GitHub Fulcio certificate using its SAN and modern Build Signer OID extensions.

---

A valid Fulcio certificate proves that an accepted OIDC issuer authenticated a workload. It does not automatically prove that the workload was the one your release policy intended. For GitHub Actions, verify the certificate's issuer and SAN, then use the modern Fulcio extensions to distinguish the executing build instructions, the initiating workflow, the source repository, and their immutable revisions.

The most important fields are Build Signer URI (`1.3.6.1.4.1.57264.1.9`) and Build Signer Digest (`1.3.6.1.4.1.57264.1.10`). They are part of the provider-neutral extension suite that replaces the older GitHub-only workflow OIDs.

## Understand the Two Workflow Identities

GitHub supplies both `job_workflow_ref` and `workflow_ref` claims. Fulcio's current public configuration maps them differently:

- `job_workflow_ref` becomes the certificate SAN and Build Signer URI. It identifies the workflow instructions responsible for the signing job. In a reusable-workflow design, this is the reusable workflow.
- `job_workflow_sha` becomes Build Signer Digest. It immutably identifies the revision of those build instructions.
- `workflow_ref` becomes Build Config URI. It identifies the top-level or initiating workflow.
- `workflow_sha` becomes Build Config Digest. It immutably identifies the initiating workflow revision.

For a simple workflow that does not delegate to a reusable workflow, the signer and build-config identities can describe the same file and revision. When a caller invokes a central reusable release workflow, they deliberately diverge. A policy that checks only one answers only half the question.

## Know the Modern GitHub Mapping

Current Fulcio maps GitHub token claims as follows:

| Fulcio OID | Extension | GitHub source |
| --- | --- | --- |
| `.1.8` | Issuer V2 | `iss` |
| `.1.9` | Build Signer URI | `https://github.com/` + `job_workflow_ref` |
| `.1.10` | Build Signer Digest | `job_workflow_sha` |
| `.1.11` | Runner Environment | `runner_environment` |
| `.1.12` | Source Repository URI | `https://github.com/` + `repository` |
| `.1.13` | Source Repository Digest | `sha` |
| `.1.14` | Source Repository Ref | `ref` |
| `.1.15` | Source Repository Identifier | `repository_id` |
| `.1.16` | Source Repository Owner URI | `https://github.com/` + `repository_owner` |
| `.1.17` | Source Repository Owner Identifier | `repository_owner_id` |
| `.1.18` | Build Config URI | `https://github.com/` + `workflow_ref` |
| `.1.19` | Build Config Digest | `workflow_sha` |
| `.1.20` | Build Trigger | `event_name` |
| `.1.21` | Run Invocation URI | repository Actions run URL plus attempt |
| `.1.22` | Source Repository Visibility at Signing | `repository_visibility` |
| `.1.23` | Deployment Environment | `environment` when present; extension omitted otherwise |
| `.1.24` | Token Subject | raw `sub` |

All of these OIDs begin with Sigstore's private enterprise number `1.3.6.1.4.1.57264`. The short `.1.x` notation in the table is only an abbreviation.

The `aud` and `exp` claims, plus `nbf` when present, participate in token validation; `iat` records the token's issuance time. None is copied to a dedicated certificate extension. Do not expect to recover the original JWT or its complete claim set from the certificate.

## Inspect a Standardized Bundle

For standardized JSON bundles, extract the leaf certificate while supporting both the v0.3 single-certificate representation used by current Cosign v3 public-infrastructure bundles and the v0.1/v0.2 chain representation:

```bash
jq -er '
  .verificationMaterial.certificate.rawBytes //
  .verificationMaterial.x509CertificateChain.certificates[0].rawBytes
' release.sigstore.json |
  tr -d '\n' |
  openssl base64 -d -A > fulcio-leaf.der

openssl x509 -inform DER -in fulcio-leaf.der -out fulcio-leaf.pem
openssl x509 -in fulcio-leaf.pem -noout -text
```

Look for an empty Subject, a URI SAN, code-signing extended key usage, the issuer OID, and the applicable OIDs in the `.1.9` through `.1.24` range; `.1.23` is absent when the job has no deployment environment. Modern values are DER-encoded UTF8String values. `openssl x509 -text` exposes their readable contents beneath the numeric OIDs, but often prefixes them with punctuation representing the DER tag and length bytes; treat this as inspection output, not exact parsing.

For example, the relevant evidence might be:

```text
SAN / Build Signer URI:
  https://github.com/platform/release-workflows/.github/workflows/sign.yml@refs/tags/v4

Build Signer Digest:
  7d3f...f291

Build Config URI:
  https://github.com/acme/widget/.github/workflows/release.yml@refs/tags/v1.8.0

Build Config Digest:
  a404...9c0d

Source Repository URI:
  https://github.com/acme/widget

Source Repository Digest:
  a404...9c0d
```

This says that `acme/widget` initiated a release through its top-level workflow, but the signing job executed trusted instructions from `platform/release-workflows`. It does not say those mutable references still point to the same commits today; the digest extensions preserve the issuance-time revisions.

## Build a Strong Verification Policy

Start with normal Sigstore cryptographic verification. The following example uses GitHub.com's default issuer. Since GitHub's SAN is the Build Signer URI, an exact Cosign identity check validates the executing workflow identity:

```bash
cosign verify \
  --certificate-oidc-issuer \
    'https://token.actions.githubusercontent.com' \
  --certificate-identity \
    'https://github.com/platform/release-workflows/.github/workflows/sign.yml@refs/tags/v4' \
  'ghcr.io/acme/widget@sha256:REPLACE_WITH_DIGEST'
```

This validates the artifact signature and Sigstore verification material as well as identity. Reading an OID with OpenSSL alone does none of those cryptographic checks.

For higher assurance, the policy should assert a tuple rather than one string:

| Policy dimension | Recommended certificate evidence |
| --- | --- |
| OIDC authority | Issuer V2 equals the exact expected GitHub issuer; the default is `https://token.actions.githubusercontent.com` |
| signing implementation | Build Signer URI equals the approved reusable workflow |
| immutable signer revision | Build Signer Digest is an allowlisted commit SHA |
| caller | Build Config URI matches the approved top-level workflow |
| immutable caller revision | Build Config Digest is reviewed or resolves to the protected release commit |
| source | Source Repository URI and immutable repository ID match the intended repository |
| source revision | Source Repository Digest equals the expected run-triggering revision |
| trigger | Build Trigger and Source Repository Ref match release policy |
| execution | Runner Environment is allowed; Run Invocation URI is retained for investigation |

Cosign's `--certificate-identity` and issuer flags express the SAN/issuer portion. If your decision depends on arbitrary extension values, use a verifier or policy layer that parses the authenticated X.509 extensions and fails closed. Do not parse `cosign verify`'s display text with a loose regular expression and call that enforcement.

## Prefer Digests and Immutable IDs

A URI ending in `@refs/heads/main` is reviewable but mutable. Build Signer Digest and Build Config Digest state which commits backed those workflow files at issuance. Repository and owner numeric identifiers remain stable across renames, while repository URLs are easier for humans to understand.

A practical policy often checks both:

- readable URI for the expected organization, repository, and workflow path;
- immutable repository/owner identifier to survive or detect renames;
- immutable workflow digest against an allowlist, release commit, or reviewed provenance statement; and
- source digest against the expected run-triggering revision, with the trusted workflow or provenance binding the artifact to that source.

Do not assume every provider formats a digest as a bare hexadecimal SHA. Fulcio's OID guide explicitly allows providers to emit provider-specific formats. Apply GitHub-specific formatting rules only after pinning the GitHub issuer.

## Handle Reusable Workflow Upgrades

If callers reference a reusable workflow as `@v4` and GitHub resolves `v4` as a tag, the SAN and Build Signer URI end in `@refs/tags/v4` while Build Signer Digest changes when the tag moves. Decide whether this is acceptable:

- **Release-channel trust:** allow the `@refs/tags/v4` URI and require the digest to be reachable from the protected `v4` release policy.
- **Immutable trust:** call the reusable workflow by commit SHA and require that exact SHA.
- **Controlled rotation:** maintain an allowlist of reviewed signer digests and remove old entries only after all artifacts needing verification remain supportable.

Do not require the current target of a mutable ref to equal an old certificate's signer digest forever; that would make historical releases fail after a legitimate workflow update. Evaluate the digest against issuance-time release records or a versioned allowlist.

## Avoid the Deprecated GitHub-Only OIDs

Fulcio OIDs `.1.2` through `.1.6` contain GitHub trigger, SHA, workflow name, repository, and ref. They are deprecated in favor of provider-generic extensions starting at `.1.8`. The old workflow name is mutable and is not the same thing as a workflow file identity.

Fulcio's current GitHub configuration still emits the deprecated fields for compatibility, and historical certificates can contain them, so archival verifiers may need compatibility logic. New policy should prefer Build Signer, Build Config, Source Repository, and Token Subject extensions. Do not reject an old artifact solely because a modern field did not exist when its valid certificate was issued; version the policy by certificate or log time.

## Official Documentation

- [Fulcio OID directory and CI provider claim mapping](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Current Fulcio GitHub extension templates](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Fulcio GitHub OIDC requirements and SAN mapping](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md#github)
- [GitHub Actions OIDC claim reference](https://docs.github.com/en/actions/reference/security/oidc)
- [Cosign signature verification](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore client verification requirements](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)

## Conclusion

For GitHub Actions, the SAN and Build Signer URI identify the executing workflow, while Build Config fields identify its caller and Source Repository fields identify the source context GitHub reported for the run. Verify the GitHub issuer, exact signer URI, and immutable digests as one policy tuple—especially when reusable workflows separate the release caller from the signing implementation.
