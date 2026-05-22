# Validation Summary: How to Use the moved Block When Refactoring Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `moved` blocks
- Terraform modules
- Terraform state management
- Terraform CLI

## Sources Consulted
- HashiCorp Terraform documentation: Refactor modules - https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform documentation: `moved` block reference - https://developer.hashicorp.com/terraform/language/moved
- HashiCorp Terraform documentation: `terraform state mv` command reference - https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform documentation: Use configuration to move resources tutorial - https://developer.hashicorp.com/terraform/tutorials/configuration-language/move-config
- HashiCorp Terraform Plugin Framework documentation: State move - https://developer.hashicorp.com/terraform/plugin/framework/resources/state-move

## Issues Found
- The limitation about cross-state moves said to use `terraform state mv` with only the `-state` flag. HashiCorp documents `-state` and `-state-out` as legacy options for local state files, and separate backends or workspaces are usually handled by removing from one state and importing into the other. Updated the text to reflect that distinction.
- The limitation about moving between different resource types said the resource type must always match. HashiCorp documents that Terraform 1.8 and later can support cross-type moved blocks when the target provider resource explicitly implements state move support. Updated the text to say cross-type moves are normally unsupported unless the provider implements that support.

## Review Notes
The remaining examples and workflow match HashiCorp's documented `moved` block use cases: renaming resources, moving resources into child modules, renaming module calls, converting between `count` and `for_each` instance keys, splitting modules, retaining moved blocks for upgrade paths, and chaining moves.
