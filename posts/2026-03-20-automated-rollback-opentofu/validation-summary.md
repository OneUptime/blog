# Validation Summary: How to Set Up Automated Rollback Strategies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon ECS
- Amazon CloudWatch
- Amazon SNS
- GitHub Actions
- Git
- Terraform AWS provider

## Sources Consulted
- OpenTofu settings: https://opentofu.org/docs/language/settings/
- AWS Lambda weighted aliases: https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- Amazon ECS deployment circuit breaker: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- GitHub Actions events that trigger workflows: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions workflow dispatch REST API: https://docs.github.com/en/rest/actions/workflows
- AWS provider `aws_lambda_alias` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_alias.html.markdown
- AWS provider `aws_ecs_service` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_lambda_permission` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- AWS provider `aws_sns_topic_subscription` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sns_topic_subscription.html.markdown
- Git `revert` documentation: https://git-scm.com/docs/git-revert/2.50.0.html
- `actions/checkout` action: https://github.com/actions/checkout
- `aws-actions/configure-aws-credentials` action: https://github.com/aws-actions/configure-aws-credentials
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu

## Issues Found
- The Git rollback example used `git revert HEAD`, which opens an editor by default and is a poor fit for an automated rollback example. I changed it to `git revert --no-edit HEAD`.
- The ECS example comment said `deployment_maximum_percent` and `deployment_minimum_healthy_percent` define successful deployment criteria. They do not; they control rolling update capacity during deployment. I corrected the comment.
- The CloudWatch alarm example used `metric_name = "5XXError"` with the `AWS/ApplicationELB` namespace. That metric name does not exist for Application Load Balancers. I changed it to `HTTPCode_Target_5XX_Count` and updated the surrounding comment to match.
- The GitHub Actions workflow included `workflow_call` and implied a Lambda could invoke it directly. GitHub documents `workflow_call` for reusable workflows called by other workflows, while external systems should trigger `workflow_dispatch` or `repository_dispatch`. I removed `workflow_call` and clarified that the Lambda dispatches the workflow through the GitHub REST API.
- The workflow example used stale action major versions. I updated `actions/checkout` to `v6`, `aws-actions/configure-aws-credentials` to `v6`, and `opentofu/setup-opentofu` to `v2` to match the current documented majors.

## Review Notes
- The Lambda alias example is technically sound for weighted alias rollback, but AWS only allows an alias to split traffic between two published versions, and the alias cannot point to `$LATEST`.
- The ALB alarm example now uses a valid target 5xx metric, but because it is scoped only by `LoadBalancer`, it aggregates across all target groups behind that ALB. On a shared ALB, add a `TargetGroup` dimension for service-specific rollback behavior.
- The post’s Terraform snippets are partial examples rather than complete runnable modules; readers still need surrounding variables, IAM resources, and archive definitions that are referenced but not shown.
- Passing a GitHub token through Terraform variables can expose the secret in Terraform state. A production implementation should prefer a GitHub App token flow or another secret-management pattern.
