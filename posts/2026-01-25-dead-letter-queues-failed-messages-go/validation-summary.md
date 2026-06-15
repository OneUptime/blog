# Validation Summary: How to Handle Failed Messages with Dead Letter Queues in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Dead letter queues
- Message queues
- Error handling
- Retry logic
- Exponential backoff

## Sources Consulted
- Go `errors` package documentation: https://pkg.go.dev/errors
- Go `context` package documentation: https://pkg.go.dev/context
- Go `time` package documentation: https://pkg.go.dev/time
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Amazon SQS dead-letter queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS dead-letter queue retention documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/setting-up-dead-letter-queue-retention.html
- RabbitMQ dead letter exchange documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ consumer acknowledgement documentation: https://www.rabbitmq.com/docs/confirms

## Issues Found
1. **Go-specific error wording**: The introduction said a Go handler "throws" an unexpected error. Updated it to say the handler returns an unexpected error, matching Go's explicit error-return model.
2. **Closed consume channels were not handled**: Both consumer loops read from channels without checking the `ok` value. Updated them to return an error if the broker closes the message channel instead of repeatedly processing zero-value messages.
3. **Messages could be lost when DLQ publish failed**: The processor acknowledged the original message even if publishing to the DLQ failed. Updated `sendToDLQ` to return an error and changed the processor to acknowledge only after a successful DLQ publish.
4. **Error classification was not integrated with processing**: The processor described permanent error handling but only checked retry counts. Updated it to send permanent errors to the DLQ immediately with `!IsRetryable(err)`.
5. **Wrapped classified errors were not detected**: `IsRetryable` used a direct type assertion, so it would miss classified errors wrapped with `fmt.Errorf("%w", err)`. Added `Unwrap` to `ClassifiedError` and switched detection to `errors.As`.
6. **Retry logging was misleading on the final attempt**: The exponential backoff example logged that it was backing off even after the last failed attempt. Updated it to log backoff only when another attempt remains.
7. **DLQ replay could acknowledge before successful republish**: The DLQ consumer ignored JSON marshal and publish errors when replaying a message, then acknowledged the DLQ message. Updated it to acknowledge only after a successful republish.
8. **DLQ retention advice was provider-specific without caveat**: The best-practice note suggested a fixed 30-day TTL, which does not fit every queue provider or retention limit. Updated it to recommend retention based on SLA and provider limits.

## Review Notes
- The `Queue` interface remains intentionally generic, so broker-specific details such as RabbitMQ `basic.nack`, SQS visibility timeout changes, redrive policies, and retention limits are still implementation concerns for a real adapter.
- The `paymentHandler` snippet references application-specific `PaymentRequest` and `processPayment` symbols; this is acceptable as illustrative application code, not a standalone package.
