# Secure Keyless Cosign Signing in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, Cosign, Keyless Signing, OIDC, CI/CD Security

Description: Isolate OIDC signing from pull-request code by using trusted events, job-level permissions, protected environments, immutable digests, and exact verifier identities.

---

Keyless Cosign removes a stored signing private key, but the signing job still has powerful credentials: permission to request a GitHub OIDC token and usually permission to push signatures to a registry. If untrusted pull-request code reaches that job, an attacker may obtain a valid certificate for the workflow identity and sign an artifact the organization never intended to release.

The safe boundary is simple: pull requests may test untrusted code, but only a trusted workflow revision on a protected ref may build, push, and sign production artifacts.

## Understand what `id-token: write` grants

GitHub Actions requires this permission to request an OIDC JWT:

```yaml
permissions:
  id-token: write
```

GitHub documents that this permits fetching the ID token; it does not itself grant repository write access. The token can nevertheless authenticate to Fulcio for keyless signing or to a cloud provider whose trust policy accepts its claims. Treat it as a signing capability.

Set permissions at the job level. A top-level `id-token: write` lets every job that does not override it request an OIDC token, including jobs that parse or execute untrusted content. Within a job, every step and action shares this permission, so keep unrelated or untrusted work out of the trusted release job that signs.

## Do not sign on `pull_request`

Run tests with no OIDC or package-write permission:

```yaml
name: pull-request-tests
on:
  pull_request:

permissions: {}

jobs:
  test:
    permissions:
      contents: read
    runs-on: ubuntu-latest
    steps:
      - name: Check out the pull-request revision
        uses: actions/checkout@REVIEWED_COMMIT_SHA
      - run: ./ci/test.sh
```

By default, fork protections withhold secrets and reduce `GITHUB_TOKEN` permissions, but do not use those platform defaults as the only boundary. Explicit job permissions reduce accidental exposure; they are not a boundary against a same-repository actor with write access who can edit the `pull_request` workflow. Keep production registry credentials behind a protected environment restricted to the release ref or another control the PR-editable workflow cannot grant itself.

The PR workflow must not push a production image, publish a signature, or upload an artifact that a privileged job later signs without rebuilding or independently authenticating its provenance.

## Use a separate trusted release workflow

Trigger signing only from a protected branch or approved release event:

```yaml
name: release
on:
  push:
    branches: [main]

permissions: {}

jobs:
  build-push-sign:
    if: >-
      github.event_name == 'push' &&
      github.ref == 'refs/heads/main' &&
      github.repository == 'acme/payments'
    environment: production-signing
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@REVIEWED_COMMIT_SHA
        with:
          ref: ${{ github.sha }}
      - uses: sigstore/cosign-installer@REVIEWED_COMMIT_SHA
      - name: Log in to GHCR
        uses: docker/login-action@REVIEWED_COMMIT_SHA
        with:
          registry: ghcr.io
          username: ${{ secrets.GHCR_USERNAME }}
          password: ${{ secrets.GHCR_TOKEN }}
      - name: Build and push
        id: build
        run: ./ci/build-and-push-trusted.sh
      - name: Sign immutable output
        env:
          IMAGE: ghcr.io/acme/payments
          DIGEST: ${{ steps.build.outputs.digest }}
        run: cosign sign --yes "$IMAGE@$DIGEST"
```

Replace placeholders with reviewed full commit SHAs. Pinning third-party actions prevents a moved tag from changing code inside the privileged job.

Pre-create `production-signing`, store a dedicated publishing account's username as `GHCR_USERNAME` and its personal access token (classic) with only `write:packages` as `GHCR_TOKEN`, and limit that account's package access to what the job needs. GitHub Packages does not support fine-grained personal access tokens. Configure the environment to require reviewers, prevent self-review, choose **Selected branches and tags** and add a **Branch** rule for `main`, and disallow administrator bypass. Required reviewers for private or internal repositories require GitHub Enterprise; on GitHub Free, Pro, and Team they are available only for public repositories. A referenced environment that does not exist is otherwise created without protection rules or secrets.

The build script must validate the pushed digest against `^sha256:[0-9a-f]{64}$`, append `digest=$DIGEST` to `$GITHUB_OUTPUT` only after the push succeeds, and fail otherwise. Do not accept an image reference from PR-controlled output, labels, issue comments, or filenames.

## Protect the workflow identity itself

Cosign verification commonly authorizes a GitHub workflow URI and issuer:

