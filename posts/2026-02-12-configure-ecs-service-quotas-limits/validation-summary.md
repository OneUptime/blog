# Validation Summary: How to Configure ECS Service Quotas and Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Elastic Container Service
- AWS Fargate
- AWS Service Quotas
- Amazon CloudWatch
- AWS CLI
- Python boto3

## Sources Consulted
- Amazon ECS endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/ecs-service.html
- AWS Fargate usage metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/monitoring-fargate-usage.html
- CloudWatch usage metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html
- AWS CLI request-service-quota-increase command reference: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/request-service-quota-increase.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS Volume API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Volume.html
- AWS Config managed rules documentation: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html

## Issues Found
- Several ECS quotas were marked adjustable when AWS currently lists them as non-adjustable. Updated services per cluster, tasks per service, container instances per cluster, tasks launched per run-task, and related task definition rows to match AWS documentation.
- The task definition revisions row said "No limit." Updated it to the documented "Revisions per task definition family" quota of 1,000,000.
- The examples used stale or incorrect hardcoded quota codes for tasks per service and Fargate task quotas. Updated the examples to query quotas by name through Service Quotas.
- The Fargate section described task-count quotas. AWS currently documents Fargate vCPU resource-count quotas and launch-rate quotas, so the table, explanation, quota check, usage check, and final planning language were updated.
- The CloudWatch alarm example used an `AWS/ECS` `ServiceCount` metric that is not documented. Replaced it with the documented `AWS/Usage` `ResourceCount` metric for Fargate On-Demand vCPU usage.
- The AWS Config snippet referenced a `SERVICE_QUOTA_CHECK` managed rule that is not documented as an AWS Config managed rule. Replaced it with guidance to use Service Quotas' CloudWatch alarm integration.
- The task definition section claimed a maximum of 100 environment variables per container and 10 volumes per task. Reworded those claims to documented constraints: environment variables contribute to the task definition size, and only one Amazon EBS volume can be configured at launch.
- The API throttling table used incorrect per-action rates. Replaced it with documented ECS API quota categories and sustained/burst rates.
- The Python boto3 example caught `ecs.exceptions.ClientError`, which is not the correct boto3 exception type. Updated it to import and catch `botocore.exceptions.ClientError` and inspect the AWS error code.

## Review Notes
The AWS CLI binary was not installed in the local environment, so command validation was performed against official AWS CLI and service documentation rather than local `aws --help` output. The Python retry snippet was syntax-checked with Python AST parsing.
