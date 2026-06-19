# Validation Summary: How to Handle Async Processing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Async processing
- Message queues
- Redis
- BullMQ
- RabbitMQ
- Pika
- Kafka
- kafka-go
- Prometheus
- TypeScript
- Python
- Go

## Sources Consulted
- BullMQ retrying failing jobs: https://docs.bullmq.io/guide/retrying-failing-jobs
- BullMQ timeout jobs pattern: https://docs.bullmq.io/patterns/timeout-jobs
- BullMQ WorkerOptions API: https://api.docs.bullmq.io/interfaces/v4.WorkerOptions.html
- RabbitMQ dead letter exchanges: https://www.rabbitmq.com/docs/dlx
- RabbitMQ queues and durability: https://www.rabbitmq.com/docs/queues
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ Prometheus monitoring: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Python work queues tutorial: https://www.rabbitmq.com/tutorials/tutorial-two-python
- Pika channel API: https://pika.readthedocs.io/en/stable/modules/channel.html
- kafka-go README and examples: https://github.com/segmentio/kafka-go
- kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go
- Apache Kafka documentation: https://kafka.apache.org/documentation/

## Issues Found
- The BullMQ setup snippet imported `Worker` and `Job` in `queue.ts` without using them, while the worker snippet used `EmailJob` and `connection` without importing them. I exported `connection`, `EmailJob`, and `ReportJob` from `queue.ts`, removed unused imports, and imported the shared types and connection in the worker.
- The Express route imported `reportQueue` but did not use it. I removed the unused import.
- The RabbitMQ worker imported Python's `time` module without using it. I removed the unused import.
- The Kafka producer imported Go's `log` package without using it. I removed the unused import.
- The Kafka producer used `kafka.LeastBytes{}` while claiming the message key ensured per-order ordering. `LeastBytes` does not key-partition messages, so I changed it to `kafka.Hash{}` and updated the comment.
- The Kafka consumer used `time.Second` without importing `time`, and configured `CommitInterval` even though the example describes committing only after successful processing. I removed `CommitInterval` to keep commits synchronous and removed the invalid need for the `time` import.
- The Kafka consumer set `StartOffset` together with a consumer group. I removed it because consumer group offsets should be managed through committed group offsets rather than this standalone reader setting.
- The RabbitMQ dead-letter example was shown as YAML in `rabbitmq.conf`, which is not a valid way to define per-queue dead-letter arguments. I replaced it with the documented `rabbitmqctl set_policy` form using `dead-letter-exchange` and `dead-letter-routing-key`.
- The BullMQ retry options used a `timeout` field in job options, but current BullMQ job options do not provide that job timeout option. I replaced it with valid retry options and a worker-side `AbortController` timeout helper, matching the documented timeout pattern.

## Review Notes
- The RabbitMQ DLX policy assumes the `dlx` exchange and a bound dead-letter queue already exist. A future revision could show those declarations explicitly.
- The RabbitMQ publisher marks messages persistent and declares durable queues, which is correct for persistence, but publisher confirms would be needed for stronger producer-side delivery confirmation.
- The Prometheus alert examples use RabbitMQ queue metrics; per-queue labeling may require RabbitMQ's per-object or detailed metrics endpoint depending on the Prometheus plugin configuration.
