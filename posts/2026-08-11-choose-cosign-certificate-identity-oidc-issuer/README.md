# How to Choose Safe `--certificate-identity` and `--certificate-oidc-issuer` Values for Cosign Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Sigstore, OIDC, Image Verification, Supply Chain Security

Description: Build a narrow Cosign keyless-verification policy by deriving the expected signer identity and issuer from the producer's controlled OIDC workflow.

---

A valid keyless signature is not automatically an authorized signature. Fulcio can issue certificates to many identities from several identity providers. Cosign's `--certificate-identity` and `--certificate-oidc-issuer` options turn cryptographic verification into an authorization decision: this artifact must have been signed by this identity, authenticated by this issuer.

Safe values come from the producer's documented release process and an observed, reviewed certificate—not from trial and error until verification passes.

## Understand the two constraints

`--certificate-identity` matches the identity carried in the signing certificate. Cosign documents valid identities such as email addresses, DNS names, IP addresses, and URIs. In automated builds, it is commonly a URI that identifies a workflow definition and ref.

`--certificate-oidc-issuer` matches the OIDC issuer recorded for that certificate. It identifies the authority that authenticated the subject. The identity and issuer form a pair; neither should be treated as globally unique on its own.

For GitHub Actions, an exact policy commonly looks like this:

```bash
cosign verify \
  --certificate-identity="https://github.com/acme/payments/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  ghcr.io/acme/payments@sha256:REPLACE_WITH_DIGEST
```

For GitHub Actions, Fulcio constructs this URI from the signing job's `job_workflow_ref`. The string is case-sensitive and includes the workflow path and Git ref. For a signing job in a reusable workflow, it names the called workflow. Use the actual identity documented by the publisher; do not mechanically substitute a guessed repository name.

## Start from the trust statement

Write the policy in plain language before writing flags:

> Trust images for `ghcr.io/acme/payments` only when the signing job uses `.github/workflows/release.yml` at `refs/heads/main` in the `acme/payments` repository and authenticates with GitHub's Actions OIDC issuer.

Every variable in the command should follow from that sentence. If the organization also requires a particular source ref, trigger, environment, or reusable-workflow caller, write that explicitly and confirm whether each condition appears in the certificate identity or in a separate certificate extension.

The artifact publisher is the authority for its signer values. Prefer a verification section in its official release documentation. When bootstrapping your own producer, perform a controlled test release, preserve the raw verification result and verification material, inspect the certificate fields, and compare them with the intended OIDC claim policy before enabling enforcement.

## Prefer exact matches

Exact identity and issuer flags are safest because they have no pattern-expansion surprises:

```bash
EXPECTED_IDENTITY='https://github.com/acme/payments/.github/workflows/release.yml@refs/heads/main'
EXPECTED_ISSUER='https://token.actions.githubusercontent.com'

cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE_BY_DIGEST"
```

Keep these expected values in reviewed policy configuration, not in data supplied by the image or by an untrusted pull request. Otherwise an attacker could change both the signer and the alleged expectation.

## Use regular expressions only for a real policy need

Cosign provides `--certificate-identity-regexp` and `--certificate-oidc-issuer-regexp` using Go regular-expression syntax. A regex may be appropriate when several versioned release workflows are equally trusted, but it must be anchored and escape literal dots:

```bash
cosign verify \
  --certificate-identity-regexp='^https://github\.com/acme/payments/\.github/workflows/release-v[0-9]+\.yml@refs/heads/main$' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  "$IMAGE_BY_DIGEST"
```

Avoid these policies:

```text
--certificate-identity-regexp='.*'
--certificate-identity-regexp='^https://github\.com/acme/.*$'
--certificate-oidc-issuer-regexp='.*'
```

The first accepts every identity allowed by the accompanying issuer constraint; the third accepts the accompanying identity regardless of the OIDC issuer value in any otherwise valid certificate chaining to the trusted CA roots. Used together, they remove both identity and issuer authorization constraints. The organization-wide pattern may authorize unrelated repositories and workflows. Even a repository-wide pattern can accidentally trust pull-request, test, or dependency-update workflows that were never meant to release production artifacts.

If you need several known identities, it is often clearer to execute verification against an explicit allowlist or express multiple authorities in a policy engine rather than compressing them into a permissive regex.

## Identity discovery is not acceptance

