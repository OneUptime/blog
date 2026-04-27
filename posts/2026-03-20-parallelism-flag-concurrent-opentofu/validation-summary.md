# Validation Summary: How to Use the -parallelism Flag to Control Concurrent Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform-compatible environment variables (TF_CLI_ARGS)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (aws_vpc, aws_subnet) used as examples
- Bash scripting for benchmarking

## Sources Consulted
- OpenTofu apply command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu destroy command documentation: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/

## Issues Found
No technical issues found.

All technical claims verified against official OpenTofu documentation:
- Default `-parallelism` value of 10 is correct.
- `-parallelism=n` is a valid flag on `tofu apply`, `tofu plan`, and `tofu destroy` (the latter is an alias for `tofu apply -destroy` and accepts the same options).
- `TF_CLI_ARGS_plan` and `TF_CLI_ARGS_apply` environment variables are valid and supported by OpenTofu (inherited from Terraform compatibility).
- `-target` and `-refresh=false` flags are valid.
- The HCL `aws_subnet` example with implicit dependency on `aws_vpc.main.id` is syntactically correct, and the description of dependency-aware concurrency is accurate.
- The dependency-graph behavior (independent resources run in parallel up to the parallelism limit, dependent ones wait) matches OpenTofu's documented behavior.

## Review Notes
- The benchmarking script uses `time tofu plan ... 2>&1 | tail -1`. Because `time` is a bash reserved word, its timing output goes to stderr after the pipeline completes and is not captured by `2>&1` applied to the inner command. In practice the timing line still prints to the terminal, just not necessarily through the pipe — this is a minor shell-scripting nuance rather than a technical inaccuracy in the OpenTofu content, so it was left as-is.
- OpenTofu also supports `TOFU_CLI_ARGS` / `TOFU_CLI_ARGS_<command>` as native alternatives to `TF_CLI_ARGS_*`. The post's use of `TF_CLI_ARGS_*` is correct and remains the broadly compatible choice; mentioning the `TOFU_CLI_ARGS` variant could be a useful future addition but is not required.
- The post does not pin a specific OpenTofu version. The behavior described matches current OpenTofu releases (1.x line) and has been stable, so there is no immediate risk of staleness.
