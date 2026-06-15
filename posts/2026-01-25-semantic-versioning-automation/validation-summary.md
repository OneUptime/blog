# Validation Summary: How to Implement Semantic Versioning Automation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Semantic Versioning 2.0.0
- Conventional Commits 1.0.0
- semantic-release
- @semantic-release/commit-analyzer
- @semantic-release/release-notes-generator
- @semantic-release/changelog
- @semantic-release/npm
- @semantic-release/github
- GitHub Actions
- release-please
- Commitizen for Python projects
- npm and Git tags

## Sources Consulted
- Semantic Versioning 2.0.0 specification: https://semver.org/
- Conventional Commits 1.0.0 specification: https://www.conventionalcommits.org/en/v1.0.0/
- semantic-release documentation: https://semantic-release.org/
- semantic-release GitHub Actions recipe: https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/ci-configurations/github-actions.md
- @semantic-release/commit-analyzer README: https://github.com/semantic-release/commit-analyzer
- @semantic-release/release-notes-generator README: https://github.com/semantic-release/release-notes-generator
- @semantic-release/changelog README: https://github.com/semantic-release/changelog
- @semantic-release/npm README: https://github.com/semantic-release/npm
- release-please README: https://github.com/googleapis/release-please
- release-please-action README: https://github.com/googleapis/release-please-action
- Commitizen documentation: https://commitizen-tools.github.io/commitizen/
- Commitizen configuration customization docs: https://commitizen-tools.github.io/commitizen/customization/config_file/
- Commitizen version provider docs: https://commitizen-tools.github.io/commitizen/config/version_provider/

## Issues Found
- The semantic-release install command used the `conventionalcommits` preset but did not install `conventional-changelog-conventionalcommits`. Added it to the npm install command because semantic-release preset packages must be installed when selected explicitly.
- The initial semantic-release config set `preset: "conventionalcommits"` only for `@semantic-release/commit-analyzer`, while `@semantic-release/release-notes-generator` remained on its default behavior. Changed the notes generator entry to use the same preset and added `presetConfig: {}` for the conventional commits preset.
- The Commitizen example mixed `name = "cz_conventional_commits"` with `[tool.commitizen.customize]` settings. Commitizen's config-file customization docs require `name = "cz_customize"` for those settings, and the built-in conventional adapter already covers the shown bump behavior. Removed the invalid customization block.
- The best-practices section stated that breaking changes in 0.x.x always bump the minor version. SemVer only states that 0.y.z is for initial development and the public API should not be considered stable. Reworded the guidance to describe minor bumps for breaking changes during 0.x.x as a common team convention rather than a SemVer rule.

## Review Notes
The release-please example is valid for manifest configuration, but a production repository must also maintain a `.release-please-manifest.json` with current versions. The GitHub Actions semantic-release example still uses `NPM_TOKEN`; npm trusted publishing with `id-token: write` is now recommended for supported GitHub Actions publishing workflows, but token-based publishing remains documented for unsupported CI and alternate registry scenarios.
