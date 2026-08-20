# Validation Summary: Retry Partial Batches Without Reprocessing Successful Items

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- TypeScript
- AWS Lambda event source mappings
- Amazon SQS standard and FIFO queues
- `ReportBatchItemFailures` partial batch responses
- SQS visibility timeouts, redrive policies, and dead-letter queues
- Per-item retry scheduling, exponential backoff with jitter, and bounded concurrency
- Idempotency and application-level dead-letter handling

## Sources Consulted

- AWS Lambda, Handling errors for an SQS event source: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda, Using Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda, Creating and configuring an Amazon SQS event source mapping: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda, Parameters for Amazon SQS event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda, Event source mapping and invocation metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon SQS, Visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS, Using dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS, Queue parameters and message retention: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-queue-parameters.html
- Amazon SQS, Message and receipt-handle identifiers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html
- AWS Prescriptive Guidance, Best practices for partial batch responses: https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/best-practices-partial-batch-responses.html
- Powertools for AWS Lambda (TypeScript), Batch Processing: https://docs.aws.amazon.com/powertools/typescript/latest/features/batch/
- AWS SDKs and Tools, Retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- DefinitelyTyped, current `aws-lambda` SQS type declarations: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/trigger/sqs.d.ts

## Issues Found

- The partial-response example continued after a failed record and therefore was safe only for a standard queue, while the snippet was not labeled as such. Labeled it as a standard-queue example; the post's separate FIFO guidance remains the required stop-after-first-failure pattern.
- A rejection from `sendToApplicationDeadLetterStore` escaped the record-level catch and would make Lambda fail and replay the entire batch. Wrapped the application dead-letter write in its own `try`/`catch`, reported the original message for retry when the write fails, and made the helper's required idempotency explicit in its name and explanation.
- The delivery explanation did not distinguish a failed invocation from a caught record error or state when a partial response takes effect. Clarified that Lambda acts on a valid returned response, deletes omitted messages, and leaves reported messages eligible for redelivery after their current visibility timeout.
- The post said to persist "capped jitter," but jitter is the randomization applied to a backoff delay rather than the delay itself. Changed this to a capped exponential-backoff delay with jitter.
- The poison-item guidance implied that Lambda's SQS integration offers generic maximum-attempt or maximum-item-age controls and that an SQS message can circulate indefinitely. Replaced it with the SQS-specific `RedrivePolicy.maxReceiveCount` mechanism, reserved attempt-count or age policies for a custom scheduler, and accounted for the source's retention or age limit.
- The blanket dead-letter recommendation omitted AWS's FIFO warning. Added that moving a failed FIFO message aside lets later messages advance and breaks an otherwise unbroken operation sequence, so the application's ordering contract must permit that tradeoff.

## Review Notes

- The `SQSEvent`, `SQSBatchResponse`, `batchItemFailures`, and `itemIdentifier` usages are current. AWS's TypeScript example likewise reports `record.messageId`, not the receipt handle.
- AWS's stop-after-first-failure guidance for FIFO queues, handler-level failure behavior, at-least-once delivery warning, and recommendation to monitor record-level outcomes all match the corrected post.
- All referenced links resolved to the intended resources. The Powertools URL in the post redirects to its current canonical AWS documentation URL.
- The examples are illustrative rather than standalone: application-specific declarations such as `WorkItem`, `classify`, and the processing helpers are intentionally omitted.