During a controlled investigation, an operator may use broad matching to verify a candidate signature and then separately inspect its certificate or verification bundle. Treat the discovered identity and issuer as untrusted observations. Broad matching should never be the final gate, and its output must not automatically rewrite the allowlist.

A safer bootstrap process is:

1. Resolve and record the image digest through an authenticated channel.
2. Obtain the publisher's expected identity and issuer from official documentation.
3. Verify with those exact values.
4. Separately inspect the certificate and claims in the verification material and compare them with the source repository and release workflow.
5. Have a second reviewer approve the policy.
6. Test that a signature from a nearby but unauthorized workflow is rejected.

Negative tests matter. A policy that accepts the intended signer but also accepts an untrusted signer is broken.

## Account for branches, tags, and environments

GitHub's OIDC token includes claims describing repository, ref, event, workflow, and actor, plus an environment claim when the job references an environment. Fulcio derives the GitHub Actions certificate identity from `job_workflow_ref`; source-ref, event, repository, and environment information are recorded in separate certificate extensions. A protected environment does not by itself change the certificate identity, and the identity and issuer flags do not check those separate extensions.

If releases may be triggered by tags, confirm how the tag ref appears in the identity and source-ref extension for the real workflow, then constrain every value on which the policy depends. If a protected GitHub environment is the trust boundary, enforce environment reviewers and deployment-branch or tag rules, and make signing possible only in the environment-gated job. An identity and issuer check alone does not prove that environment protections ran. A certificate check cannot compensate for a repository configuration that lets untrusted contributors change the authorized workflow.

Reusable workflows require similar care. Because Fulcio derives the identity from `job_workflow_ref`, it names the called workflow; the caller repository, source ref, and top-level workflow are recorded separately. The identity and issuer flags alone cannot require both caller and called workflow, so use a policy capable of checking the required extensions. Test the real workflow rather than copying an identity string from an unrelated example.

## Separate public-good and private Sigstore roots

An organization may operate a private Fulcio and Rekor deployment. In that case the trusted CA roots, log keys, issuer, and identity namespace may all differ from the Sigstore public-good instance. Provide the intended Sigstore trusted root, including the relevant Fulcio CA certificates and, as applicable, Rekor, CT-log, and timestamp-authority trust material, and still constrain the identity and issuer:

```bash
cosign verify \
  --trusted-root=/etc/sigstore/acme-trusted-root.json \
  --certificate-identity='spiffe://build.acme.example/release/payments' \
  --certificate-oidc-issuer='https://issuer.acme.example' \
  "$IMAGE_BY_DIGEST"
```

Do not confuse a registry's TLS CA with the certificate authority used to validate signing certificates. `--registry-cacert` secures the HTTPS connection to the registry; `--trusted-root` supplies signing-certificate and Sigstore-service trust material. In Cosign v3.1.3, the direct `--certificate-chain`, `--ca-roots`, and `--ca-intermediates` verification inputs are deprecated in favor of `--trusted-root`; when Cosign selects the new-bundle verifier, CA trust must come from `--trusted-root` and those direct inputs are rejected.

## Policy review checklist

- [ ] The image reference is pinned to a digest.
- [ ] The publisher documents the expected signer identity and issuer.
- [ ] Exact matching is used unless a broader set is explicitly required.
- [ ] Every regex is anchored at both ends and regex metacharacters intended literally are escaped.
- [ ] The pattern names a specific trusted signing workflow; reusable-workflow callers are constrained separately.
- [ ] The complete policy rejects unauthorized pull-request or test callers, source refs, triggers, and environments.
- [ ] Expected values live in protected policy configuration.
- [ ] The policy has both positive and negative verification tests.
- [ ] GitHub branch, tag, environment, and workflow protections support the claimed boundary.
- [ ] Private Sigstore roots and registry TLS roots are configured separately.

## Official Documentation

- [Cosign verify command and identity flag definitions](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Sigstore verification guide](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore keyless quickstart](https://docs.sigstore.dev/quickstart/quickstart-cosign/)
- [GitHub Actions OIDC token claims](https://docs.github.com/en/actions/reference/security/oidc)
- [Fulcio certificate issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)

## Conclusion

Choose identity and issuer values by translating an explicit release trust statement into exact certificate constraints. Keep the pair narrow, protect the configuration that supplies it, and prove with negative tests that nearby repositories and workflows are rejected. Cryptography establishes who signed; these flags decide whether the certificate identity and issuer are authorized, while additional release claims require separate enforcement.
