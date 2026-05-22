# Validation Summary: How to Implement Self-Healing Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- GitHub Actions
- AWS Auto Scaling
- Amazon CloudWatch
- Amazon EventBridge
- AWS Lambda
- Amazon Aurora PostgreSQL / Amazon RDS
- Amazon Route 53 health checks
- Python

## Sources Consulted
- Terraform CLI plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Amazon EC2 Auto Scaling instance refresh rollback documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html
- HashiCorp AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- HashiCorp AWS provider `aws_rds_cluster_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- AWS Aurora PostgreSQL version announcement for 15.17: https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-aurora-postgresql-17-9-16-13-15-17-14-22/
- HashiCorp AWS provider `aws_cloudwatch_event_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- AWS Lambda documentation for EC2 lifecycle events: https://docs.aws.amazon.com/lambda/latest/dg/services-ec2.html
- Amazon CloudWatch alarm actions documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon CloudWatch Lambda alarm action documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-actions-Lambda.html
- HashiCorp AWS provider `aws_route53_health_check` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Amazon Route 53 health check CloudWatch metrics documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- GitHub Actions scheduled workflow documentation: https://docs.github.com/actions/reference/events-that-trigger-workflows

## Issues Found
- The GitHub Actions drift detection step used `terraform plan -detailed-exitcode | tee plan.txt` and then read `$?`, which captures the pipeline status instead of reliably preserving Terraform's detailed exit code. Updated the step to capture `${PIPESTATUS[0]}`, publish it to `$GITHUB_OUTPUT`, and fail the job on Terraform exit code 1.
- The auto-remediation step ran from the repository root while the plan file was created under `infrastructure/${{ matrix.workspace }}`. Added the same `working-directory` and adjusted the Python script path so `plan.txt` and `drift.tfplan` are found.
- The drift classifier claimed to auto-remediate only safe drift, but it returned success for any plan that did not contain one of the dangerous keywords. Updated it to require a recognized safe drift category and return manual review for unknown changes.
- The Auto Scaling Group used launch template version `$Latest` with `auto_rollback = true`. AWS does not support rollback when an ASG is configured with `$Latest` or `$Default`, and the Terraform AWS provider notes that `$Latest` will not trigger instance refresh on launch template changes. Changed it to `aws_launch_template.app.latest_version`.
- The Aurora cluster example omitted required master user configuration. Added `master_username` and `manage_master_user_password = true` so the example can create a new cluster without storing a password in Terraform state.
- The Aurora example placed `auto_minor_version_upgrade` on `aws_rds_cluster`, but the current Terraform AWS provider documents it on `aws_rds_cluster_instance`. Moved it to the cluster instance resource and added `engine_version` to the instances.
- The Aurora example set `skip_final_snapshot = false` without `final_snapshot_identifier`, which is needed when a final snapshot is created. Added `final_snapshot_identifier`.
- The Aurora PostgreSQL engine version was updated from older `15.4` to current `15.17`, based on AWS's April 2026 Aurora PostgreSQL release announcement.
- The EventBridge target for Lambda lacked the required Lambda resource policy permission. Added `aws_lambda_permission` for `events.amazonaws.com`.
- The health check alarm invoked Lambda directly but lacked the required CloudWatch alarm Lambda resource policy permission. Added `aws_lambda_permission` for `lambda.alarms.cloudwatch.amazonaws.com`.
- A comment described the EventBridge EC2 state-change rule as a CloudWatch alarm trigger. Updated the comment to say EventBridge events.

## Review Notes
The examples are still intentionally partial: referenced resources such as `aws_launch_template.app`, `aws_iam_role.remediation`, `aws_sns_topic.alerts`, variables, networking, and the Lambda deployment package are assumed to exist elsewhere. The drift classifier remains a simplified demonstration and would benefit from parsing `terraform show -json` output in production.
