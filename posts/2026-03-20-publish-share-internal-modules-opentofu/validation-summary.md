# Validation Summary: How to Publish and Share Internal Modules for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform module source syntax and module registries
- Git and semantic version tags
- GitHub Actions
- GitHub CLI
- terraform-docs

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu publishing modules documentation: https://opentofu.org/docs/language/modules/develop/publish/
- OpenTofu module registry protocol: https://opentofu.org/docs/v1.8/internals/module-registry-protocol/
- OpenTofu private registries documentation: https://opentofu.org/docs/cli/private_registry/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- `terraform-docs` usage and output file docs: https://terraform-docs.io/how-to/insert-output-to-file/
- `terraform-docs` markdown formatter reference: https://terraform-docs.io/reference/markdown/
- `terraform-docs/gh-actions` README: https://github.com/terraform-docs/gh-actions
- GitHub Docs, using GitHub CLI in workflows: https://docs.github.com/actions/advanced-guides/using-github-cli-in-workflows
- GitHub CLI manual for `gh release create`: https://cli.github.com/manual/gh_release_create
- Git `tag` documentation: https://git-scm.com/docs/git-tag.html

## Issues Found
- The monorepo section said each module in the repository was "independently versioned." With Git-based distribution, tags apply to repository objects and are consumed via a repository-level `ref`, so that phrasing was misleading for a monorepo layout. I changed the sentence to describe stable module paths instead.
- The `terraform-docs` example used a generic `terraform-docs markdown . > README.md` command while showing table-style README output, and the snippet was marked as `hcl` even though it was Markdown. I updated it to the documented README generation pattern using `markdown table`, changed the code fence to Markdown, and corrected the Requirements row to `terraform`, which matches current `terraform-docs` output.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, which is no longer the current documented major version. I updated it to `@v2`.
- The docs step in the GitHub Actions workflow generated README output without checking it into source control or failing on drift, which does not reliably ensure released docs stay current. I changed it to a docs verification step using `terraform-docs/gh-actions` with `output-method: replace` and `fail-on-diff: "true"`.
- The release step used the archived `actions/create-release` action pattern. I replaced it with the official GitHub CLI approach, added `contents: write` permissions, and set `GH_TOKEN` so the example will authenticate correctly on GitHub-hosted runners.

## Review Notes
- The Git source examples using `git::https://...//modules/...?...ref=` are correct for OpenTofu, including the placement of the subdirectory before the query string.
- The private registry module source example `registry.your-org.com/networking/vpc/aws` is consistent with the OpenTofu module registry address format, and the separate `version` argument is correct for registry-sourced modules.
- The workflow now assumes module READMEs are committed before tagging and that `CHANGELOG.md` exists at repository root when creating the GitHub release.
