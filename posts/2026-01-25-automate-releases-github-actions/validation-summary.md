# Validation Summary: How to Automate Releases with GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions workflows
- GitHub Releases
- Semantic versioning and conventional commits
- Conventional Changelog Action
- git-cliff
- Release Drafter
- npm publishing
- PyPI publishing
- GitHub Actions artifacts
- Rust/Cargo matrix builds

## Sources Consulted
- GitHub Actions workflow syntax and triggers: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-node documentation: https://github.com/actions/setup-node
- TriPSs Conventional Changelog Action documentation: https://github.com/TriPSs/conventional-changelog-action
- git-cliff Action documentation: https://git-cliff.org/docs/github-actions/git-cliff-action/
- softprops/action-gh-release documentation: https://github.com/softprops/action-gh-release
- Release Drafter documentation: https://github.com/release-drafter/release-drafter
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- actions/download-artifact documentation: https://github.com/actions/download-artifact
- GitHub Docs for publishing Node.js packages: https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
- Python Packaging User Guide for publishing with GitHub Actions: https://packaging.python.org/en/latest/guides/publishing-package-distribution-releases-using-github-actions-ci-cd-workflows/
- PyPA gh-action-pypi-publish documentation: https://github.com/pypa/gh-action-pypi-publish

## Issues Found
- The Conventional Changelog Action used the wrong action owner and an outdated major version. Changed `conventional-changelog/conventional-changelog-action@v4` to `TriPSs/conventional-changelog-action@v6`.
- The Conventional Changelog step was configured for release-note output but would still tag by default. Added `skip-tag: true` and quoted `output-file: "false"` to match the action documentation.
- The git-cliff action reference was outdated. Changed `orhun/git-cliff-action@v3` to `orhun/git-cliff-action@v4`.
- The GitHub Release action examples used an older major version. Changed `softprops/action-gh-release@v2` to `softprops/action-gh-release@v3`.
- The Release Drafter workflow used an outdated action version and incorrect permissions for current documented usage. Changed it to `release-drafter/release-drafter@v7`, set `contents: write` and `pull-requests: read`, and removed the unnecessary `pull_request` trigger.
- The Release Drafter configuration used the older `labels` and `version-resolver` structure. Updated it to the current `when` and `type: version-resolver` configuration style.
- The manual release workflow implied that a tag pushed with the default `GITHUB_TOKEN` would trigger the main tag workflow. GitHub documents that most events created by `GITHUB_TOKEN` do not trigger new workflow runs, so the example now uses a PAT/GitHub App token via `secrets.RELEASE_PAT` and explains why.
- The artifact upload/download examples used older action majors. Updated `actions/upload-artifact` to `@v7` and `actions/download-artifact` to `@v8`.
- The PyPI publishing section called the action the official PyPI action. Adjusted the wording to identify it as the PyPA publishing action.

## Review Notes
- The PyPI example using an API token remains technically supported, but PyPA and PyPI now recommend Trusted Publishing with OIDC for most projects.
- The npm example is valid with `setup-node` registry configuration and `NODE_AUTH_TOKEN`; npm Trusted Publishing or provenance can be considered for future hardening.
