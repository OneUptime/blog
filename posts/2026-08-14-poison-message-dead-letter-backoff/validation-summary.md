# Validation Summary: Stop Poison Messages with Bounded Retries and a Dead-Letter Queue

## Status
validated

## Post Type
Technical guide / reliability best practices

## Technologies Covered
- Message queues and at-least-once delivery
- Dead-letter queues and dead-letter exchanges
- Amazon SQS standard and FIFO queues
- Amazon SQS visibility timeouts, redrive policies, redrive velocity, and CloudWatch metrics
- RabbitMQ 4.3 quorum queues and dead-letter exchanges
- AMQP 0.9.1 acknowledgements, negative acknowledgements, and publisher confirms
- Bounded retries, backoff, jitter, idempotency, and deduplication
- JSON diagnostic envelopes

## Sources Consulted
- Amazon SQS dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS DLQ redrive: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html
- Amazon SQS FIFO delivery logic: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- Amazon SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Amazon SQS `ReceiveMessage` API: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- Amazon SQS `CreateQueue` API and redrive-policy attributes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- RabbitMQ dead-letter exchanges: https://www.rabbitmq.com/docs/dlx
- RabbitMQ quorum queues and poison-message handling: https://www.rabbitmq.com/docs/quorum-queues#poison-message-handling
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ publisher routing and unroutable-message handling: https://www.rabbitmq.com/docs/publishers#unroutable-message-handling
- RabbitMQ broker transaction semantics: https://www.rabbitmq.com/docs/semantics
- RabbitMQ reliability guide: https://www.rabbitmq.com/docs/reliability
- RabbitMQ TTL and expiration: https://www.rabbitmq.com/docs/ttl
- AWS transactional outbox guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Issues Found
- The post said not to identify a poison message from a single failure. This conflicted with its correct recommendation to dead-letter conclusively permanent validation failures immediately. The wording now exempts failures that are conclusively permanent.
- The post described at-least-once delivery as an inherent property of "the queue." Delivery guarantees depend on the service and acknowledgement configuration. The sentence now states the duplicate-delivery consequence conditionally for at-least-once delivery.
- The post called a broker delivery count authoritative. Amazon SQS exposes `ApproximateReceiveCount`, and RabbitMQ counters do not necessarily equal handler executions. The guidance now says to use broker-maintained delivery or receive counts only when their semantics match the retry policy. A RabbitMQ 4.3 caveat was added because AMQP 0.9.1 `basic.nack` requeues do not increment the quorum queue's `delivery-count`.
- The FIFO explanation said one in-flight message blocks every later message in its group. Amazon SQS can return multiple messages from the same group in one receive call. The text now explains that in-flight messages prevent additional messages from that group from being returned by subsequent receive requests.
- The RabbitMQ DLX trigger list said messages "expired by TTL," which could be read as including queue expiration. RabbitMQ does not dead-letter a queue's contents when the queue itself expires. The text now specifies message TTL.
- The SQS section said redrive does not transform messages. Although SQS does not support filtering or modifying message contents during redrive, it treats redriven messages as new and assigns a new message ID and enqueue time. The text now states both behaviors.
- The publish-and-ack paragraph listed transactions and publisher confirmations as if either alone made the handoff safe. RabbitMQ transactions are not atomic across the source queue and DLQ, and publisher confirmation alone does not establish successful routing. The paragraph now requires broker-supported at-least-once dead-lettering or an application protocol that verifies routing and waits for publisher confirmation before acknowledging the source, while retaining the duplicate-delivery warning for the crash window.

## Review Notes
- The retry-policy block is conceptual pseudocode and is internally consistent after the delivery-count clarification.
- The diagnostic-envelope example is syntactically valid JSON.
- No terminal commands or executable configuration snippets are present.
- All five links in the post's Official Documentation section resolve to the intended current AWS or RabbitMQ pages.
- RabbitMQ's at-least-once dead-lettering remains opt-in for a source quorum queue and requires the documented dead-letter strategy, overflow behavior, exchange configuration, and feature flag where applicable. The post's qualified wording is accurate.
