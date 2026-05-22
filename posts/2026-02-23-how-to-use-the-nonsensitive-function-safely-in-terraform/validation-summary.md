# Validation Summary: How to Use the nonsensitive Function Safely in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform sensitive values
- Terraform output blocks
- Terraform CLI output
- Terraform `count` and `for_each` meta-arguments

## Sources Consulted
- Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform output command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count

## Issues Found
- The post said that after calling `nonsensitive`, a value will appear in plan output, logs, and state in plaintext. Terraform records output values in state regardless of whether they are marked sensitive, so the wording could imply that sensitivity normally protects state. Updated the text to say that `nonsensitive` can expose values in Terraform CLI output and that state must be protected separately.
- The hash-prefix example said the value was "not reversible" and therefore could be safe. A SHA256 hash is not reversible, but short hash prefixes can still be risky for low-entropy secrets or weak threat models. Updated the comment to say it can be safe when the original value has enough entropy for the relevant threat model.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local command output. The remaining examples are consistent with Terraform's documented sensitivity propagation, `nonsensitive` behavior, sensitive output handling, and `for_each` restrictions.
