# Validation Summary: How to Version Terraform Modules with Git Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform Git module sources
- Terraform Registry module versioning
- Git tags
- Semantic Versioning
- GitHub Actions
- AWS provider resources

## Sources Consulted
- Terraform documentation: module sources and Git `ref` support, https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform documentation: module block syntax and registry-only `version` argument, https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform Registry documentation: module publishing and release tag requirements, https://developer.hashicorp.com/terraform/registry/modules/publish
- Terraform Registry documentation: module versioning and version constraints, https://developer.hashicorp.com/terraform/registry/modules/use
- Git documentation: `git tag`, annotated tags, listing, sorting, and deleting tags, https://git-scm.com/docs/git-tag.html
- GitHub Actions checkout documentation: `fetch-depth: 0` and authenticated Git commands, https://github.com/actions/checkout
- GitHub Actions workflow syntax: `permissions` and `contents: write`, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Semantic Versioning 2.0.0 specification, https://semver.org/

## Issues Found
- The post said Terraform expects tags to follow semantic versioning. This is only strictly true for Terraform Registry module release tags; direct Git module sources can use any Git ref supported by `git checkout`. Updated the wording to distinguish direct Git sources from Terraform Registry releases.
- The post implied an unpinned Git module is always refreshed on every `terraform init`. Terraform installs modules during init, but existing installed modules are not generally upgraded without a fresh install or upgrade. Updated the wording to "fresh or upgraded `terraform init`."
- The repository setup section said the module "needs" to live in its own Git repository while also mentioning monorepos. Updated the wording to describe that as the approach used in the guide, not a hard requirement.
- A module example comment described a minor version range using a branch, but the code used an exact tag. Updated the comment to say it pins another exact version.
- The GitHub Actions release example used `v0.0.0` as a fallback latest tag but then ran `git log v0.0.0..HEAD`, which fails when no tag exists. Added a `COMMIT_RANGE` fallback of `HEAD` for first releases.
- The GitHub Actions release example created an annotated tag without setting a Git identity in the runner. Added `git config user.name` and `git config user.email`.
- The GitHub Actions release example pushed a tag without explicitly granting write access to repository contents. Added `permissions: contents: write`.

## Review Notes
- Terraform CLI was not installed in the local environment, so Terraform-specific syntax was reviewed against official HashiCorp documentation rather than by running `terraform validate`.
- The Git release-script logic was smoke-tested locally in a temporary Git repository with no existing tags.
