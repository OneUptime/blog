# Validation Summary: How to Implement At-Most-Once Delivery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- At-most-once delivery semantics
- UDP
- Node.js `dgram`
- RabbitMQ
- `amqplib`
- Apache Kafka
- KafkaJS
- HTTP `fetch`
- `AbortController`

## Sources Consulted
- Node.js UDP/datagram sockets documentation: https://nodejs.org/api/dgram.html
- Node.js global `fetch` and `AbortController` documentation: https://nodejs.org/api/globals.html
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ consumers documentation: https://www.rabbitmq.com/docs/consumers
- KafkaJS producing messages documentation: https://kafka.js.org/docs/producing
- KafkaJS consuming messages documentation: https://kafka.js.org/docs/consuming
- KafkaJS client retry configuration documentation: https://kafka.js.org/docs/configuration
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/info/rfc768/

## Issues Found
- The KafkaJS producer sample set `acks: 0` on `kafka.producer(...)`, but KafkaJS documents `acks` as a `producer.send(...)` option. Moved `acks: 0` into the send call.
- The KafkaJS producer sample used `retries: 0`, but KafkaJS configures retries through the `retry` object. Changed it to `retry: { retries: 0 }`.
- The KafkaJS consumer sample claimed auto-commit committed offsets before processing. KafkaJS documents that resolved offsets are committed after processing batches. Changed the sample to disable auto-commit and call `consumer.commitOffsets(...)` before processing each message, committing `offset + 1`.
- The Kafka offset increment initially would have been unsafe with JavaScript `Number` for large Kafka offsets, so the fixed code uses `BigInt`.
- The HTTP fire-and-forget sample created an `AbortController` timeout but cleared it immediately after scheduling `fetch`, so the timeout would not abort slow requests. Moved `clearTimeout(timeoutId)` into the fetch promise's `finally` handler and retained cleanup for synchronous errors.
- The message-queue explanation implied Kafka consumer behavior was implemented only by disabling acknowledgments. Adjusted the wording to distinguish disabled publisher acknowledgments from avoiding redelivery after consumer failures.

## Review Notes
- The JavaScript code fences were checked locally with Node.js `vm.Script` syntax parsing.
- The examples remain illustrative and omit production concerns such as connection lifecycle handling, backpressure from UDP and AMQP send buffers, malformed JSON handling, and Kafka consumer group rebalance edge cases.
