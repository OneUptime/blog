# Validation Summary: How to Understand Terraform File Loading Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- HCL
- Terraform JSON configuration syntax
- Terraform override files
- Terraform input variable definition files
- Terraform CLI commands and environment variables

## Sources Consulted
- HashiCorp Developer: Files and configuration structure - https://developer.hashicorp.com/terraform/language/files
- HashiCorp Developer: Override files - https://developer.hashicorp.com/terraform/language/files/override
- HashiCorp Developer: Input variables and variable definition precedence - https://developer.hashicorp.com/terraform/language/values/variables#variable-definition-precedence
- HashiCorp Developer: JSON configuration syntax - https://developer.hashicorp.com/terraform/language/syntax/json
- HashiCorp Developer: Terraform CLI environment variables reference - https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Developer: terraform validate command - https://developer.hashicorp.com/terraform/cli/commands/validate

## Issues Found
- Override file ordering was described as `override.tf` first followed by `*_override.tf` files. Current Terraform documentation says override files are processed in lexicographical order by filename, with later files taking precedence. Updated the wording and examples to show lexicographical ordering and include JSON override file patterns.
- Regular file and override file descriptions omitted `.tf.json` override names. Updated the regular-file description to distinguish `override.tf.json` and `_override.tf.json` from regular JSON configuration files.
- Variable value precedence incorrectly placed `TF_VAR_*` environment variables last, implying they override command-line flags. Terraform treats environment variables as lower precedence than auto-loaded variable files and command-line `-var` or `-var-file` options. Rewrote the precedence list from lowest to highest.
- Auto-loaded variable files omitted `terraform.tfvars.json` and `*.auto.tfvars.json`. Added those file patterns in the explanatory text and directory examples.
- The post said `.hcl` files are for CLI configuration, which is too broad. Updated the statement to say Terraform does not load plain `.hcl` files as module configuration.
- The JSON configuration example used a `//` line comment inside a `json` fenced block. Terraform JSON configuration files must be JSON-compatible, with comments represented by ignored `"//"` properties where appropriate. Replaced the line comment with a `"//"` property.

## Review Notes
Terraform CLI was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local command execution.
