# Validation Summary: How to Automate Cost Optimization with Lambda and CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon EventBridge scheduled rules
- Amazon CloudWatch metrics and logs
- Amazon EC2 instances, EBS volumes, and EBS snapshots
- AWS Cost Explorer
- Amazon SNS
- AWS IAM
- AWS CLI
- Python and boto3

## Sources Consulted
- AWS CLI Command Reference: `events put-rule` - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: `events put-targets` - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EventBridge scheduled rule cron expressions - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EventBridge resource-based policies for Lambda targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS Lambda resource-based permissions - https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html
- boto3 CloudWatch `get_metric_statistics` documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/metric/get_statistics.html
- boto3 EC2 client and paginator documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html
- boto3 EC2 `create_snapshot` / tag specifications documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/create_snapshot.html
- boto3 Cost Explorer `get_cost_and_usage` documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html
- Python `datetime` documentation - https://docs.python.org/3/library/datetime.html
- Linked OneUptime posts were checked for availability:
  https://oneuptime.com/blog/post/2026-02-12-create-a-cost-optimization-strategy-for-aws/view and
  https://oneuptime.com/blog/post/2026-02-12-identify-idle-and-unused-aws-resources/view

## Issues Found
- The EC2, EBS volume, AMI, and snapshot scans used single `describe_*` calls, which can miss resources when AWS paginates results. Updated those examples to use boto3 paginators.
- The Cost Explorer example read only the first `get_cost_and_usage` response page. Updated it to follow `NextPageToken` and aggregate service totals across all pages.
- The Python examples used `datetime.utcnow()` or local `datetime.now()` for UTC values. Updated them to use timezone-aware `datetime.now(timezone.utc)`, matching current Python guidance.
- The snapshot retention example said cost-automation pre-deletion backups had a shorter retention period, but the code still required the general 90-day cutoff before deletion. Updated the logic so cost-automation snapshots use the intended 30-day cutoff.
- The EventBridge schedule commands added Lambda targets but did not grant EventBridge permission to invoke the Lambda functions. Added the required `aws lambda add-permission` commands for each scheduled rule.
- The IAM section described a sample policy as generic Lambda permissions. Clarified that the JSON policy is for the Lambda execution role, while EventBridge invocation uses the Lambda resource-based permissions shown in the setup commands.

## Review Notes
- The Python snippets were checked with `ast.parse` after editing and are syntactically valid.
- The local environment did not have the AWS CLI installed, so CLI verification was performed against the official AWS CLI command reference rather than local `aws --help` output.
- The examples remain intentionally simple. Production deployments should usually add dry-run modes, exception handling, allow/deny tags, region/account iteration, and explicit safeguards for stateful workloads before deleting or stopping resources.
