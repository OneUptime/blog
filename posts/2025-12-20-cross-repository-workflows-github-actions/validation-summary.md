# Validation Summary: How to Set Up Cross-Repository Workflows in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, steps)
- `repository_dispatch` events and the REST API `POST /repos/{owner}/{repo}/dispatches` endpoint
- `workflow_dispatch` (manual triggers with typed inputs)
- Reusable workflows (`workflow_call`)
- GitHub CLI (`gh workflow run`, `gh run list`, `gh run watch`, `gh pr create`)
- `actions/checkout@v4`, `actions/setup-node@v4`
- npm / GitHub Packages publishing
- Personal Access Tokens (classic and fine-grained) and `GITHUB_TOKEN`

## Sources Consulted
- GitHub REST API — Create a repository dispatch event: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event (confirmed endpoint `POST /repos/{owner}/{repo}/dispatches`, `event_type` required ≤100 chars, `client_payload` optional ≤10 top-level props/64KB, classic PAT needs `repo` scope)
- GitHub Actions — Events that trigger workflows (`repository_dispatch`, `workflow_dispatch`, `workflow_call`): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- GitHub Actions — Reusing workflows: https://docs.github.com/en/actions/using-workflows/reusing-workflows
- GitHub CLI manual — `gh workflow run`, `gh run watch`, `gh pr create`: https://cli.github.com/manual/
- `actions/setup-node` README (Node version + npm caching): https://github.com/actions/setup-node

## Issues Found
No technical issues found.

All code examples are syntactically valid YAML and use current, non-deprecated APIs:
- The `repository_dispatch` curl call uses the correct endpoint, headers (`Accept: application/vnd.github+json`, `Authorization: Bearer`), and body shape (`event_type` + `client_payload`). The stated `repo` scope requirement for the classic PAT is correct.
- `workflow_dispatch` input definitions (`type: choice`/`string`, `required`, `options`) and the `${{ inputs.* }}` access pattern are correct.
- The reusable-workflow reference `myorg/.github/.github/workflows/node-ci.yml@main` correctly resolves to the org-level special `.github` repository plus its `.github/workflows/` path.
- `gh workflow run <file> --repo <repo> --field key=value`, `gh run list --json databaseId -q '.[0].databaseId'`, and `gh run watch` are all valid current CLI usage.
- `actions/setup-node@v4` with `cache: 'npm'` and `cache-dependency-path` is correct.

## Review Notes
- The "Create PR if tests pass" step runs `gh pr create` with the default `GITHUB_TOKEN`. This works only if the workflow grants `permissions: contents: write` and `pull-requests: write` (default token permissions may be read-only depending on org/repo settings). Also note GitHub's documented behavior that events (including PRs) created using `GITHUB_TOKEN` will not trigger further workflow runs — a relevant caveat for downstream CI, though not an error in the example.
- The "Upload to GitHub Packages" step sets `NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. Publishing to GitHub Packages additionally requires a `.npmrc` pointing the scoped registry at `npm.pkg.github.com` and `permissions: packages: write`. The snippet is illustrative and assumes that registry config exists.
- `repository_dispatch` workflows only run from the file on the repository's default branch — worth keeping in mind when testing receiver workflows on feature branches. Not stated in the post but not incorrect.
- The `Validating Dispatch Events` example reads `github.event.client_payload.source_repo`, which the sender must explicitly include in its payload (the earlier triggering examples send `library`/`version`/`sha`, not `source_repo`). The grep-based allow-list is a reasonable illustration but matches substrings; a stricter exact match (e.g. `grep -qx` or a loop) would be more robust. These are improvement notes, not correctness errors.
