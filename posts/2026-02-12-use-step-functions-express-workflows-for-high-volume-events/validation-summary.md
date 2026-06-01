# Validation Summary: How to Use Step Functions Express Workflows for High-Volume Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions Standard Workflows
- AWS Step Functions Express Workflows
- Amazon States Language
- AWS CLI
- Amazon CloudWatch Logs
- Amazon API Gateway
- Amazon EventBridge and EventBridge Pipes
- Amazon SQS
- Amazon Kinesis
- Amazon SNS
- Amazon DynamoDB
- AWS Lambda with Python and boto3

## Sources Consulted
- AWS Step Functions: Choosing workflow type: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions service quotas: https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- AWS Step Functions pricing: https://aws.amazon.com/step-functions/pricing/
- AWS CLI create-state-machine reference: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/create-state-machine.html
- AWS Step Functions CloudWatch Logs execution history documentation: https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Step Functions Distributed Map documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html
- AWS Step Functions ResultPath documentation: https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultpath.html
- Amazon EventBridge Pipes sources: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-event-source.html
- Amazon EventBridge Pipes targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-event-target.html
- Amazon API Gateway integration timeout announcement: https://aws.amazon.com/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/

## Issues Found
- The IoT workflow's critical-reading branch called the enrichment Lambda without a `ResultPath`, so the task result would replace the branch input and the following DynamoDB task could lose access to `$.deviceId`, `$.validation`, and `$.enrichment.location`. Added `ResultPath: "$.enrichment"` to preserve the original input and store enrichment data under the path used later.
- The SQS/Kinesis section implied Lambda is the required bridge for those event sources. Updated the text to mention EventBridge Pipes, which supports SQS and Kinesis sources with Step Functions state machine targets, while keeping the Lambda example for custom pre-processing.
- The CloudWatch Logs `ERROR` and `FATAL` descriptions were too narrow. Updated them to match AWS's event-level logging behavior more accurately.
- The wrap-up suggested combining Express Workflows with Distributed Map without the important limitation that Distributed Map mode is supported in Standard workflows, not Express workflows. Updated the sentence to describe a Standard Workflow with Distributed Map and Express child workflows.

## Review Notes
- The core Standard versus Express comparison, execution duration limits, execution semantics, execution history retention, create-state-machine CLI options, synchronous/asynchronous execution commands, and cost comparison are consistent with current AWS documentation.
- Synchronous Express workflows can run for up to five minutes through the AWS CLI or SDK, but API Gateway integrations may need timeout configuration and may be constrained by API Gateway timeout quotas.
