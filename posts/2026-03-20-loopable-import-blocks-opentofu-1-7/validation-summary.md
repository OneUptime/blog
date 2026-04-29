# Validation Summary: How to Use Loopable Import Blocks Introduced in OpenTofu 1.7

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu import blocks
- OpenTofu CLI (`tofu plan`, `tofu apply`)
- AWS provider resources (`aws_s3_bucket`, `aws_iam_role`, `aws_security_group`, `aws_subnet`)

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu 1.7 "What's new" documentation: https://opentofu.org/docs/v1.7/intro/whats-new/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu generating configuration documentation: https://opentofu.org/docs/v1.11/language/import/generating-configuration/
- OpenTofu repository tags API for release/version verification: https://api.github.com/repos/opentofu/opentofu/tags?per_page=100&page=1
- AWS provider `aws_iam_role` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post said import blocks were introduced in "OpenTofu 1.5". That version reference was incorrect for OpenTofu release history, so I removed the 1.5 attribution and reworded the introduction and section heading.
- The post said loopable import blocks could be combined with `tofu plan -generate-config-out` to generate configuration. Official OpenTofu import docs state that configuration generation is currently not possible when `for_each` is used on an `import` block. I corrected the configuration-generation section, the complete workflow, the IAM role note, and the summary to reflect that loopable imports require manual resource configuration.
- The post said import blocks should be removed after import as if that were required. Official docs say they can be removed or kept as a record. I updated that section to make removal optional.

## Review Notes
- The code examples are otherwise consistent with current documented import-block syntax for OpenTofu 1.7, including `for_each` on `import` blocks and resource addresses targeting root resources and module resources.
- The OpenTofu 1.7 documentation is no longer actively maintained, so this review cross-checked both the 1.7 feature docs and the current import/plan docs where the behavior remains documented.
