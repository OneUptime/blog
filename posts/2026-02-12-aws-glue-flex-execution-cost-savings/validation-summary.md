# Validation Summary: How to Use AWS Glue Flex Execution for Cost Savings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Glue
- AWS Glue Flex execution class
- AWS CLI
- AWS Glue triggers and workflows
- Amazon EventBridge
- Amazon SNS
- AWS CloudFormation

## Sources Consulted
- AWS Glue job runs API and execution class documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-runs.html
- AWS Glue FAQ, including Flex support and interruption behavior: https://aws.amazon.com/glue/faqs/
- AWS Glue pricing page: https://aws.amazon.com/glue/pricing/
- AWS Glue worker type specifications: https://docs.aws.amazon.com/glue/latest/dg/worker-types.html
- AWS CLI `glue create-job` command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/create-job.html
- AWS CLI `glue update-job` command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/update-job.html
- AWS CLI `glue create-trigger` command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/create-trigger.html
- AWS CLI `glue update-trigger` command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/update-trigger.html
- AWS Glue EventBridge automation documentation: https://docs.aws.amazon.com/glue/latest/dg/automating-awsglue-with-cloudwatch-events.html
- AWS CloudFormation `AWS::Glue::Job` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-glue-job.html

## Issues Found
- The post said Flex jobs have no preemption and run to completion once started. AWS states Flex jobs use non-dedicated capacity that can be reclaimed; interrupted jobs fail and are retried according to the job retry settings. I replaced the no-preemption claim with accurate retry and variable-runtime language.
- The post said execution speed is the same once running and implied zero performance impact. AWS documents that start and completion times may vary, so I changed this to describe same supported Spark job capabilities while noting variable runtime.
- The post implied all Glue features work identically. Flex is only supported for AWS Glue Spark jobs on Glue 3.0 or later with `glueetl`; Python shell and streaming jobs are not supported. I added that version and job-type constraint.
- The `aws glue update-job` example only sent `ExecutionClass`. AWS CLI documentation says omitted `JobUpdate` configuration is removed or reset to defaults. I changed the example to fetch the current job fields, set `ExecutionClass` to `FLEX`, and update using a JSON file while warning to preserve existing fields.
- The delayed-start CloudWatch alarm used `glue.driver.aggregate.elapsedTime`, which measures ETL elapsed time and does not include bootstrap/startup time. I replaced it with Glue delay notifications and an EventBridge rule for `Glue Job Run Status` events.
- The candidate guidance did not mention retry and downstream dependency risk. I added language warning against Flex where downstream dependencies cannot tolerate retries or variable completion times.

## Review Notes
The pricing example is region-sensitive, but the cited $0.44 standard DPU-hour and $0.29 Flex DPU-hour values are consistent with AWS's current public pricing examples as reviewed on 2026-06-03. The CloudFormation job snippet uses valid `ExecutionClass`, `GlueVersion`, `WorkerType`, `NumberOfWorkers`, and `Command` properties for a Glue Spark ETL job.
