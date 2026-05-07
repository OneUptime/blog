# Validation Summary: How to Create Automated Release Pipelines with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images and registries
- GitHub Actions
- Git and semantic version tags
- Trivy
- Sigstore cosign
- PostgreSQL container testing
- npm test commands

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Trivy image command reference: https://trivy.dev/v0.29.2/docs/references/cli/image/
- Sigstore cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands and GITHUB_ENV documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Semantic Versioning 2.0.0 specification: https://semver.org/
- Local Git help for `git describe`

## Issues Found
- The semantic version validation regex did not fully match SemVer 2.0.0: it rejected valid prerelease identifiers containing hyphens, did not support build metadata, and accepted numeric identifiers with leading zeroes. I replaced it with a SemVer-compatible Bash regex and updated prerelease parsing to handle build metadata.
- The GitHub Actions workflow always tagged prereleases as `latest`, despite the earlier script correctly avoiding `latest` for prereleases. I added prerelease extraction and conditional `latest` tagging.
- The GitHub Actions workflow used `podman push --all-tags`, but the official Podman push documentation does not list an `--all-tags` option for `podman push`. I replaced it with explicit pushes for each generated tag, with `latest` pushed only for non-prereleases.
- The GitHub Actions workflow used dynamically generated environment values through the `${{ env.* }}` expression syntax. I changed later shell steps to use the runner environment variables populated through `$GITHUB_ENV`, and added a step output for the release body where expression syntax is required.

## Review Notes
- The local environment did not have `podman`, `trivy`, or `cosign` installed, so CLI verification relied on official documentation rather than local `--help` output for those tools.
- The test script is technically plausible but could be hardened in a future revision with `set -euo pipefail` and `trap` cleanup so failed tests do not leave containers or networks behind.
