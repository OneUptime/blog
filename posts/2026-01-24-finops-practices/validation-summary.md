# Validation Summary: How to Handle FinOps Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FinOps Framework
- AWS Cost Explorer and AWS Budgets
- AWS EC2 and CloudWatch metrics
- AWS SNS
- Terraform and the AWS provider
- Python and boto3
- Kubernetes CronJobs, kubectl, and jq
- GitHub Actions
- Infracost
- Mermaid diagrams

## Sources Consulted
- FinOps Foundation: FinOps Phases - https://www.finops.org/framework/phases/
- AWS Cost Explorer GetCostAndUsage API - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- boto3 Cost Explorer client documentation - https://docs.aws.amazon.com/goto/boto3/ce-2017-10-25/GetCostAndUsage
- Amazon EC2 CloudWatch instance metrics - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS CloudWatch Agent memory metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- AWS Compute Optimizer rightsizing documentation - https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html
- AWS Budgets SNS topic policy documentation - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- Terraform AWS provider aws_budgets_budget resource documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform input variable validation documentation - https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- Terraform timestamp function documentation - https://developer.hashicorp.com/terraform/language/functions/timestamp
- Kubernetes CronJob documentation - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job restartPolicy documentation - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- GitHub Actions workflow syntax documentation - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Infracost GitHub Actions documentation - https://github.com/infracost/actions

## Issues Found
- The Mermaid diagram reused `Inform`, `Optimize`, and `Operate` as both node IDs and subgraph IDs. I changed the subgraph IDs to unique IDs while preserving the displayed labels.
- The Terraform tagging example used `formatdate("YYYY-MM-DD", timestamp())` in resource tags. Terraform documents that `timestamp()` changes every run and causes recurring diffs in resource attributes, so I removed the unstable `created_date` tag from the example.
- The Cost Explorer Python example used naive local datetimes for date boundaries. I changed these to timezone-aware UTC dates.
- The right-sizing Python example claimed to fetch CPU and memory metrics, but it only queried EC2 `CPUUtilization`. I corrected the docstring and replaced deprecated `datetime.utcnow()` usage with `datetime.now(timezone.utc)`.
- The Kubernetes PVC waste detector compared `namespace/name` PVC values against bare claim names, so it would report bound PVCs as unused. I changed the pod volume query to include the pod namespace.
- The Kubernetes CronJob used Bash process substitution while invoking `/bin/sh`. I replaced it with POSIX-compatible `sort` and `comm` file operations and changed `echo -e` calls to `printf`.
- The deployment cleanup comment said it found deployments scaled to zero for over 7 days, but the command only checks `spec.replicas == 0`. I corrected the comment to match the actual check.
- The AWS Budgets Terraform example attached SNS topic subscribers without granting AWS Budgets permission to publish to the topic. I added an SNS topic policy for `budgets.amazonaws.com` and explicit budget dependencies on that policy.
- The AWS Budgets tag cost filter used an unsafe Terraform string for the `TagKey$TagValue` format. I changed it to the provider-documented interpolation pattern.
- The GitHub Actions/Infracost workflow used non-existent/outdated `infracost/actions/cost-estimate@v3` and `infracost/actions/comment@v3` actions. I replaced it with the current `infracost/actions/diff@v4` workflow shape and added the required pull request permissions.

## Review Notes
- The boto3 examples do not paginate Cost Explorer or EC2 responses, so they are suitable as simplified examples but would need pagination for large accounts.
- The right-sizing script is intentionally simplified and still points readers to AWS Compute Optimizer for production recommendations.
- Terraform was not installed in the review environment, so HCL validation was performed against official provider and Terraform language documentation rather than `terraform validate`.
- Python code blocks were parsed with `ast.parse` successfully.
