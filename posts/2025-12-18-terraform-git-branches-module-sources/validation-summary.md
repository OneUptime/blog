# Validation Summary: How to Use Git Branches as Terraform Module Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Git module sources
- GitHub and GitLab authentication
- GitHub Actions caching
- Renovate configuration

## Sources Consulted
- HashiCorp Terraform module configuration documentation: https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Renovate custom regex manager documentation: https://docs.renovatebot.com/modules/manager/regex/
- Renovate configuration options: https://docs.renovatebot.com/configuration-options/#custommanagers
- GitHub Actions dependency caching reference: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitLab CI job token documentation: https://docs.gitlab.com/ci/jobs/ci_job_token/
- Git command/config help from local Git 2.43.0

## Issues Found
- The post said Terraform's `source` argument does not support variable interpolation and must be a literal string. Current Terraform documentation allows source expressions only when they are known during configuration loading, such as constant input variables and local values derived from them. Updated the note to preserve broad compatibility advice while reflecting current behavior.
- The production section described tags and commit SHAs as immutable references. Git tags can be moved unless protected by repository policy, while full commit SHAs provide stronger reproducibility. Updated the wording to use "stable references", "protected tags", and full commit SHA examples.
- The Renovate example used `regexManagers` and `fileMatch`, which are superseded by `customManagers` with `customType: "regex"` and `managerFilePatterns` in current Renovate documentation. Updated the configuration snippet accordingly.
- The Renovate snippet was labeled as JSON but included a `// renovate.json` comment, and it used the older `config:base` preset. Removed the comment and updated the preset to `config:recommended`, which Renovate documents as the typical onboarding preset.
- The GitHub Actions cache example used `actions/cache@v3`. Version 3 remains supported in some cases, but current GitHub documentation examples use `actions/cache@v4`; updated the snippet to v4.

## Review Notes
The Terraform Git source examples, `ref` query usage, subdirectory `//path` placement before query parameters, `terraform init -upgrade`, Git credential configuration patterns, and lock file explanation are consistent with the consulted documentation. Terraform CLI was not installed locally, so Terraform command validation was performed against official HashiCorp documentation rather than local `terraform --help` output.
