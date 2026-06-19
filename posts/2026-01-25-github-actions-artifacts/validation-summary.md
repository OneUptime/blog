# Validation Summary: How to Manage Artifacts in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow artifacts
- `actions/upload-artifact`
- `actions/download-artifact`
- GitHub CLI
- GitHub Actions REST API
- GitHub Actions cache
- GitHub Releases
- Test report publishing

## Sources Consulted
- GitHub Docs: Store and share data with workflow artifacts - https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Docs: Actions limits - https://docs.github.com/en/actions/reference/limits
- GitHub Docs: Dependency caching reference - https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Docs: REST API endpoints for GitHub Actions artifacts - https://docs.github.com/en/rest/actions/artifacts
- `actions/upload-artifact` README - https://github.com/actions/upload-artifact
- `actions/download-artifact` README - https://github.com/actions/download-artifact
- GitHub CLI manual: `gh run download` - https://cli.github.com/manual/gh_run_download
- GitHub CLI local help: `gh run download --help` and `gh api --help`
- `softprops/action-gh-release` README - https://github.com/softprops/action-gh-release
- `dorny/test-reporter` README - https://github.com/dorny/test-reporter

## Issues Found
- The limitations section listed "500 MB per file (10 GB with compression)" and "10 GB total per workflow run". GitHub's current documentation describes artifact usage in terms of plan-based artifact storage allowance and the `upload-artifact` action documents a 500-artifacts-per-job limit, so the limits were updated to match the documented quota model.
- A comment above `if-no-files-found: error` said "Exclude certain files". That input controls behavior when no files match the upload paths, so the comment was corrected.
- The Artifacts vs Cache table described cache retention and cache size as fixed values. GitHub's current cache documentation describes 7 days unused and 10 GB per repository as defaults that can be configured, so the table was updated.

## Review Notes
The examples use `actions/upload-artifact@v4` and `actions/download-artifact@v4`, which remain valid for the documented artifact workflows. Current upstream action README examples may show newer major versions, so the post could be refreshed in the future if the blog standardizes on always using the latest major action tags.
