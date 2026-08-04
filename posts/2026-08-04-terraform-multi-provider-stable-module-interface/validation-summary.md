# Validation Summary: Terraform Is Multi-Provider, Not Cloud-Agnostic

## Status

validated

## Post Type

Technical architecture guide

## Technologies Covered

- Terraform configuration language and CLI
- Terraform modules, provider requirements, aliases, and module composition
- Terraform input validation, output preconditions, and `check` blocks
- Terraform dependency lock files and version constraints
- Terraform state, `moved` blocks, and import blocks
- HashiCorp AWS provider and Amazon S3
- HashiCorp AzureRM provider and Azure Storage Accounts
- HashiCorp Google provider and Google Cloud forwarding rules

## Sources Consulted

- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Providers within Terraform modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)
- [Terraform module composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition)
- [Terraform module `count` reference](https://developer.hashicorp.com/terraform/language/meta-arguments/count)
- [Terraform `one` function](https://developer.hashicorp.com/terraform/language/functions/one)
- [Terraform splat expressions](https://developer.hashicorp.com/terraform/language/expressions/splat)
- [Terraform type constraints and optional object attributes](https://developer.hashicorp.com/terraform/language/expressions/type-constraints)
- [Terraform output block and preconditions](https://developer.hashicorp.com/terraform/language/block/output)
- [Terraform `check` block reference](https://developer.hashicorp.com/terraform/language/block/check)
- [Terraform validation mechanisms](https://developer.hashicorp.com/terraform/language/validate)
- [Terraform `init` command](https://developer.hashicorp.com/terraform/cli/commands/init)
- [Terraform `validate` command](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform state](https://developer.hashicorp.com/terraform/language/state)
- [Terraform module refactoring and `moved` blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform import overview](https://developer.hashicorp.com/terraform/language/import)
- [AWS provider `aws_s3_bucket` resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)
- [AzureRM provider `azurerm_storage_account` resource](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account)
- [Google provider `google_compute_forwarding_rule` resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule)
- [Amazon S3 virtual-hosted-style URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html)

## Issues Found

- The giant-module discussion said every variable becomes optional and implied that unselected resources appear in plans. Changed it to state that many provider-specific inputs become optional and that Terraform still installs the referenced providers and validates the unselected configuration branches.
- The AWS `application_endpoint.uri` example returned only `bucket_regional_domain_name`, which is a hostname rather than a URI. Added the `https://` scheme so the value matches its field name and the documented TLS-endpoint contract.
- The separate-root recommendation implied that separate root directories automatically guarantee separate state. Clarified that each root must be configured with independent state, which also covers remote-backend configurations.
- The `map(any)` warning claimed that schema errors necessarily move to provider apply time. Changed it to the accurate, lifecycle-neutral statement that weak typing defers errors until Terraform consumes the values.
- The contract-test sequence placed `terraform validate` before initialization, although validation requires an initialized working directory with referenced providers and modules installed. Reordered the sequence to initialize before validating.
- Two `retention_days` arguments in the conditional module example did not match canonical `terraform fmt` alignment. Applied the formatter's spacing.

## Review Notes

The HCL examples are intentionally partial rather than standalone configurations; extracted snippets parse successfully with Terraform's formatter, while provider-backed validation and apply require the surrounding modules, variables, credentials, and test infrastructure described by the post. The example Terraform `>= 1.13, < 2.0` and AWS provider `~> 6.0` constraints are current and are explicitly presented as examples rather than universal recommendations. No deprecated Terraform language features or provider arguments were found.
