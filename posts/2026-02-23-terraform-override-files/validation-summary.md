# Validation Summary: How to Use Override Files in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HCL
- Terraform override files
- Terraform JSON configuration
- Terraform backends
- Terraform AWS provider
- Terraform modules

## Sources Consulted
- HashiCorp Terraform documentation: Override Files - https://developer.hashicorp.com/terraform/language/files/override
- HashiCorp Terraform documentation: Files and configuration structure - https://developer.hashicorp.com/terraform/language/files
- HashiCorp Terraform documentation: S3 backend - https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform documentation: Provider block reference - https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp Terraform documentation: Module block reference - https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform Registry documentation: HashiCorp AWS provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post described only `.tf` override filenames in its main naming guidance, while Terraform also recognizes `override.tf.json` and `*_override.tf.json`. Updated the naming sections and `.gitignore` example to include JSON override filenames.
- The post stated that `override.tf` is processed first among overrides, followed by `*_override.tf` files alphabetically. Official Terraform documentation says override files are processed in lexicographical filename order, then by position in each file. Updated the ordering explanation and example.
- The post stated that multiple nested blocks of the same type are matched by position. Official Terraform documentation says nested blocks in an override replace all nested blocks of the same type in the original block, and nested block contents are not merged. Updated the multiple nested block example and result.
- The S3 backend example used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile locking with `use_lockfile`. Updated the example to use `use_lockfile = true`.
- The module source override example changed a registry module with a `version` argument to a local source. Since override merging would leave `version` in the merged module block, and `version` is only valid for registry module sources, the merged local-source example could be invalid. Updated the remote source example to use a Git source with a `ref` query parameter instead of a registry-only `version` argument.

## Review Notes
Terraform CLI was not installed in the local environment, so validation was performed against official HashiCorp Terraform documentation and the Terraform Registry documentation for the AWS provider.
