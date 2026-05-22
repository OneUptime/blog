# Validation Summary: How to Implement Blue-Green Deployments with Terraform CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Elastic Load Balancing Application Load Balancer listener rules and target groups
- AWS EC2 Auto Scaling groups and launch templates
- GitHub Actions
- hashicorp/setup-terraform
- aws-actions/configure-aws-credentials
- Shell scripting with Terraform CLI

## Sources Consulted
- Terraform AWS provider documentation for `aws_lb_listener_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- AWS Elastic Load Balancing documentation for weighted target group forwarding: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- Terraform AWS provider documentation for `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider documentation for `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider documentation for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform CLI documentation for `terraform output`: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output block documentation: https://developer.hashicorp.com/terraform/language/block/output
- Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- hashicorp/setup-terraform documentation: https://github.com/hashicorp/setup-terraform
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The app environment module used `var.vpc_id` in the target group without declaring the variable or passing it from the root module. Added `vpc_id` to both module calls and declared `variable "vpc_id"` in the module snippet.
- The module accepted `security_groups` but did not apply them to the launch template. Added `vpc_security_group_ids = var.security_groups` to `aws_launch_template`.
- The CI examples used `terraform output -raw active_environment`, `blue_version`, and `green_version` without defining those root outputs. Added root output blocks for the active environment and both deployed versions.
- The CI `terraform apply` examples only passed the changed variable, which would fail or reset values when required version variables are not provided elsewhere. Updated deploy, switch, rollback, and weighted-shift snippets to preserve and pass both version variables.
- The weighted routing formula and pipeline only worked correctly in one deployment direction. Replaced the conditional target-group weights with direct blue/green weighting and made the pipeline compute weights based on the actual target environment.
- Updated `hashicorp/setup-terraform` usage from `@v3` with Terraform `1.7.0` to `@v4` with Terraform `1.14.6` to match the current documented setup action examples.

## Review Notes
The examples remain illustrative and assume supporting resources exist, including networking, security groups, ALB listener, AMI data source, IAM role trust for GitHub OIDC, and environment-specific health endpoints. The Terraform and GitHub Actions syntax is otherwise consistent with the consulted documentation.
