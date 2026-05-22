# Validation Summary: How to Use the dependencies Block in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu
- Infrastructure as Code
- HCL configuration
- Dependency orchestration and execution order

## Sources Consulted
- Terragrunt HCL Blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt Run Queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/

## Issues Found
- The post used the older `terragrunt run-all` command form. Current Terragrunt documentation uses `terragrunt run --all`, so the affected command examples and heading were updated.
- The Destroy Order Safety example said the load balancer would be destroyed before target groups that reference it. Terragrunt reverses dependency order for destroy operations, so the comment was corrected to say target groups are destroyed before the load balancer they reference.

## Review Notes
The `dependencies` block syntax, `paths` attribute, distinction from the singular `dependency` block, output access behavior, and dependency graph ordering behavior were otherwise consistent with the official Terragrunt documentation.
