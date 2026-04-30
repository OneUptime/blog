# Validation Summary: How to Handle Orphaned Resources in State in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state management
- OpenTofu lifecycle meta-arguments
- HCL configuration
- Shell commands (`grep`, `for`)

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu `state rm` command docs: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu resource behavior docs: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu resource blocks docs, including `removed` blocks: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu state purpose docs: https://opentofu.org/docs/language/state/purpose/
- AWS provider `aws_ecs_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster.html

## Issues Found
- The post claimed that a resource deleted outside OpenTofu would cause `apply` to fail while trying to update it. I corrected this to match the docs: refresh detects the drift, and a normal plan will typically propose recreating the missing resource if it is still present in configuration.
- The Type 2 handling section implied only a state update. I clarified that `tofu apply -refresh-only` updates state and that a subsequent normal plan will typically propose recreating the resource if it remains in configuration. I also clarified that `tofu state rm` has the same practical result in this scenario.
- The bulk `tofu state rm` examples used unquoted resource addresses with `count` indexes. I quoted those addresses because the OpenTofu docs note that brackets have special meaning in Unix shells.
- The `prevent_destroy` section incorrectly implied that it protects a resource if someone removes the resource block from configuration. I corrected the explanation to match the docs: `prevent_destroy` only blocks planned destroys or replacements while the resource block remains in configuration.
- The `prevent_destroy` example used an `aws_rds_cluster` snippet that was not a minimal valid resource example. I replaced it with an `aws_ecs_cluster` example, whose required argument set is simpler and matches the provider docs.
- The audit snippet claimed to report only state entries with no corresponding config, but the command is only a heuristic over human-readable plan output. I corrected the description so it no longer overstates what the command guarantees.
- The introduction and conclusion referred to apply failures caused by externally deleted resources. I corrected that wording to the more accurate behavior described in the OpenTofu docs: drift detection and unexpected recreation plans.

## Review Notes
- OpenTofu also documents `removed` blocks as the declarative way to forget resources without destroying them. The post's use of `tofu state rm` is still valid, but `removed` blocks are worth considering in future revisions.
