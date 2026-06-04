# Validation Summary: How to Use Git Commit Signing Verification in Kubernetes Deployment Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Git commit and tag signing
- GPG key import and fingerprint verification
- GitHub Actions
- GitHub REST API branch protection
- GitLab CI/CD merge request pipelines
- Tekton Tasks
- Kubernetes ConfigMaps

## Sources Consulted
- Git `git-verify-commit` documentation: https://git-scm.com/docs/git-verify-commit.html
- Git pretty format placeholders documentation: https://git-scm.com/docs/pretty-formats
- GitHub Actions checkout action README: https://github.com/actions/checkout
- GitHub Actions pull request event documentation: https://docs.github.com/actions/learn-github-actions/events-that-trigger-workflows
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitLab merge request pipelines documentation: https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- GitLab predefined CI/CD variables documentation: https://docs.gitlab.com/ci/variables/predefined_variables/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Local CLI help for `git verify-commit`, `git verify-tag`, and `gh api`

## Issues Found
- The GitHub Actions workflow used `actions/checkout@v3`, which is outdated compared with the current checkout action release line. Updated the example to `actions/checkout@v6`.
- The GitHub Actions workflow unconditionally piped `secrets.TRUSTED_GPG_KEYS` into `gpg --import`, which can fail when the secret is unset. Added an environment variable and a non-empty check before importing keys from secrets.
- The GitHub Actions and Tekton examples used `grep -q "Good signature"` against human-readable GPG output. Replaced this with `git verify-commit` / `git verify-tag` exit-code checks, which are the documented verification interfaces and avoid brittle text matching.
- The examples claimed to restrict deployment to trusted developers but only checked whether a signature was good. Added signing key fingerprint allowlists using Git `%GF` so the snippets enforce exact authorized keys.
- The GitHub Actions push example used `github.event.before..github.event.after`, which can fail for newly created branches where `before` is the all-zero SHA. Changed the push path to read pushed commit IDs from `$GITHUB_EVENT_PATH`.
- The GitLab CI example used `only: merge_requests`; GitLab's current documentation recommends `rules` that match `CI_PIPELINE_SOURCE == "merge_request_event"`. Updated the verification and build jobs accordingly.
- The Tekton Task imported GPG keys in one step and verified commits in another, but each step runs in a separate container environment. Moved key import into the verification step and mounted the key ConfigMap there.
- The Tekton clone step did not fetch additional refs or tags before checking out the requested revision. Added `git fetch --all --tags` after cloning.
- The signer extraction section described `%GS` as signer name/email. Git documents `%GS` as the signer name and `%GF` as the signing key fingerprint. Updated the explanation and examples.
- The authorized signer example compared signer display names with `grep`, which is vulnerable to partial matches and display-name ambiguity. Replaced it with exact fingerprint allowlist matching.
- The GitHub REST API curl example omitted the current recommended `Accept`, `Authorization: Bearer`, and API version headers. Added the recommended headers.
- The tag verification example also grepped for `Good signature` and did not quote the tag variable. Updated it to use `git verify-tag "$TAG"`.

## Review Notes
- `kubectl` was not installed in the local workspace, so the ConfigMap command was checked against the official Kubernetes generated reference instead of local CLI help.
- The GPG key examples remain GPG-based; Git also supports SSH and X.509 signing, but adding those alternatives would be a scope expansion rather than a correctness fix.
