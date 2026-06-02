# Validation Summary: How to Use Terraform Moved Blocks for Resource Refactoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform moved blocks
- Terraform state
- Terraform CLI
- AWS Terraform resources
- Infrastructure as Code

## Sources Consulted
- HashiCorp Developer: moved block reference - https://docs.hashicorp.com/terraform/language/block/moved
- HashiCorp Developer: Refactor modules - https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Developer: Move resources - https://developer.hashicorp.com/terraform/cli/state/move
- HashiCorp Developer: Refactor Terraform state - https://docs.hashicorp.com/terraform/language/state/refactor
- OneUptime linked post: Terraform state conflicts and locking issues - https://oneuptime.com/blog/post/2026-02-12-terraform-state-conflicts-locking-issues/view

## Issues Found
- The post said moved blocks have "no effect after the first apply." This was too broad because they remain useful for configurations or environments that have not yet applied the move. Changed the wording to say they cause no further changes once an environment has applied them.
- The comparison table said moved blocks do not require state access. Terraform still reads state during plan/apply, so the accurate distinction is that moved blocks do not require manual state editing. Updated the table label.
- The post said the only time `terraform state mv` is still needed is when splitting or merging state files. Current HashiCorp documentation recommends configuration-driven `removed` and `import` blocks for new cross-state migrations, with `terraform state mv` as a legacy workflow. Updated the sentence to reflect that moved blocks only work within one state and to mention the current recommended approach.

## Review Notes
The resource-address examples, module move examples, count-to-for_each mapping examples, for_each instance examples, removal caveat, and chained move example align with HashiCorp's official moved-block documentation. The internal OneUptime link resolves to the intended Terraform state conflicts post.
