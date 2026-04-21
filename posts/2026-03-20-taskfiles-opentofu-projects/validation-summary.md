# Validation Summary: How to Create Taskfiles for OpenTofu Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- Taskfile / go-task
- YAML task configuration
- TFLint
- Trivy IaC scanning

## Sources Consulted
- Task installation documentation: https://taskfile.dev/docs/installation
- Task guide for includes, task calls, dependencies, variables, and up-to-date checks: https://taskfile.dev/docs/guide
- Taskfile schema reference for `includes`, `vars`, `cmds`, `deps`, `prompt`, `sources`, `generates`, `preconditions`, and `watch`: https://taskfile.dev/docs/reference/schema
- Taskfile version documentation: https://taskfile.dev/docs/taskfile-versions
- OpenTofu CLI commands overview: https://opentofu.org/docs/cli/commands/
- OpenTofu environment variables, including `TF_CLI_ARGS_name`: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `fmt` command documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu validation documentation: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu provisioning workflow documentation: https://opentofu.org/docs/v1.9/cli/run/
- TFLint official repository and CLI usage: https://github.com/terraform-linters/tflint
- tfsec official repository migration notice: https://github.com/aquasecurity/tfsec
- Trivy Terraform configuration scanning documentation: https://trivy.dev/docs/dev/tutorials/misconfiguration/terraform/

## Issues Found
- The advanced `includes` example pointed `dev` and `staging` back to `./Taskfile.yml`, which creates an include cycle in Task. Changed the example to use a wrapper `Taskfile.yml` that includes reusable tasks from `Taskfile.opentofu.yml`.
- The `watch-validate` task was indented under `includes`, so it would be parsed as an include entry rather than a task. Moved it under a proper `tasks:` block and routed it through an internal `current` include.
- The `ENVIRONMENT` and `REGION` variables used shell commands, which worked for environment-variable usage but prevented include-level variables from overriding `ENVIRONMENT`. Replaced them with Task template defaults so both `task plan ENVIRONMENT=staging` and included environment namespaces work.
- The `plan` task passed `-var-file` explicitly while `TF_CLI_ARGS_plan` already supplied the same flag. Removed the duplicate command-line flag and left the OpenTofu-supported `TF_CLI_ARGS_plan` configuration in place.
- The running examples used POSIX-style `ENVIRONMENT=staging task ...`, which is not portable to Windows shells. Changed them to Task's cross-platform CLI variable form, such as `task plan ENVIRONMENT=staging`.
- The security scan task used `tfsec`, whose official repository now directs users toward Trivy. Replaced it with `trivy config .`, which is the current Trivy command for Terraform/OpenTofu-style IaC misconfiguration scanning.
- Updated the `fmt` task description from "Terraform files" to "OpenTofu configuration files" to match OpenTofu's `tofu fmt` documentation.

## Review Notes
- The OpenTofu saved plan workflow is technically correct, but saved plan files can contain sensitive values and should be treated as sensitive artifacts.
- TFLint remains valid for Terraform-compatible OpenTofu projects, but projects using OpenTofu-specific language features should verify their selected TFLint version and plugins support the files they lint.
