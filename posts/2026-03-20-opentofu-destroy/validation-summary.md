# Validation Summary: How to Use tofu destroy to Remove Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform (compatible commands)
- HCL (lifecycle blocks, resource configuration)
- GitHub Actions (CI/CD workflow example)
- AWS provider resources (used in examples: aws_s3_bucket, aws_instance, aws_security_group, aws_rds_cluster)
- Bash scripting (workspace teardown script)

## Sources Consulted
- OpenTofu CLI docs — destroy command: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu CLI docs — plan command (-destroy flag): https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs — apply/plan flags (-auto-approve, -target, -var, -var-file): https://opentofu.org/docs/cli/commands/apply/
- OpenTofu workspace commands: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu lifecycle meta-argument (prevent_destroy): https://opentofu.org/docs/language/meta-arguments/lifecycle/
- HCL language identifier rules (resource/module naming with hyphens)
- GitHub Actions docs — pull_request event with `closed` type: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request

## Issues Found
No technical issues found.

## Review Notes
- The destroy order example is correct: when `aws_instance.web` depends on `aws_security_group.web`, the instance must be destroyed first because the security group cannot be removed while it is still attached to a running instance. The post correctly conveys reverse-dependency order.
- The `tofu workspace delete` flow correctly switches to `default` first, since OpenTofu does not allow deletion of the currently-selected workspace.
- The `pull_request` event with `types: [closed]` triggers on both merged and closed-without-merge PRs — this is the intended behavior for ephemeral environment teardown, so no caveat is needed.
- `-target` is intentionally documented in the OpenTofu CLI as an exceptional convenience for recovering from mistakes; this is not flagged in the post but the surrounding "Use with caution" guidance for `-auto-approve` is sufficient context for a short tutorial.
- The `prevent_destroy` lifecycle rule will block `tofu destroy` (and any plan that would destroy the resource) — it must be temporarily set to `false` and re-applied to allow legitimate destruction. The post accurately describes the protective behavior; mentioning the temporary-disable workflow could be a future enhancement but is not required for correctness.
