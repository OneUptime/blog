# Validation Summary: Use EventBridge Pipes for Point-to-Point Integrations

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon EventBridge Pipes
- Amazon EventBridge rules
- Amazon SQS
- AWS Lambda
- AWS Step Functions
- DynamoDB Streams
- Kinesis Data Streams
- Amazon MSK and Apache Kafka
- Amazon MQ
- AWS CloudFormation
- AWS CLI
- Amazon CloudWatch metrics
- IAM execution roles and policies

## Sources Consulted
- Amazon EventBridge Pipes user guide: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html
- Creating an Amazon EventBridge pipe: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-create.html
- Amazon EventBridge Pipes sources: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-event-source.html
- Amazon EventBridge Pipes targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-event-target.html
- Amazon SQS as a source in EventBridge Pipes: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-sqs.html
- Event source permissions for Amazon EventBridge Pipes: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-permissions.html
- Amazon EventBridge Pipes batching and concurrency: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-batching-concurrency.html
- Amazon EventBridge Pipes input transformation: https://docs.amazonaws.cn/en_us/eventbridge/latest/userguide/eb-pipes-input-transformation.html
- AWS CLI create-pipe command reference: https://docs.aws.amazon.com/cli/latest/reference/pipes/create-pipe.html
- AWS::Pipes::Pipe CloudFormation resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-pipes-pipe.html
- AWS::Pipes::Pipe PipeSourceParameters CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-pipes-pipe-pipesourceparameters.html
- AWS::Pipes::Pipe PipeEnrichmentParameters CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-pipes-pipe-pipeenrichmentparameters.html
- AWS::Pipes::Pipe PipeTargetStateMachineParameters CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-pipes-pipe-pipetargetstatemachineparameters.html
- Logging and monitoring Amazon EventBridge Pipes: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-monitoring.html

## Issues Found
No technical issues found in the current post content.

## Review Notes
The local AWS CLI is not installed in this environment, so CLI syntax was checked against the official AWS CLI command reference rather than local `aws --help` output. The supported targets section is intentionally a representative list rather than the complete current target catalog; future revisions could mention additional supported targets such as AWS Batch, Firehose, Redshift Data API, SageMaker AI Pipeline, and Timestream for LiveAnalytics.
