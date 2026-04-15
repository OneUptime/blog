# Validation Summary: How to Use Dapr AWS SQS Binding for Message Queuing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings building block)
- AWS SQS (Standard and FIFO queues)
- Node.js / Express
- Dapr JavaScript SDK (`@dapr/dapr`)
- AWS CLI

## Sources Consulted
- Dapr AWS SQS Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/sqs/
- Dapr Input Binding Triggers: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- AWS SQS Developer Guide (queue attributes, DLQ, long polling, FIFO)
- Dapr JavaScript SDK documentation

## Issues Found

### 1. Undocumented Dapr metadata fields in component YAML
**What was wrong:** The Standard Queue Configuration included `waitTimeSeconds`, `visibilityTimeoutSeconds`, `messageRetentionPeriod`, `deadLetterQueueName`, and `maxReceiveCount` as Dapr component metadata fields. The FIFO Queue Configuration included `fifo` and `messageGroupField`. None of these fields are documented in the official Dapr SQS binding spec. The only supported metadata fields are: `queueName`, `region`, `endpoint`, `accessKey`, `secretKey`, `sessionToken`, and `direction`.
**What was changed:** Removed all undocumented metadata fields from both YAML configurations. Added explanatory text that queue-level settings (DLQ, long polling, visibility timeout, retention) must be configured directly on the SQS queue via AWS CLI or console. Added `direction: "input, output"` to the standard config as it is a documented field. Added AWS CLI commands for setting long polling and visibility timeout on the queue.

### 2. Fabricated `x-aws-sqs-receipt-handle` HTTP header
**What was wrong:** The consumer code referenced `req.headers["x-aws-sqs-receipt-handle"]` to obtain the SQS receipt handle. Dapr does not pass SQS receipt handles through to the application — it manages message acknowledgment internally based on the HTTP response code.
**What was changed:** Removed the `receiptHandle` variable and the header reference from the consumer code.

### 3. Incorrect DLQ handling logic in consumer
**What was wrong:** The consumer code returned HTTP 200 for permanent errors with the comment "Let DLQ handle it after max retries." This is incorrect — returning 200 tells Dapr to delete the message from SQS, which means the message will never reach the DLQ. The SQS DLQ mechanism relies on messages exceeding `maxReceiveCount` without being deleted, which only happens when the consumer returns a non-200 response.
**What was changed:** Simplified the error handling to always return 500 on failure. Added a comment explaining that after `maxReceiveCount` failures, SQS automatically moves the message to the DLQ. Removed the now-unnecessary `isTransientError` helper function.

### 4. Long Polling section referenced non-existent Dapr metadata
**What was wrong:** The section stated that `waitTimeSeconds: "20"` in Dapr metadata enables long polling. This is not a supported Dapr SQS binding metadata field.
**What was changed:** Updated the section to explain that long polling is configured directly on the SQS queue using the `ReceiveMessageWaitTimeSeconds` attribute via AWS, not through Dapr metadata.

## Review Notes
- The Dapr SQS binding spec is minimal (7 metadata fields). Many SQS features (DLQ, FIFO ordering, long polling, retention) must be configured at the AWS queue level. The post now accurately reflects this separation of concerns.
- The AWS CLI commands for creating queues and setting redrive policies are correct.
- The Dapr JS SDK usage (`client.binding.send`) and the input binding endpoint pattern (`POST /<binding-name>`) are correct per official documentation.
- The `create` operation for the output binding is the only supported operation, and is used correctly.
