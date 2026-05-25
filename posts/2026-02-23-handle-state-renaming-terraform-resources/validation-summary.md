# Validation Summary: How to Handle State When Renaming Terraform Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform state management
- Terraform CLI
- Terraform `moved` blocks
- Terraform resource addressing
- AWS provider resource examples

## Sources Consulted
- HashiCorp Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved
- HashiCorp Terraform module refactoring guide: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform `terraform state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Linked OneUptime related posts were checked and returned HTTP 200.

## Issues Found
- The original `count` and `for_each` sections said each instance must be moved individually when renaming a resource. Terraform resource addressing allows an omitted instance index to refer to all instances, and HashiCorp's refactoring guide states that a whole-resource move covers all instances when renaming the resource block. Updated these sections to show whole-resource moves for simple renames and explicit instance moves only when instance mappings or keys change.
- The post said `terraform plan` automatically updates state when using a `moved` block. HashiCorp's docs describe the move as being included in the execution plan, with state recorded through the normal plan/apply workflow. Updated the wording to distinguish plan from apply.
- The post said every team member gets the rename applied automatically on their next `terraform plan`. Updated this to say they see the rename in the plan and `terraform apply` records it in state.
- The cleanup guidance said moved blocks can safely be removed after the team has applied the rename. HashiCorp warns that removing `moved` blocks is a breaking change for reusable modules and recommends retaining historical moved blocks. Updated the guidance to limit removal to private configurations after all consumers have applied, and to keep historical moved blocks in reusable modules.
- The dependent resource section suggested resources may show as changed just because they reference the renamed resource. Terraform compares evaluated values, so dependent resources should not change merely because a reference address changed. Updated the section to say dependent resources should remain unchanged if underlying values are the same, and that any in-place updates or recreations should be investigated as value changes.

## Review Notes
Terraform CLI was not installed in the local workspace, so command verification was performed against the official HashiCorp CLI documentation rather than local `terraform state mv -help` output.
