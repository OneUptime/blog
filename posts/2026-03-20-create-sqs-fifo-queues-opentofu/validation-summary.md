# Validation Summary: How to Create AWS SQS FIFO Queues with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — Infrastructure-as-Code recipes for provisioning AWS SQS FIFO queues using OpenTofu (Terraform AWS provider).

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS SQS (FIFO queues, dead letter queues, queue policies, encryption)
- AWS KMS (server-side encryption for SQS)
- AWS IAM (queue access policies)
- AWS Lambda (event source mappings, scaling configuration, partial batch responses)

## Sources Consulted
- Terraform AWS provider — `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider — `aws_sqs_queue_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider — `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- AWS Developer Guide — Using Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda API Reference — CreateEventSourceMapping: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS SQS Developer Guide — FIFO queues, deduplication, redrive policies, KMS encryption

## Issues Found
1. **`maximum_batching_window_in_seconds` set on a FIFO Lambda event source mapping** — The original example included `maximum_batching_window_in_seconds = 0` in the `aws_lambda_event_source_mapping` for the FIFO queue. Per the Terraform AWS provider documentation, this argument is "Only available for stream sources (DynamoDB and Kinesis) and SQS standard queues." The AWS Lambda Developer Guide also describes batch windows exclusively in the context of SQS standard queues. Setting it on a FIFO event source mapping is not a valid configuration. **Fix applied:** removed the `maximum_batching_window_in_seconds = 0` line and its accompanying comment.

## Review Notes
- All other `aws_sqs_queue` attributes used in the post (`name`, `fifo_queue`, `content_based_deduplication`, `visibility_timeout_seconds`, `message_retention_seconds`, `receive_wait_time_seconds`, `kms_master_key_id`, `kms_data_key_reuse_period_seconds`, `redrive_policy`, `tags`) are valid and correctly used.
- `redrive_policy` JSON keys (`deadLetterTargetArn`, `maxReceiveCount`) are correct AWS SQS attribute names.
- The DLQ for a FIFO queue must itself be a FIFO queue — the post correctly demonstrates this.
- `aws_sqs_queue.<name>.id` returning the queue URL is correct, so `queue_url = aws_sqs_queue.orders.id` in the queue policy is valid.
- For SQS FIFO event source mappings: `batch_size` max is 10 (the post uses 10, which is correct). `function_response_types = ["ReportBatchItemFailures"]` is the only valid value.
- `scaling_config { maximum_concurrency = 5 }` is valid — minimum is 2, maximum is 1000 (without quota increase). The post's value of 5 is within range. Note: for FIFO, Lambda already serializes processing per message group, so `maximum_concurrency` controls overall concurrency rather than ordering directly, but the author's comment is loose enough to be acceptable.
- Limits cited in the post are accurate: max `message_retention_seconds` = 1209600 (14 days), max `receive_wait_time_seconds` = 20, FIFO deduplication interval = 5 minutes, `kms_data_key_reuse_period_seconds` valid range 60–86400.
- "Exactly-once processing" is the official AWS marketing terminology for FIFO queues; the claim is consistent with AWS documentation.
- Minor stylistic observation (not a technical error): the two `aws_sqs_queue` resources `orders` and `orders_with_dlq` both declare `name = "orders.fifo"`, which would collide if applied together. This is fine as illustrative snippets shown in isolation, but readers copy-pasting both into the same root module would get a name conflict.
