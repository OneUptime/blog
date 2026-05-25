# Validation Summary: How to Handle State When Moving Resources Between Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform state management
- Terraform modules
- Terraform `moved` blocks
- Terraform CLI commands

## Sources Consulted
- HashiCorp Terraform documentation: Refactor modules - https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform documentation: `terraform state mv` command reference - https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform documentation: `terraform plan` command reference - https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform documentation: Use modules in your configuration - https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform documentation: Refactor Terraform state - https://developer.hashicorp.com/terraform/language/state/refactor
- HashiCorp Terraform tutorial: Use configuration to move resources - https://developer.hashicorp.com/terraform/tutorials/configuration-language/move-config

## Issues Found
- The cross-state-file command example used `cd project-a && ...` followed by `cd project-b && ...`. If pasted into one shell session, the first `cd` would leave the shell inside `project-a`, so `cd project-b` would only work if `project-b` were nested under `project-a`. I changed those commands to use subshells, keeping each pull and push scoped to its own project directory.

## Review Notes
- The post's core Terraform guidance is correct: `moved` blocks are supported in Terraform v1.1 and later, can move resources and module calls without replacement, and `terraform state mv` supports resource, resource-instance, and whole-module moves when source and destination addresses are compatible.
- HashiCorp documents `-state` and `-state-out` for `terraform state mv` as legacy options maintained for local state-file operations. The cross-state-file example is valid, but newer Terraform workflows may prefer declarative `removed` and `import` blocks for some state migrations.
- Terraform is not installed in this local environment, so command behavior was verified against official HashiCorp documentation rather than local CLI help.
