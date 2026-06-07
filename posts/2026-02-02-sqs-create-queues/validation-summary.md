# Validation Summary: How to Create SQS Queues

## Status
validated

## Post Type
Tutorial / Guide — a step-by-step walkthrough of creating Amazon SQS queues via Console, CLI, Node.js SDK (AWS SDK v3), Python SDK (Boto3), and Terraform.

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- AWS CLI (`aws sqs` commands)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`)
- AWS SDK for Python — Boto3
- Terraform (`hashicorp/aws` provider — `aws_sqs_queue`, `aws_sqs_queue_policy`)
- Dead-letter queues, redrive policies, IAM/queue policies, SNS→SQS fan-out

## Sources Consulted
- AWS SQS Developer Guide — Standard vs. FIFO queue characteristics, quotas, ordering, deduplication: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html
- AWS SQS API Reference — `CreateQueue` action, supported `Attributes` (FifoQueue, ContentBasedDeduplication, DeduplicationScope, FifoThroughputLimit, VisibilityTimeout, MessageRetentionPeriod, MaximumMessageSize, DelaySeconds, ReceiveMessageWaitTimeSeconds, RedrivePolicy): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- AWS CLI v2 reference for `aws sqs create-queue`, `get-queue-url`, `get-queue-attributes`, `list-queues`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sqs/index.html
- AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs` commands (`CreateQueueCommand`, `GetQueueUrlCommand`, `GetQueueAttributesCommand`, `SetQueueAttributesCommand`, `TagQueueCommand`): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
- Boto3 SQS client reference — `create_queue`, `get_queue_attributes`, `get_queue_url`, modeled exceptions (`QueueNameExists`, `QueueDeletedRecently`): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs/client/create_queue.html
- Terraform AWS provider — `aws_sqs_queue` and `aws_sqs_queue_policy` resource arguments (`fifo_queue`, `content_based_deduplication`, `deduplication_scope`, `fifo_throughput_limit`, `redrive_policy`, etc.): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue

## Issues Found
- **Boto3 error code mismatch** (line ~653 in original): The `except ClientError` handler compared `e.response['Error']['Code']` against `'QueueAlreadyExists'`. The actual SQS API error code (and Boto3's modeled exception name) is `QueueNameExists` — see the boto3 reference's `Client.exceptions.QueueNameExists` and the SQS API Reference. With the wrong string, the duplicate-queue branch would never execute and every conflict would be re-raised. Changed to `'QueueNameExists'`.

## Review Notes
- The post claims FIFO queues offer "exactly-once processing." This matches AWS marketing language but is more precisely "exactly-once processing within the 5-minute deduplication interval"; the post does call out the 5-minute window in the summary table, so the claim is internally consistent.
- The high-throughput-FIFO comment "Increases throughput from 300 to 3000 messages per second" is conservative — AWS has raised high-throughput FIFO quotas substantially since launch (e.g. 70,000 TPS per queue in several large regions). The stated numbers are not wrong as a floor but are out of date as a ceiling. Left as-is since the post's intent is illustrative rather than quoting current per-region quotas, which change over time.
- The Node.js examples target AWS SDK for JavaScript v3 with CommonJS `require(...)` and `SQSClient`/command-pattern usage — all imports (`CreateQueueCommand`, `GetQueueUrlCommand`, `GetQueueAttributesCommand`, `SetQueueAttributesCommand`, `TagQueueCommand`) are real exports of `@aws-sdk/client-sqs`.
- Terraform snippet uses `aws_sqs_queue` with `fifo_queue`, `content_based_deduplication`, `deduplication_scope`, `fifo_throughput_limit`, and `redrive_policy = jsonencode(...)` — all current and correct argument names for the `hashicorp/aws` provider.
- Console step list omits that the FIFO queue option only enables `ContentBasedDeduplication` / `DeduplicationScope` / `FifoThroughputLimit` settings; not a technical error, just a minor UX-flow simplification.
- DLQ examples correctly note that a FIFO main queue must use a FIFO DLQ (and vice versa), which AWS enforces.
