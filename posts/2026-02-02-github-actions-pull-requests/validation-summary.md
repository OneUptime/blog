# Validation Summary: How to Configure GitHub Actions for Pull Requests

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- GitHub Actions (workflow syntax, events, jobs, matrix strategy, services, concurrency)
- `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/cache`, `actions/labeler`, `actions/github-script`
- `github/codeql-action` (init, analyze, upload-sarif)
- `dorny/paths-filter`
- `codecov/codecov-action`
- `gitleaks/gitleaks-action`
- `aquasecurity/trivy-action`
- `davelosert/vitest-coverage-report-action`
- `gaurav-nelson/github-action-markdown-link-check`
- `DavidAnson/markdownlint-cli2-action`
- Node.js / npm, PostgreSQL service containers
- Octokit REST API (`pulls`, `issues`, `search` namespaces)

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Events that trigger workflows (`pull_request`): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request
- `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication
- REST API — List pull requests: https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
- REST API — List repository issues: https://docs.github.com/en/rest/issues/issues#list-repository-issues
- `actions/labeler` v5 config syntax: https://github.com/actions/labeler
- `actions/github-script`: https://github.com/actions/github-script
- `dorny/paths-filter`: https://github.com/dorny/paths-filter
- `github/codeql-action`: https://github.com/github/codeql-action
- `aquasecurity/trivy-action`: https://github.com/aquasecurity/trivy-action

## Issues Found
1. **Welcome workflow — invalid `creator` parameter on `pulls.list`.** The `actions/github-script` snippet in "PR Comment Automation" called `github.rest.pulls.list({ ..., creator })`. The REST endpoint `GET /repos/{owner}/{repo}/pulls` does not accept a `creator` query parameter (valid params: `state`, `head`, `base`, `sort`, `direction`, `per_page`, `page`). The Octokit client would silently ignore it and return all PRs in the repo, so the "first PR" check would only ever fire when the repo has exactly one PR total — not what the post describes. Replaced with `github.rest.issues.listForRepo({ ..., creator })` (which *does* support `creator`), filtering the result to entries with a `pull_request` property. This is the canonical pattern, since PRs are issues in the REST API.

2. **Welcome workflow — missing `issues: read` permission.** Once the fix above uses `issues.listForRepo`, the workflow needs `issues: read`. Because the workflow declares a `permissions:` block, any unmentioned permission is set to `none`, so `issues` was implicitly denied and the API call would have failed with 403. Added `issues: read` to the permissions block in `pr-comment.yml`.

## Review Notes
- Action versions in the post (`actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `cache@v4`, `github-script@v7`, `codeql-action/*@v3`, `labeler@v5`, `paths-filter@v3`, `codecov-action@v4`) are not the very latest majors as of June 2026 but are all still supported and non-deprecated. No update needed for correctness.
- `aquasecurity/trivy-action@master` is pinned to a moving ref. Functional, but pinning to a tagged release (e.g. `@0.24.0`) would be safer for production use. Not a technical error, so left as-is.
- The welcome comment body uses a template literal with leading indentation, which can cause GitHub-flavored Markdown to render some indented lines unusually (4+ leading spaces are treated as code blocks). Cosmetic; not a syntax bug, so left unchanged.
- `pull-requests: write` is sufficient for `issues.createComment({ issue_number: pr.number })` to comment on a PR — PRs are issues, and the token permission docs confirm `pull-requests: write` covers PR comments. The post's permission blocks for the comment/labeler workflows are therefore correct.
- The `if: hashFiles('Dockerfile') != ''` guard for the container scan is a valid pattern — `hashFiles` returns an empty string when no files match.
- The matrix `exclude` block, the `services.postgres` health-check config, the `dorny/paths-filter@v3` filters syntax, and the `concurrency` group expression are all correct against current docs.
- `actions/labeler@v5` configuration uses `changed-files` → `any-glob-to-any-file`, which is the correct v5+ schema.
