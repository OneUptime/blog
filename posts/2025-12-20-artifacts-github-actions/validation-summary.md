# Validation Summary: How to Use Artifacts in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- actions/upload-artifact@v4
- actions/download-artifact@v4
- actions/checkout@v4
- actions/setup-node@v4
- actions/github-script@v7 (Octokit REST API)
- dawidd6/action-download-artifact@v6
- softprops/action-gh-release@v2
- YAML workflow syntax / matrix builds / GitHub expressions

## Sources Consulted
- actions/upload-artifact official docs/README — https://github.com/actions/upload-artifact
- actions/download-artifact official docs/README — https://github.com/actions/download-artifact
- GitHub Actions documentation on storing and sharing workflow data — https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- Octokit REST API reference for actions (listArtifactsForRepo, deleteArtifact) — https://octokit.github.io/rest.js

## Issues Found
No technical issues found.

All code examples, action versions, and inputs are accurate:
- `upload-artifact@v4` inputs `name`, `path`, `retention-days`, and `compression-level` are correct. The stated default retention of 90 days and compression-level range of 0–9 (with higher = smaller/slower) match the official docs.
- `download-artifact@v4` `pattern` + `merge-multiple: true` behavior (filtering matching artifacts and flattening into a single directory) is described correctly, as is the default per-artifact subdirectory layout when downloading all artifacts.
- Exclude patterns with `!` in multi-line `path` inputs are supported and used correctly.
- All referenced third-party and first-party actions are at current, valid major versions.
- The `github-script` cleanup snippet uses valid Octokit methods (`github.rest.actions.listArtifactsForRepo`, `github.rest.actions.deleteArtifact`) with correct parameters.
- The GitHub expression ternary for dynamic `retention-days` (`... && 365 || 7`) is valid expression syntax.

## Review Notes
- The "production releases" example uses `retention-days: 365`. This is syntactically valid, but the actual retention is capped by the repository's maximum retention setting. The default maximum is 90 days unless an admin raises it on the repository/organization settings page (private repos can go up to 400 days). Values above the configured maximum are silently capped — worth being aware of, but not an error in the post.
- The matrix-build example correctly gives each matrix job a unique artifact name (`build-${{ matrix.os }}`), which is required under v4 since artifacts are immutable and cannot share a name within a run.
- Test-runner flags such as `npm test -- --reporter=junit --outputFile=test-results.xml` are illustrative and depend on the specific test framework configured; they are presented as examples rather than universal commands.
