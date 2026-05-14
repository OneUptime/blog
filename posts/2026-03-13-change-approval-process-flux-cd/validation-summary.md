# Validation Summary: How to Implement Change Approval Process with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD / GitOps
- Kubernetes ConfigMap
- GitHub branch protection
- GitHub CLI
- GitHub Actions
- Pull request templates
- ITSM change record integration

## Sources Consulted
- GitHub REST API documentation for branch protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI manual for `gh api`, `gh pr edit`, `gh pr list`, and JSON formatting: https://cli.github.com/manual
- GitHub Actions workflow syntax and `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax and https://docs.github.com/en/actions/reference/github_token-reference
- GitHub REST API documentation for issue and pull request labels: https://docs.github.com/en/rest/issues/labels
- GitHub documentation for pull request templates: https://docs.github.com/articles/creating-a-pull-request-template-for-your-repository
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Flux repository structure and GitRepository/Kustomization documentation: https://fluxcd.io/flux/guides/repository-structure/ and https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The ConfigMap example used `data: |`, which makes `data` a scalar string. Kubernetes ConfigMap `data` must be a map of string keys to string values. Changed it to `data: change-classification.yaml: |` so the embedded approval matrix is stored under a valid ConfigMap key.
- The `gh api` branch protection example passed nested JSON objects through `--field`, which GitHub CLI treats as strings unless nested field syntax or an input body is used. Replaced it with `--input -` and a JSON request body matching the GitHub REST API schema, including the `apps` array under `restrictions`.
- The risk analysis workflow could downgrade a previously detected `high` risk to `medium` when more than 10 files changed. Updated the file-count rule so it only sets `medium` when the risk is still `low`.
- The risk analysis workflow labels pull requests with `gh pr edit --add-label` but did not declare token permissions. Added `contents: read` and `pull-requests: write` permissions for the `GITHUB_TOKEN`.
- The change record workflow interpolated the PR body directly into a shell command, which could break on quotes, command substitutions, or multiline content. Changed ticket extraction to read `.pull_request.body` from `$GITHUB_EVENT_PATH` with `jq`.
- The approval verification command computed the latest merge commit but then listed the first merged PR without using that SHA. Added `--search "$MERGE_SHA" --limit 1` so the PR lookup corresponds to the merge commit being audited.

## Review Notes
- The examples are intentionally organization-specific and use placeholder systems such as `itsm.example.com`; these are acceptable as illustrative integration points.
- The CI risk detection heuristics are syntactically valid but intentionally simplistic. A production implementation should use stronger manifest-aware checks for resource deletion and security-sensitive changes.
