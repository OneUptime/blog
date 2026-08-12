# Validation Summary: Secure Keyless Cosign Signing in GitHub Actions

## Status
validated

## Post Type
Security Guide / CI/CD Hardening Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions workflow permissions and `GITHUB_TOKEN`
- GitHub OpenID Connect (OIDC)
- Sigstore Cosign keyless signing and verification
- Fulcio signing certificates
- Rekor transparency logs
- GitHub Container Registry (GHCR)
- GitHub environments, branch protection, rulesets, and CODEOWNERS
- GitHub Actions artifacts and `workflow_run`

## Sources Consulted
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc) - `id-token: write`, token claims, issuer, and job-level permission behavior.
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) - workflow/job permission maps, job condition syntax, action references, and fork permission calculation.
- [GitHub Actions events reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) - `pull_request`, `pull_request_target`, `push`, `workflow_run`, `GITHUB_REF`, `GITHUB_SHA`, fork secrets, and privileged follow-up workflows.
- [Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) - default-branch execution context and pwn-request patterns.
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) - untrusted input, cross-workflow artifacts, CODEOWNERS, and full-commit-SHA action pinning.
- [GitHub deployments and environments reference](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) and [environment management guide](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) - reviewers, self-review, deployment branch rules, administrator bypass, plan availability, secrets, and implicit environment creation.
- [GitHub workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) - step outputs through `$GITHUB_OUTPUT`.
- [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) - supported authentication, PAT classic scopes, `GITHUB_TOKEN`, and digest references.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) - fresh-review enforcement, code-owner reviews, self-protection of `CODEOWNERS`, and bypass controls.
- [Sigstore OIDC usage in Fulcio](https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/) and [OIDC verification cheat sheet](https://docs.sigstore.dev/quickstart/verification-cheat-sheet/) - GitHub Actions certificate SAN identity and issuer values.
- [Cosign `sign` reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md) and [Cosign `verify` reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md) - current command syntax, `--yes`, digest signing, and certificate verification flags.
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/) and [Cosign PR #4836](https://github.com/sigstore/cosign/pull/4836) - `COSIGN_REPOSITORY`, OCI 1.1 referrers, and the v3 alternate-repository verification fix.
- [`sigstore/cosign-installer` action definition](https://github.com/sigstore/cosign-installer/blob/v4.1.2/action.yml) - installed Cosign version behavior and the `cosign-release` input.
- [Sigstore keyless-signing overview](https://docs.sigstore.dev/cosign/signing/overview/) and [Rekor overview](https://docs.sigstore.dev/logging/overview/) - ephemeral keys, Fulcio certificates, and transparency logging.

## Issues Found
1. **OIDC permission scope was described too narrowly in the checklist.** GitHub grants `id-token: write` to a whole job, so every step and action in the combined `build-push-sign` job can request an OIDC token; it cannot be limited to the final signing step. Clarified this in the permissions discussion and changed the checklist to grant it only to the dedicated trusted release job that performs signing.
2. **The GHCR credential requirements were underspecified.** A generic `GHCR_TOKEN` could incorrectly suggest that a fine-grained personal access token works with GitHub Packages. Specified a dedicated publishing account's PAT classic with only `write:packages`, the matching username, and restricted package access.
3. **The environment instructions did not identify the exact deployment-branch setting or its plan limitation.** Specified **Selected branches and tags** with a **Branch** rule for `main`, rather than the broader **Protected branches only** option. Added that required reviewers for private or internal repositories require GitHub Enterprise, while Free, Pro, and Team expose them only for public repositories.
4. **The branch-review guidance did not ensure that the latest workflow change was reviewed.** Added stale-approval dismissal, explicit self-ownership of `CODEOWNERS`, and no-bypass guidance so that an approval cannot remain valid after unreviewed commits alter protected release code.
5. **The `pull_request_target` execution context was imprecise.** Changed “base repository context” to the base repository's default branch, which is the documented source of both the workflow definition and the default checkout for this event.
6. **The alternate signature-repository recommendation lacked a verification and version caveat.** Added that `COSIGN_REPOSITORY` must point to the corresponding location during both signing and verification. For Cosign v3 this requires v3.1.0 or later because v3.0.x ignored the configured target repository while fetching OCI 1.1 bundles during verification.

## Review Notes
- Both workflow snippets are valid GitHub Actions YAML once every `REVIEWED_COMMIT_SHA` placeholder is replaced with a reviewed full commit SHA. The event filters, job condition, permission maps, checkout ref, step-output expression, and `$GITHUB_OUTPUT` format are current.
- `cosign sign --yes "$IMAGE@$DIGEST"` is valid ambient keyless signing in a GitHub Actions job with `id-token: write`. The `cosign verify` identity and issuer values match Fulcio's documented GitHub Actions certificate fields.
- Exact certificate identity matching proves the workflow URI and ref encoded in `job_workflow_ref`; it does not by itself constrain the event name. The sample's `on: push` declaration and explicit `github.event_name == 'push'` condition remain essential.
- An environment branch rule for `main` blocks ordinary `pull_request` merge refs, but it does not by itself distinguish `push` from `pull_request_target`, whose `GITHUB_REF` is the base default branch. The trusted workflow definition and push-only event guard supply that boundary.
- The post's six links under “Official Documentation” were checked and resolve to the intended current GitHub or Cosign references.
