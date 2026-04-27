# Validation Summary: How to Version Modules with Git Tags in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (module sourcing via Git)
- Terraform module source syntax (`git::` / `?ref=`)
- Git (tags, annotated tags, listing, sorting)
- Semantic Versioning (semver)
- GitHub Actions (release workflow)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/#generic-git-repository
- Git documentation — `git tag`: https://git-scm.com/docs/git-tag
- Semantic Versioning specification: https://semver.org/
- GitHub deprecation notice for `actions/create-release`: https://github.com/actions/create-release (archived/deprecated in 2021)
- `softprops/action-gh-release` (current community-maintained replacement): https://github.com/softprops/action-gh-release
- GitHub Actions `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/security-guides/automatic-token-authentication

## Issues Found
- **Deprecated GitHub Action `actions/create-release@v1`**: This action was archived by GitHub in 2021 and is no longer maintained. Replaced with `softprops/action-gh-release@v2`, which is the widely used and maintained alternative. As part of the swap I also:
  - Renamed the input `release_name` → `name` (the input name expected by `softprops/action-gh-release`).
  - Removed the explicit `env: GITHUB_TOKEN` block, since `softprops/action-gh-release@v2` reads the token automatically from the workflow context.
  - Added `permissions: contents: write` at the job level, which is required for creating releases under the default restrictive `GITHUB_TOKEN` permissions.

## Review Notes
- The `git::https://...?ref=<tag>` source syntax is correct for OpenTofu/Terraform module sources.
- Annotated tag guidance (`git tag -a -m`) and semver mapping (breaking → MAJOR, additive → MINOR, fix → PATCH) are accurate.
- `git tag --list 'v*' --sort=-version:refname` is valid and uses the correct version-aware sort key.
- The example commit SHA `a1b2c3d4e5f6789` is only 15 hex characters — Git accepts unambiguous abbreviations, but for true reproducibility a full 40-character SHA is preferable. Left as-is since it's an illustrative placeholder and the prose explicitly says "commit SHA".
- Note for future readers: the OpenTofu Registry expects tags in the form `vX.Y.Z` (with the leading `v`), which matches the conventions used throughout the post.