```bash
cosign verify \
  --certificate-identity='https://github.com/acme/payments/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  "$IMAGE_BY_DIGEST"
```

That identity is valuable only if attackers cannot merge changes to `release.yml` or its scripts freely. Use branch rules/rulesets with required reviews and stale-approval dismissal, require CODEOWNER reviews for workflow and release files, make `CODEOWNERS` own itself, use protected environments with reviewers, and disallow bypasses.

Keep the repository owner/name, workflow filename, and protected ref stable or update verifier policy through reviewed change control. Never compensate for changing workflow identities with an organization-wide `.*` regex.

## Be especially careful with `pull_request_target`

`pull_request_target` runs the workflow from the base repository's default branch and can receive elevated token/secrets. GitHub's security guidance explains that it is safe only while it does not execute untrusted pull-request code. Fetching or checking out the PR head and then running its scripts, building its Dockerfile, or evaluating its build configuration inside that privileged context creates a “pwn request” path.

Do not give a `pull_request_target` job `id-token: write` and then run PR content. Use it only for narrowly scoped metadata operations such as labeling, treat all pull-request metadata as untrusted input, and grant minimal permissions. Run untrusted tests in a separate `pull_request` workflow.

## Treat cross-workflow artifacts as untrusted

A common design builds on a pull request and later uses `workflow_run` to sign the uploaded image or artifact with greater privileges. The privileged workflow must assume the artifact and its name, digest, metadata, and archive structure are attacker-controlled.

The safest release flow rebuilds the reviewed commit in the trusted workflow. If artifact reuse is unavoidable, bind it to authenticated provenance, verify its signer workflow identity, originating repository/event/SHA, and subject digest, reject path traversal and symlinks during extraction, and enforce a digest chosen through trusted review. Merely checking that the earlier workflow concluded successfully is not proof that its artifacts are trusted.

Never interpolate untrusted GitHub context values directly into shell commands. Pass data through environment variables, validate it against strict formats, and quote expansions.

## Minimize registry power

Separate build and signing identities where practical:

- build job can push only a staging repository;
- signing job can read the approved subject and write only to a separately permissioned signature repository configured through `COSIGN_REPOSITORY`;
- promotion job can write the production repository only after verification;
- PR jobs have no production registry credentials.

Set `COSIGN_REPOSITORY` to the corresponding signature repository for both signing and verification. With Cosign v3, use v3.1.0 or later; v3.0.x ignored the configured target repository when fetching OCI 1.1 bundles during verification.

If the signing job can overwrite production tags, its compromise has consequences beyond signature creation. Grant only the repository scopes required by the flow.

## Test negative cases

Create safe tests proving that:

- a fork pull request cannot request the signing OIDC token;
- a same-repository pull request does not run the signing job;
- `pull_request_target` never checks out or executes PR head content;
- a signature from any ref other than `refs/heads/main` cannot match the accepted certificate identity, and `main` remains covered by the required protection rules;
- a renamed/unapproved workflow signature fails consumer verification;
- a PR-controlled digest or registry path is rejected;
- environment approval is required before the privileged job starts.

Review GitHub Actions run/job logs, applicable organization audit-log workflow events, and Rekor transparency-log entries for unexpected signing activity.

## Hardening checklist

- [ ] Grant `id-token: write` only to the dedicated trusted release job that performs signing.
- [ ] Enforce outside PR-editable workflow YAML that PR jobs cannot obtain production registry credentials.
- [ ] Sign only on protected trusted refs/events.
- [ ] Rebuild reviewed source in the privileged workflow.
- [ ] Never execute PR code in a privileged `pull_request_target` job.
- [ ] Pin third-party actions to reviewed commit SHAs.
- [ ] Protect workflow/scripts with reviews, CODEOWNERS, and rulesets.
- [ ] Use a protected environment for production signing.
- [ ] Validate and sign the immutable digest returned by the trusted push.
- [ ] Verify exact workflow identity and issuer, and monitor transparency logs.

## Official Documentation

- [GitHub Actions OIDC reference and permissions](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub guidance for secure `pull_request_target` use](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [GitHub Actions security hardening](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Cosign signing command](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)

## Conclusion

Keyless signing protects you from stored private-key theft, not from running attacker code inside the authorized identity. Keep pull-request execution unprivileged, rebuild on a protected ref, grant OIDC only to the release job, sign a trusted digest, and make consumers require that exact workflow identity. The workflow boundary is the signing key.
