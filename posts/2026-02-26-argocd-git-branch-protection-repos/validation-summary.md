# Validation Summary: How to Implement Git Branch Protection for ArgoCD Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- GitHub branch protection
- GitHub CODEOWNERS
- GitHub Actions
- GitLab protected branches and merge request approvals
- Kubernetes manifest validation

## Sources Consulted
- GitHub REST API documentation for protected branches: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitLab Protected Branches API documentation: https://docs.gitlab.com/api/protected_branches/
- GitLab Merge Request Approvals API documentation: https://docs.gitlab.com/api/merge_request_approvals/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/

## Issues Found
- The GitHub CLI branch protection example passed JSON objects through `--field`, which `gh api` treats as typed scalar fields rather than nested JSON objects. Changed the example to send a JSON request body with `--input -`.
- The required status check names did not match the GitHub Actions jobs shown in the post, and `lint-yaml` was only a workflow step, not a branch-protectable check. Updated the required checks and added explicit job display names.
- The CODEOWNERS explanation incorrectly said approvals were required from both listed teams. GitHub requires approval from any matching code owner, and the last matching pattern takes precedence. Updated the production overlay example and explanation.
- The dry-run workflow used `origin/main` without ensuring the base branch history was fetched, and wrote a multiline value to `$GITHUB_OUTPUT`. Added `fetch-depth: 0`, used `origin/main...HEAD`, and flattened the changed directory output.
- The dry-run section said Argo CD would render and apply manifests, but `argocd app diff` compares desired and live state and does not apply changes. Updated the wording.
- The GitLab protected branch API example used an outdated/incorrect endpoint and parameters. Updated it to the current protected branches API with `push_access_level`, `merge_access_level`, and `allow_force_push`.
- The GitLab approval rule example used form-style array parameters. Updated it to a JSON payload matching the current approvals API and scoped it to protected branches.
- The Argo CD AppProject section implied AppProjects can restrict Git branches. AppProjects restrict source repository URLs, destinations, and resources; branch selection belongs in the Application `targetRevision`. Updated the wording and example.
- The branch protection audit `jq` filter only reported legacy `contexts`. Updated it to include both `contexts` and `checks`.

## Review Notes
- The manifest validation example still uses `kubeval`, which is usable for basic schema validation but is less actively maintained than alternatives such as `kubeconform`. Consider updating this in a future content refresh.
- The Argo CD diff workflow checks all applications rather than using the computed changed directories to filter affected applications. This is conservative but may be slow in large repositories.
