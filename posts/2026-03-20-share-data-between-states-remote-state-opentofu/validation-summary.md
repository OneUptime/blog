# Validation Summary: How to Share Data Between States Using Remote State in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- `terraform_remote_state` data source
- OpenTofu S3 backend
- OpenTofu workspaces
- AWS ECS Terraform provider resources

## Sources Consulted
- OpenTofu documentation: The `terraform_remote_state` Data Source - https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu documentation: Output Values - https://opentofu.org/docs/language/values/outputs/
- OpenTofu documentation: Backend Type: s3 - https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu documentation: Workspaces - https://opentofu.org/docs/language/state/workspaces/
- OpenTofu documentation: Built-in Provider - https://opentofu.org/docs/language/providers/builtin/
- HashiCorp AWS provider documentation: `aws_ecs_service` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- HashiCorp AWS provider documentation: `aws_ecs_task_definition` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown

## Issues Found
- Clarified that `terraform_remote_state` exposes root module outputs, not arbitrary resource data or nested module outputs, matching the OpenTofu remote state and output value documentation.
- Added the important access caveat that a consumer of `terraform_remote_state` must be able to read the full source state snapshot even though only outputs are exposed in configuration.
- Updated the ECS example to set `network_mode = "awsvpc"` on the task definition because `aws_ecs_service.network_configuration` is supported only with task definitions using `awsvpc`.
- Added `task_definition = aws_ecs_task_definition.api.arn` to the ECS service example because the AWS provider requires a task definition unless the service uses the `EXTERNAL` deployment controller.
- Corrected the workspace section wording from "include the workspace in the state key" to selecting the workspace with the `workspace` argument, which is how the shown `terraform_remote_state` configuration works.
- Changed "standard mechanism" to "common mechanism" and added a dedicated-store caveat for sensitive or separately controlled data, aligning the conclusion with OpenTofu's recommendation to publish shared data separately where appropriate.

## Review Notes
OpenTofu and Terraform CLIs were not installed in the local environment, so syntax was reviewed manually against official documentation rather than by running `tofu validate` or `terraform validate`.
