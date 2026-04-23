# Validation Summary: How to Right-Size Instances Using OpenTofu Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu variables, locals, conditionals, dynamic blocks, and `jsonencode`
- AWS EC2 instances and launch templates
- Amazon RDS for PostgreSQL
- Amazon ECS task definitions
- Amazon EC2 Auto Scaling scheduled actions
- Amazon ElastiCache node types
- Amazon EC2 Spot Instances
- AWS Compute Optimizer
- Infracost CLI

## Sources Consulted
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu local values: https://opentofu.org/docs/language/values/locals/
- OpenTofu conditional expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu dynamic blocks: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu types and map/object indexing: https://opentofu.org/docs/language/expressions/types/
- Terraform AWS provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_autoscaling_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- Terraform AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon EC2 Auto Scaling scheduled scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon EC2 Spot pricing and best practices: https://aws.amazon.com/ec2/spot/pricing/ and https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS Compute Optimizer supported resources: https://docs.aws.amazon.com/compute-optimizer/latest/ug/supported-resources.html
- Amazon ElastiCache supported node types: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html
- Infracost CLI commands: https://www.infracost.io/docs/features/cli_commands/

## Issues Found
- The RDS example pinned `engine_version = "15.4"`, but Amazon RDS marks PostgreSQL 15.4 as having reached the end of standard support. Changed it to `engine_version = "15"` so RDS selects a recent supported minor release for PostgreSQL 15.
- The RDS example omitted required master-user configuration for a new `aws_db_instance`. Added `username = var.db_username` and `manage_master_user_password = true`, matching the AWS provider's managed password option.
- The ECS task definition omitted the required `family` argument. Added `family = "${var.environment}-api"`.
- The Infracost command attempted to pass Terraform directories to `infracost diff --compare-to`. Infracost documents `--compare-to` for an Infracost JSON baseline/run, so the example now generates JSON cost snapshots with `infracost breakdown` and compares those files.
- The auto-shutdown wording said the schedule stops instances, but `aws_autoscaling_schedule` changes Auto Scaling group capacity. Updated the wording to scale down dev ASGs and clarified the instance-hour cost claim.
- The Spot Instance best-practice bullet stated a fixed 70% discount for `t3.medium`. AWS documents Spot savings as variable and up to 90% compared to On-Demand, so the bullet now uses that caveated wording.
- The Compute Optimizer recommendation was made more precise by noting that recommendations apply to supported resources.

## Review Notes
- The snippets assume surrounding declarations exist, including `var.environment`, `var.api_image`, `var.db_username`, `var.spot_max_price`, `data.aws_ami.amazon_linux`, and `aws_autoscaling_group.app`.
- Consider adding validation for `var.environment` in a future update so invalid values fail with a clear message before `local.instance_sizes[var.environment]` is evaluated.
