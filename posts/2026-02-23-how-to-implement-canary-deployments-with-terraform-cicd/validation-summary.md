# Validation Summary: How to Implement Canary Deployments with Terraform CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS ECS
- AWS Application Load Balancer
- Amazon CloudWatch
- AWS CLI
- GitHub Actions
- aws-actions/configure-aws-credentials
- hashicorp/setup-terraform

## Sources Consulted
- Terraform AWS provider `aws_lb_listener_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Elastic Load Balancing listener rule action documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CLI `cloudwatch get-metric-statistics` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The workflow did not pass `stable_version` in several `terraform apply` commands even though the Terraform example declares `stable_version` as a required variable. I added a required `stable_version` `workflow_dispatch` input and passed it to the deploy, gradual promotion, and rollback applies so Terraform does not prompt or fail for a missing variable.
- The `monitor-canary` job called `aws cloudwatch get-metric-statistics` without configuring AWS credentials in that job. GitHub-hosted runner jobs are separate runner environments, and `aws-actions/configure-aws-credentials` exports credentials for the job where it runs. I added a credential configuration step to the monitoring job.

## Review Notes
- The Terraform snippets are partial examples and still assume surrounding resources and variables exist, including `aws_ecs_cluster.main`, `aws_lb_listener.https`, `aws_lb.main`, `aws_sns_topic.alerts`, and `var.vpc_id`.
- The custom CloudWatch metric query for `App/Canary` `ErrorRate` is syntactically valid AWS CLI usage, but it assumes the application publishes that custom metric with the exact `DeploymentType=canary` dimension.
- Terraform and the AWS CLI were not installed in the local workspace, so validation was performed against official documentation rather than local command execution.
