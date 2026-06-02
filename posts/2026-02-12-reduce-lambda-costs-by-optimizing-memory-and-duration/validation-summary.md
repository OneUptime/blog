# Validation Summary: How to Reduce Lambda Costs by Optimizing Memory and Duration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch metrics
- AWS CLI
- AWS Serverless Application Repository
- AWS CloudFormation change sets
- AWS Step Functions
- AWS Lambda Power Tuning
- Python
- Boto3

## Sources Consulted
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- AWS Lambda configuration troubleshooting and memory/CPU allocation: https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-configuration.html
- AWS Lambda execution environment lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda CloudWatch metric types: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS CLI `cloudwatch get-metric-statistics` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI `serverlessrepo create-cloud-formation-change-set` reference: https://docs.aws.amazon.com/cli/latest/reference/serverlessrepo/create-cloud-formation-change-set.html
- AWS Serverless Application Repository deployment guide: https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-consume.html
- Boto3 Lambda `ListFunctions` paginator reference: https://docs.aws.amazon.com/boto3/latest/reference/services/lambda/paginator/ListFunctions.html
- Boto3 CloudWatch `get_metric_statistics` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- The Lambda pricing bullets presented x86 on-demand pricing as universal. Updated the wording to clarify that request pricing varies by region and that `$0.0000166667` per GB-second is the x86 first-tier rate in many US regions.
- The duration billing wording said "rounded to the nearest millisecond." Updated it to "billed in 1-millisecond increments" to match AWS Lambda billing language.
- The CloudWatch baseline command was described as pulling the most expensive Lambda functions, but it only queried one function's `Duration` metric. Updated the description and comment to match what the command actually does.
- The Serverless Application Repository command created a CloudFormation change set but did not execute it, so it did not actually deploy Lambda Power Tuning. Updated the snippet to capture `ChangeSetId` and run `aws cloudformation execute-change-set`.
- The Lambda Power Tuning memory list stopped at `3008`, an old Lambda-era limit. Updated the example to include current higher memory settings up to `10240`.
- The memory/cost example said moving from `128MB` to `512MB` only doubled memory and produced a 50% cost reduction. Corrected the math: that change quadruples memory; a 90% duration reduction yields a 60% cost reduction.
- The cold-start section referred to scheduled CloudWatch events. Updated this to EventBridge, the current service name for scheduled rules.
- The ARM64 section described Graviton2 as a free win for most workloads. Updated it to clarify the 20% lower duration pricing and the need for runtime and dependency compatibility.
- The p99 CloudWatch command used `--statistics p99`, which is invalid for percentiles. Updated it to `--extended-statistics p99`.
- The Python cost script used `list_functions()` without pagination, so it could miss functions. Updated it to use the Boto3 Lambda paginator.
- The Python cost script inferred invocations from the `Duration` metric's sample count. Updated it to query the Lambda `Invocations` metric with the `Sum` statistic.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against official AWS CLI documentation rather than local `--help` output.
- The cost estimates still use x86 first-tier Lambda duration pricing and do not include free tier, tiered pricing, Compute Savings Plans, Provisioned Concurrency, ephemeral storage, or architecture-specific ARM pricing.
