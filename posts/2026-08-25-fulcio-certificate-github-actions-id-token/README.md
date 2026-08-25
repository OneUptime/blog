# How to Request a Fulcio Certificate from GitHub Actions with id-token: write

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Cosign, GitHub Actions, OIDC, Container Signing, CI/CD

Description: Use least-privilege GitHub Actions permissions and a patched Cosign release to request a sigstore-audience OIDC token, sign an immutable image digest, and verify the exact workflow identity.

---

GitHub Actions can request a short-lived OIDC ID token without storing a signing secret. Cosign detects the Actions environment, requests a token with audience `sigstore`, creates an ephemeral key, asks Fulcio for a certificate, signs the artifact, and records the result in Sigstore's transparency services.

The permission that enables this is `id-token: write`. Despite the word `write`, it does not grant repository write access; it only permits the job to request an OIDC token. Registry pushes and source checkout need separate permissions.

## Grant Permissions to One Signing Job

Set a restrictive default and enable only what the release job needs:

```yaml
name: Build and sign

on:
  push:
    tags:
      - 'v*'

permissions: {}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write

    steps:
      - name: Check out source
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - name: Install a patched Cosign
        uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2
        with:
          cosign-release: v3.1.3

      - name: Log in to GHCR
        uses: docker/login-action@dbcb813823bdd20940b903addbd779551569679f # v4.6.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a # v7.3.0
        with:
          context: .
          push: true
          tags: ghcr.io/example/widget:${{ github.ref_name }}

      - name: Sign the pushed digest
        env:
          IMAGE: ghcr.io/example/widget
          DIGEST: ${{ steps.build.outputs.digest }}
        run: cosign sign --yes "$IMAGE@$DIGEST"
```

Update action versions and immutable commit pins with your dependency-management process. The explicit Cosign version above is significant as of August 2026: the official Cosign advisory for the legacy-bundle identity-verification vulnerability requires v3.1.3 or v2.6.5. The standardized bundle path is not affected, but signing and verification runners should still use a patched release.

For repositories other than `ghcr.io/example/widget`, change the image name and ensure the token has permission to push there. `packages: write` is required for GHCR publication, not for requesting Fulcio's certificate.

## Sign the Digest, Not the Tag

A tag can be moved between build and signing. The Docker build action exposes the immutable pushed digest, so pass `IMAGE@sha256:...` to Cosign.

Do not reconstruct the digest from a tag later and assume it still resolves to the build output. Keep the digest as a step output, quote the complete reference, and avoid executing untrusted text when constructing shell variables.

For a blob rather than an image, preserve the standardized bundle:

```yaml
- name: Sign release archive
  env:
    ARCHIVE: dist/widget.tar.gz
  run: cosign sign-blob "$ARCHIVE" --bundle "$ARCHIVE.sigstore.json" --yes
```

Publish the bundle beside the archive. A detached signature without its certificate and transparency material is not enough for normal identity-based verification.

## What GitHub and Cosign Do

With `id-token: write`, GitHub exposes two runner variables to authorized steps: `ACTIONS_ID_TOKEN_REQUEST_URL` and `ACTIONS_ID_TOKEN_REQUEST_TOKEN`. A requester calls the URL with a desired audience. The Actions toolkit equivalent is:

```javascript
const idToken = await core.getIDToken('sigstore');
```

Cosign performs that request internally in a supported Actions environment. Do not fetch and print the token just to prove it exists. If you must diagnose a custom integration, request `audience=sigstore`, inspect only locally, and mask or discard the bearer token immediately.

The GitHub token issuer is:

```text
https://token.actions.githubusercontent.com
```

Fulcio validates that issuer, the `sigstore` audience, token timing, and GitHub-specific claims. For current GitHub certificates, Fulcio derives the SAN from `job_workflow_ref`, producing a URI like:

```text
https://github.com/example/widget/.github/workflows/release.yml@refs/tags/v1.2.3
```

The raw GitHub `sub` is recorded separately in the token-subject OID in current Fulcio certificates. Do not assume the `sub` claim is the certificate SAN.

## Verify the Workflow Identity Explicitly

Verification should pin both GitHub's issuer and the expected workflow identity:

```bash
cosign verify \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --certificate-identity-regexp \
    '^https://github\.com/example/widget/\.github/workflows/release\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$' \
  'ghcr.io/example/widget@sha256:REPLACE_WITH_DIGEST'
```

Anchor regular expressions at both ends and escape literal dots. If releases must come from one immutable workflow revision, use an exact identity or additionally enforce the build-signer digest and repository metadata with a policy-aware verifier.

Reusable workflows need special attention. `job_workflow_ref` identifies the workflow actually executing the job, which can be a reusable workflow, while Build Config URI identifies the initiating top-level workflow. Decide which one your policy trusts and inspect the certificate's SAN and Fulcio OID extensions before writing the rule.

## Do Not Sign Untrusted Pull-Request Code

The ability to obtain an OIDC token is not itself authorization to publish a release. A job triggered by unreviewed code can request its own valid GitHub token if the workflow grants permission.

Protect the signing job with controls such as:

- release tags created from protected branches;
- a protected GitHub environment with required reviewers;
- immutable action commit pins;
- no execution of fork-controlled scripts before signing;
- a separate build/sign workflow that consumes a verified digest; and
- explicit repository, workflow, event, ref, and runner checks in verifier policy.

Avoid `pull_request_target` plus checkout of attacker-controlled pull-request code. That combination runs with the base repository's security context and is especially dangerous when `id-token: write` or package publication is available.

For a reusable workflow outside the caller's organization or enterprise, GitHub requires the caller to grant `id-token: write` explicitly. Permissions passed to reusable workflows can only be maintained or reduced through the call chain; make the grant visible at the caller and keep it job-scoped.

## Troubleshoot Common Failures

| Symptom | Check |
| --- | --- |
| OIDC variables unavailable or Cosign cannot get a token | `id-token: write` is set on the actual job, not only another job |
| Fulcio reports an audience error | custom token request used `sigstore`, not GitHub's default audience |
| image push fails | registry login and `packages: write` or external registry credentials |
| signature lands on the wrong object | sign the exact digest returned by the push step |
| verification finds a different identity | inspect SAN; reusable workflow and ref semantics may differ |
| verification fails only on old bundles | use patched Cosign and standardized bundles; review the current security advisory |

Do not work around an issuance failure with a long-lived private key stored in Actions secrets unless you intentionally choose and secure that different trust model.

## Official Documentation

- [GitHub Actions OIDC reference and `id-token: write`](https://docs.github.com/en/actions/reference/security/oidc)
- [Fulcio GitHub OIDC claim and SAN mapping](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md#github)
- [Fulcio OID mapping for GitHub Actions claims](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Cosign installer GitHub Action](https://github.com/sigstore/cosign-installer)
- [Cosign container signing command](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification guidance](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Cosign legacy-bundle identity verification advisory](https://github.com/sigstore/cosign/security/advisories/GHSA-fx35-mq7g-6g98)

## Conclusion

`id-token: write` gives one GitHub Actions job the ability to request a short-lived workload token, not broad repository write access. Keep the permission job-scoped, request the `sigstore` audience through Cosign, sign an immutable digest, protect the release trigger, and verify the exact GitHub issuer and workflow identity.
