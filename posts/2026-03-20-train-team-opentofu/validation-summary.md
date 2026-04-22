# Validation Summary: How to Train Your Team to Use OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- Terraform configuration language / HCL
- AWS provider resources for S3
- Random provider
- OpenTofu state, locking, and encryption
- GitHub Actions
- Atlantis
- asdf
- TFLint
- Checkov

## Sources Consulted
- OpenTofu migration documentation: https://opentofu.org/docs/intro/migration/
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu write-only attributes documentation: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu 1.9 provider for_each release notes: https://opentofu.org/blog/opentofu-1-9-0/
- OpenTofu GitHub releases page: https://github.com/opentofu/opentofu
- Terraform write-only arguments documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- opentofu/setup-opentofu GitHub Action README: https://github.com/opentofu/setup-opentofu
- Atlantis repo-level configuration documentation: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- asdf OpenTofu plugin README: https://github.com/virtualroot/asdf-opentofu
- AWS provider aws_s3_bucket documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider aws_s3_bucket_versioning documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown
- Random provider random_id documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-random/main/docs/resources/id.md
- TFLint README: https://github.com/terraform-linters/tflint
- Checkov PyPI project documentation: https://pypi.org/project/checkov/
- HashiCorp BSL license announcement: https://www.globenewswire.com/news-release/2023/08/10/2723189/0/en/HashiCorp-adopts-the-Business-Source-License-for-future-releases-of-its-products.html

## Issues Found
- The Terraform-user training plan was fenced as `hcl` even though it was plain training-plan text. Changed the fence to `text`.
- The post described write-only attributes as OpenTofu-only and available in OpenTofu 1.10+. OpenTofu documents write-only attributes as 1.11+, and Terraform also documents write-only arguments in Terraform 1.11+. Updated the wording to call out OpenTofu-specific provider iteration separately and changed the version to 1.11+.
- The beginner path described TFLint as part of security scanning. TFLint is a Terraform linter; Checkov is the security/compliance scanner. Updated the wording to "Linting with TFLint and security scanning with Checkov."
- The S3 lab goal said the bucket would include tags, but the `aws_s3_bucket` resource did not set any tags. Added `Environment` and `Student` tags.
- The S3 lab used `random_id` without an explicit provider requirement. Added `hashicorp/random` to `required_providers`.
- The runbook referenced `opentofu/setup-opentofu@v1`, while the current setup action README shows `@v2`. Updated the action reference to `opentofu/setup-opentofu@v2`.
- The pinned OpenTofu example used 1.9.0 while the post teaches 1.11-only features and the current OpenTofu release line is 1.11.x. Updated the example pin and install commands to 1.11.6.
- The `.tool-versions` snippet was fenced as `hcl`; `.tool-versions` is a line-oriented version file. Changed the fence to `text`.
- The verification command used `tofu --version`; OpenTofu and the asdf plugin document `tofu version`, with `-version` as an alias. Updated the example to `tofu version`.
- The conclusion said Terraform and OpenTofu concepts and syntax are identical. OpenTofu documents compatibility as "most Terraform code will work without modification," so the wording was changed to "core concepts and most existing Terraform syntax are compatible."

## Review Notes
- The S3+DynamoDB backend lab remains technically valid. Current OpenTofu also supports native S3 lockfile locking with `use_lockfile=true`; that may be worth mentioning in a future update, but DynamoDB locking is still fully supported.
- The local environment did not have `tofu`, `terraform`, or `asdf` installed, so the lab was not executed locally. Validation was performed against official OpenTofu, provider, GitHub Action, Atlantis, asdf, TFLint, and Checkov documentation.
