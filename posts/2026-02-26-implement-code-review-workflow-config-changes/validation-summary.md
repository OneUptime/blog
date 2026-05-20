# Validation Summary: How to Implement Code Review Workflow for Config Changes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ArgoCD and GitOps workflow practices
- GitHub branch protection
- GitHub CODEOWNERS
- GitHub Actions
- Kustomize
- kubeconform
- yq
- Open Policy Agent / Rego
- Conftest
- Kubernetes Deployments and manifests

## Sources Consulted
- GitHub REST API documentation for branch protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI `gh api --help` and `gh pr create --help`
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-codeowners
- GitHub branch protection documentation: https://docs.github.com/github/administering-a-repository/enabling-branch-restrictions
- GitHub rulesets documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- actions/checkout documentation: https://github.com/actions/checkout
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- Conftest installation and policy documentation: https://www.conftest.dev/install/ and https://www.conftest.dev/
- Open Policy Agent Rego v1 documentation: https://www.openpolicyagent.org/docs/v0-upgrade and https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- yq release asset URL from the official mikefarah/yq repository: https://github.com/mikefarah/yq

## Issues Found
- The `gh api` branch protection example passed nested JSON objects through `--field`, which GitHub CLI treats as typed field values rather than parsing arbitrary JSON objects. Changed the example to use `--input -` with a JSON request body.
- The required branch-protection status check names did not match the workflow job names. Updated the required contexts to `validate-structure`, `policy-check`, and `diff-preview`.
- The validation workflow used `yq` without installing it. Added installation of the `yq_linux_amd64` binary.
- The `policy-check` and `diff-preview` jobs used `kustomize` without installing it in those jobs. Added Kustomize installation to both jobs.
- The Conftest install URL used an unversioned asset name that currently redirects to a missing asset. Updated it to derive the latest version and download the versioned Linux x86_64 tarball format used by Conftest releases.
- The diff-preview workflow used `git stash` and `git stash pop` in a GitHub Actions checkout where no local working-tree changes should exist. Replaced that flow with `git fetch origin main`, `git checkout origin/main`, and `git checkout -`.
- The Rego policy used pre-OPA-1.0 partial-set rule syntax. Updated it to import `rego.v1` and use `deny contains msg if` / `warn contains msg if`.
- The CODEOWNERS example and explanation implied service teams could self-approve and that multiple CODEOWNERS rules combine. Adjusted the dev wording and clarified production ownership so it does not conflict with GitHub's last-match CODEOWNERS behavior.
- The hotfix section claimed a branch protection rule for `hotfix/*` could reduce review requirements for hotfix PRs targeting `main`. Corrected the text to explain that branch protection applies to the target branch and that emergency paths require ruleset bypasses or the normal main-branch requirements.

## Review Notes
The corrected Rego snippet was checked with OPA v1 syntax and Conftest 0.68.2. GitHub CODEOWNERS can route ownership by path, but it cannot by itself require separate approvals from multiple teams for the same path; additional policy checks or ruleset/process controls are needed for that.
