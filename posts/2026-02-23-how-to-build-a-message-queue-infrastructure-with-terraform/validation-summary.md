# Validation Summary: How to Build a Message Queue Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon SQS
- Amazon SNS
- Amazon MQ for RabbitMQ
- AWS Lambda event source mappings
- Amazon CloudWatch alarms
- AWS KMS encryption

## Sources Consulted
- Terraform AWS Provider `aws_sqs_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider `aws_sns_topic_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS Provider `aws_mq_broker` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/mq_broker
- Terraform AWS Provider `aws_lambda_event_source_mapping` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon SQS standard queue delivery documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- Amazon SQS dead-letter queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS long polling documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html
- Amazon SQS high throughput FIFO documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/enable-high-throughput-fifo.html
- Amazon SNS to SQS subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Amazon MQ RabbitMQ version management documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-management.html
- Amazon MQ RabbitMQ version support documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-support.html
- Amazon MQ RabbitMQ deployment options documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html
- AWS Lambda SQS event source mapping parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda SQS event source mapping scaling documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html

## Issues Found
- The introduction described message queues as providing "guaranteed delivery." For SQS standard queues, AWS documents at-least-once delivery and possible duplicate deliveries. Changed this to "durable, at-least-once delivery."
- The SNS fan-out example subscribed an `analytics_queue`, but the deployment section did not create that module. Added a matching `analytics_queue` module block so the Terraform references are internally consistent.
- The Amazon MQ example used RabbitMQ `3.12`, which reached end of support on Amazon MQ on March 17, 2025. Updated the broker to RabbitMQ `4.2`, the current recommended Amazon MQ RabbitMQ version.
- Because Amazon MQ documents RabbitMQ `4.2` support on `mq.m7g` instance types, updated the example broker instance from `mq.m5.large` to `mq.m7g.large`.

## Review Notes
The SQS, SNS, CloudWatch alarm, FIFO queue, and Lambda event source mapping arguments match current Terraform AWS provider and AWS service documentation. The SNS filter policies shown use the default message-attribute filter scope, so publishers must set the `event_type` SNS message attribute for those filters to match.
