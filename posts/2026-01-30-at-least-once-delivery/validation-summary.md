# Validation Summary: How to Build At-Least-Once Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Message queues
- At-least-once delivery
- Acknowledgments and visibility timeouts
- Idempotent consumers
- Exponential backoff
- Dead letter queues
- Amazon SQS
- RabbitMQ
- Apache Kafka
- Redis Streams

## Sources Consulted
- Amazon SQS visibility timeout documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS at-least-once delivery documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- Amazon SQS standard queues documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- RabbitMQ consumer acknowledgements and publisher confirms documentation: https://www.rabbitmq.com/docs/confirms
- Confluent Kafka message delivery guarantees documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions

## Issues Found
- The queue implementation was described as storing messages in a persistent queue, but the code is explicitly in-memory. Changed the text to say the sample uses an in-memory queue and that production implementations should store messages durably.
- The exactly-once row implied literal one-time delivery. Changed it to describe effectively-once processing with transactions, deduplication, or idempotency, which is a more accurate framing for distributed systems.
- The retry-aware queue overrode `receive()` and changed visibility after the message had already been delivered, so it did not delay the next retry. Replaced that with `releaseForRetry(message)`, which is called after a failed processing attempt to set the next visibility time.
- The exponential-backoff table used attempt numbering that did not match the helper's delay calculation. Updated the table to show failed attempts and delay before redelivery.

## Review Notes
- Verified the TypeScript snippets by compiling a combined scratch file with placeholder declarations for the article's business-logic functions.
- Verified the two related OneUptime links return HTTP 200.
- The examples remain educational and in-memory. Production systems still need durable storage, atomic acknowledgment/state transitions, concurrency control, and operational safeguards.
