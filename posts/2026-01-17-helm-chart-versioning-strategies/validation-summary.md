# Validation Summary: How to Implement Helm Chart Versioning and Release Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm charts and Helm CLI
- Kubernetes release packaging
- Semantic Versioning
- GitHub Actions
- git-cliff
- npm semver CLI
- GitHub Container Registry / OCI registries
- yq

## Sources Consulted
- Helm chart documentation: https://helm.sh/docs/topics/charts/
- Helm dependency update command: https://helm.sh/docs/helm/helm_dependency_update/
- Helm search repo command: https://helm.sh/docs/helm/helm_search_repo/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm registry login command: https://helm.sh/docs/helm/helm_registry_login/
- npm semver CLI documentation: https://docs.npmjs.com/cli/v6/using-npm/semver/
- git-cliff GitHub Action documentation: https://git-cliff.org/docs/github-actions/git-cliff-action/
- orhun/git-cliff-action README: https://github.com/orhun/git-cliff-action
- Azure/setup-helm README: https://github.com/Azure/setup-helm
- softprops/action-gh-release README: https://github.com/softprops/action-gh-release
- stefanzweifel/git-auto-commit-action README: https://github.com/stefanzweifel/git-auto-commit-action
- GitHub Packages / Container registry documentation: https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Issues Found
- The changelog workflow used outdated action major versions and omitted `contents: write`, which is required for the auto-commit action to push generated changelog updates. Updated the examples to current documented action versions and added the permission.
- The git-cliff action example omitted `GITHUB_REPO`, which the official examples include for GitHub-aware changelog generation. Added it to the action environment.
- The chart release workflow pushed to GHCR without first authenticating Helm to the OCI registry and without `packages: write`. Added workflow permissions and a `helm registry login ghcr.io` step using `GITHUB_TOKEN`.
- The release workflow used older action major versions. Updated `actions/checkout`, `azure/setup-helm`, and `softprops/action-gh-release` to current documented major versions.
- The release notes template had malformed nested Markdown fences, closing YAML snippets with ```bash and the outer block with ```text. Replaced the outer fence with a four-backtick Markdown fence and corrected the inner YAML fences.
- The troubleshooting command `helm search repo myapp --versions` would omit prerelease chart versions. Added `--devel` so it includes the `-rc` and `-dev` versions discussed in the post.

## Review Notes
- Helm's official chart documentation recommends SemVer for chart `version`, notes that `appVersion` is informational and need not be SemVer, and recommends quoting `appVersion`; the post now aligns with that behavior.
- The dependency version constraints shown with `~` and `^` match Helm's documented SemVer constraint handling.
- The yq examples assume Mike Farah yq v4 syntax, which is current for the `yq -i` usage shown.
