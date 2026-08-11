# How to Secure Keyless Cosign Signing in GitHub Actions Against Untrusted Pull Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Cosign, Keyless Signing, OIDC, CI/CD Security

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

Set permissions at the job level. A top-level `id-token: write` makes the token available to more jobs than necessary, including jobs that parse or execute untrusted content.

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

Fork protections withhold secrets and reduce `GITHUB_TOKEN` permissions, but do not use those platform defaults as the only boundary. Same-repository pull requests, compromised contributors, workflow changes, and future configuration changes still deserve explicit least privilege.

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
      packages: write
      id-token: write
    steps:
      - uses: actions/checkout@REVIEWED_COMMIT_SHA
        with:
          ref: ${{ github.sha }}
      - uses: sigstore/cosign-installer@REVIEWED_COMMIT_SHA
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

The build script must write a validated `sha256:...` output and fail if the push did not produce it. Do not accept an image reference from PR-controlled output, labels, issue comments, or filenames.

## Protect the workflow identity itself

Cosign verification commonly authorizes a GitHub workflow URI and issuer:

```bash
cosign verify \
  --certificate-identity='https://github.com/acme/payments/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  "$IMAGE_BY_DIGEST"
```

That identity is valuable only if attackers cannot merge changes to `release.yml` or its scripts freely. Use branch rules/rulesets, required reviews, CODEOWNERS for workflow and release files, protected environments with reviewers, and restricted administrator bypass.

Keep the filename and protected ref stable or update verifier policy through reviewed change control. Never compensate for changing workflow identities with an organization-wide `.*` regex.

## Be especially careful with `pull_request_target`

`pull_request_target` runs the workflow from the base repository context and can receive elevated token/secrets. GitHub's security guidance explains that it is safe only while it does not execute untrusted pull-request code. Checking out the PR head, running its scripts, building its Dockerfile, or evaluating its build configuration inside that privileged context creates a “pwn request” path.

Do not give a `pull_request_target` job `id-token: write` and then run PR content. Use it only for trusted metadata operations such as labeling when needed, with minimal permissions. Run untrusted tests in a separate `pull_request` workflow.

## Treat cross-workflow artifacts as untrusted

A common design builds on a pull request and later uses `workflow_run` to sign the uploaded image or artifact with greater privileges. The privileged workflow must assume the artifact and its name, digest, metadata, and archive structure are attacker-controlled.

The safest release flow rebuilds the reviewed commit in the trusted workflow. If artifact reuse is unavoidable, bind it to authenticated provenance, verify the originating repository/event/SHA, reject path traversal and symlinks during extraction, and enforce a digest chosen through trusted review. Merely checking that the earlier workflow concluded successfully is not proof of artifact origin.

Never interpolate untrusted GitHub context values directly into shell commands. Pass data through environment variables, validate it against strict formats, and quote expansions.

## Minimize registry power

Separate build and signing identities where practical:

- build job can push only a staging repository;
- signing job can read the approved subject and push signature referrers;
- promotion job can write the production repository only after verification;
- PR jobs have no production registry credentials.

If the signing job can overwrite production tags, its compromise has consequences beyond signature creation. Grant only the repository scopes required by the flow.

## Test negative cases

Create safe tests proving that:

- a fork pull request cannot request the signing OIDC token;
- a same-repository pull request does not run the signing job;
- `pull_request_target` never checks out or executes PR head content;
- an unprotected branch cannot match the accepted certificate identity;
- a renamed/unapproved workflow signature fails consumer verification;
- a PR-controlled digest or registry path is rejected;
- environment approval is required before the privileged job starts.

Review GitHub audit logs and Rekor identity entries for unexpected signing events.

## Hardening checklist

- [ ] Keep `id-token: write` at the dedicated signing job only.
- [ ] Give PR test workflows no signing or production registry permissions.
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
- [GitHub guidance for secure `pull_request_target` use](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [GitHub events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Cosign signing command](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)

## Conclusion

Keyless signing protects you from stored private-key theft, not from running attacker code inside the authorized identity. Keep pull-request execution unprivileged, rebuild on a protected ref, grant OIDC only to the release job, sign a trusted digest, and make consumers require that exact workflow identity. The workflow boundary is the signing key.
