# Validation Summary: How to Use tofu import to Import Existing Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu import` CLI command and `import` block)
- Terraform-compatible HCL configuration
- AWS provider resources (`aws_s3_bucket`, `aws_instance`, `aws_iam_role`, `aws_vpc`, `aws_subnet`)
- Google Cloud provider (`google_storage_bucket`)
- Azure provider (`azurerm_resource_group`)
- Resource addressing (modules, `count`, `for_each`)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/import/
- OpenTofu `import` block documentation: https://opentofu.org/docs/language/import/
- OpenTofu state commands: https://opentofu.org/docs/cli/commands/state/list/ and `state show`
- AWS provider import documentation (registry.terraform.io/providers/hashicorp/aws): import IDs for `aws_s3_bucket`, `aws_instance`, `aws_iam_role`, `aws_vpc`, `aws_subnet`
- Google provider import documentation: `google_storage_bucket` accepts `{{name}}` or `{{project}}/{{name}}`
- Azure provider import documentation: `azurerm_resource_group` accepts full Azure resource ID

## Issues Found
No technical issues found.

All commands, syntax, and import ID formats verified:
- Basic syntax `tofu import <resource_address> <resource_id>` is correct.
- Module addressing `module.networking.aws_vpc.main` is correct.
- Shell-escaping of `count`/`for_each` indices using single quotes (`'aws_instance.web[0]'`, `'aws_s3_bucket.buckets["production"]'`) is correct and necessary in bash to prevent globbing/quote interpretation.
- `import` block HCL syntax (`to`/`id`) is correct and supported by OpenTofu.
- Resource ID formats in the table are accurate per provider docs.
- Statement that `tofu import` does not generate configuration is accurate (configuration generation is opt-in via the `-generate-config-out` flag with `import` blocks, which the post does not claim is automatic).

## Review Notes
- The CLI `tofu import` command is still supported in current OpenTofu, but the declarative `import` block (introduced in Terraform 1.5 and inherited by OpenTofu) is the recommended modern approach for new work, especially because it integrates with the plan/apply workflow and can be code-reviewed. The post correctly highlights this preference.
- The post does not mention `-generate-config-out=<file>`, which can be used together with `import` blocks to auto-generate skeleton HCL. This is out of scope for the post's focus on the CLI command and is not an inaccuracy.
- Recent versions of the AWS provider split some `aws_s3_bucket` settings into separate sub-resources (e.g. `aws_s3_bucket_versioning`, `aws_s3_bucket_acl`); the basic bucket-name import shown still works, but readers managing existing buckets in detail may need to import those companion resources separately. Not an error in the post.
