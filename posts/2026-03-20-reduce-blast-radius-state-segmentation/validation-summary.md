# Validation Summary: How to Reduce Blast Radius Through State Segmentation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform (`aws_db_instance`)
- GitHub Actions
- GitHub Environments

## Sources Consulted
- OpenTofu resource behavior and lifecycle documentation: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu lifecycle meta-argument documentation: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub environments and required reviewers: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- OpenTofu setup action for GitHub Actions: https://github.com/opentofu/setup-opentofu

## Issues Found
- The `aws_db_instance` example was incomplete. As written, it omitted required resource arguments such as `engine`, plus credentials needed when creating a non-snapshot DB instance. I added `engine`, `username`, and `password` so the example matches the provider schema.
- The `ignore_changes = [snapshot_identifier]` line was not appropriate for the example and its comment was inaccurate. `ignore_changes` tells OpenTofu to ignore updates to a specific attribute during future plans; it does not mean "don't manage snapshots via OpenTofu." I removed it from the snippet.
- The GitHub Actions example used `paths` under individual jobs, which is invalid workflow syntax. Path filters belong under the triggering event such as `on.pull_request.paths`. I replaced the snippet with a valid per-segment workflow-file pattern and added the minimal `checkout`, `init`, and `plan` steps.

## Review Notes
- `prevent_destroy` is correctly presented as a safety control, but it only protects the resource while that `lifecycle` block remains in configuration.
- GitHub job approvals come from environment protection rules configured in the repository settings; `environment:` by itself only references the environment.
