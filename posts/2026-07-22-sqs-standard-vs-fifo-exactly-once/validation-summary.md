# Validation Summary: SQS Standard vs. FIFO: What Exactly-Once Processing Does and Does Not Guarantee

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Simple Queue Service (SQS) standard queues
- Amazon SQS FIFO queues, message groups, and deduplication
- AWS SDK for JavaScript v3
- AWS Lambda SQS event source mappings and partial batch responses
- PostgreSQL transactions, common table expressions, and `ON CONFLICT`
- SQS visibility timeouts, receipt handles, dead-letter queues, and redrive

## Sources Consulted
- [Amazon SQS standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
- [Exactly-once processing in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [FIFO queue delivery logic in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Amazon SQS FIFO queue key terms](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html)
- [Enabling high throughput for FIFO queues in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/enable-high-throughput-fifo.html)
- [Amazon SQS `SendMessage` API reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html)
- [Amazon SQS `GetQueueAttributes` API reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html)
- [Amazon SQS `ReceiveMessage` API reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
- [Amazon SQS `DeleteMessage` API reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Using Lambda with Amazon SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [Handling errors for an SQS event source in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [Amazon SQS examples using AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sqs_code_examples.html)
- [PostgreSQL `INSERT` documentation](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL `WITH` queries documentation](https://www.postgresql.org/docs/current/queries-with.html)

## Issues Found
- FIFO deduplication was described as though a deduplication ID always has queue-wide scope. Updated the comparison and deduplication explanation to account for the configurable `DeduplicationScope`: queue-level or message-group-level, with high-throughput FIFO requiring message-group scope.
- The PostgreSQL example used a comment to say that the business update should run only when the inbox insert returned a row, but the separate `UPDATE` statement was unconditional with respect to that result. Rewrote it as a data-modifying common table expression and gated the update with `EXISTS`; also documented the unique or primary-key constraint required by the `ON CONFLICT` target.
- The Lambda batch-failure explanation could imply immediate visibility. Clarified that failed batch records become visible again after the SQS visibility timeout expires.

## Review Notes
The JavaScript example uses the current AWS SDK for JavaScript v3 command API. The post correctly distinguishes FIFO send deduplication from consumer redelivery and correctly recommends idempotent business effects. No deprecated APIs or broken documentation links were found.
