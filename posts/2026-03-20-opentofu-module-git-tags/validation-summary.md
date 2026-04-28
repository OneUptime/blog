# Validation Summary: Versioning OpenTofu Modules with Git Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu init`, `tofu validate`)
- Terraform / OpenTofu HCL module syntax
- Git (tagging, refs, log/show commands)
- GitHub Actions (release workflow)
- Semantic Versioning (semver)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- Git tag documentation: https://git-scm.com/docs/git-tag
- Git log documentation: https://git-scm.com/docs/git-log
- `actions/create-release` repository (archived 2021-03-04): https://github.com/actions/create-release
- `softprops/action-gh-release` v2 documentation: https://github.com/softprops/action-gh-release
- Semantic Versioning specification: https://semver.org/

## Issues Found

1. **Deprecated GitHub Action** — The release workflow used `actions/create-release@v1`, which was archived by GitHub on 2021-03-04 and is no longer maintained. Replaced with the actively maintained `softprops/action-gh-release@v2`. This required:
   - Removing the manual `env: GITHUB_TOKEN` block (the action picks up the token automatically).
   - Renaming `release_name` → `name` (the v2 input name).
   - Switching `${{ github.ref }}` (which expands to `refs/tags/v1.0.0`) to `${{ github.ref_name }}` (which expands to `v1.0.0`) so the tag/release name is clean.
   - Adding `permissions: contents: write` to the job, because GitHub-hosted runners' default GITHUB_TOKEN is read-only on newer repositories and the action needs write access to publish a release.

2. **Broken nested code-fence rendering** — The "Changelog and Release Notes" section opened a markdown code block with three backticks and embedded a nested HCL code block. The outer block was also incorrectly closed with ` ```hcl ` instead of ` ``` `, which would have left the rest of the post wrapped in an unintended code block. Fixed by switching the outer fence to four backticks (CommonMark-compliant nesting) and closing it with four backticks.

## Review Notes

- The Git tag commands (lightweight, annotated, tagging a specific commit, push semantics) are all syntactically correct.
- The OpenTofu/Terraform Git source URLs (`git::https://...//subdir?ref=...` and `git::ssh://git@...`) match the official module-source documentation.
- The `git log --tags --simplify-by-decoration --pretty="format:%d %ai"` command is valid and produces the described output.
- `actions/checkout@v4` is still current and recommended at the time of review.
- `softprops/action-gh-release@v3` exists but requires Node 24; `@v2` was chosen because it remains the broadly-compatible Node 20 line. If the post is revisited later, consider bumping to `@v3` once Node 24 runners are universal.
- The post does not mention OpenTofu's first-party module-version constraint mechanism (`version = "..."`), but that's a registry feature and out of scope for the Git-tags topic — no change made.
