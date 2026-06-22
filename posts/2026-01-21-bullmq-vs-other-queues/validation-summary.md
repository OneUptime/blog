# Validation Summary: BullMQ vs Other Queue Systems (RabbitMQ, SQS)

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- BullMQ
- Redis
- RabbitMQ
- AMQP 0-9-1
- amqplib
- AWS SQS
- AWS SDK for JavaScript v3
- TypeScript
- AWS Lambda
- Amazon SNS / EventBridge

## Sources Consulted
- BullMQ documentation: https://docs.bullmq.io/
- BullMQ FIFO jobs: https://docs.bullmq.io/guide/jobs/fifo
- BullMQ flows: https://docs.bullmq.io/guide/flows
- BullMQ rate limiting: https://docs.bullmq.io/guide/rate-limiting
- BullMQ Job Schedulers: https://docs.bullmq.io/guide/job-schedulers
- BullMQ events: https://docs.bullmq.io/guide/events
- RabbitMQ queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ priority queues documentation: https://www.rabbitmq.com/docs/priority
- RabbitMQ dead letter exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ delayed message exchange plugin: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Amazon SQS queue types: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html
- Amazon SQS delay queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html
- Amazon SQS ReceiveMessage API: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- Amazon SQS standard queue quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS message timers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html
- Amazon SQS message quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- AWS Lambda SQS event source parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- Amazon SQS pricing: https://aws.amazon.com/sqs/pricing/

## Issues Found
- The RabbitMQ examples used default imports and a `Connection` type that do not match the current `amqplib` type shape in common TypeScript setups. Updated them to use namespace imports and `ChannelModel` / `Channel` types.
- The feature matrix described RabbitMQ priority as `0-255`. Updated it to `1-255, queue argument` because RabbitMQ priority queues must be enabled with `x-max-priority`.
- The RabbitMQ delayed-job entry said a plugin is required. Updated it to mention TTL/DLX as well as the delayed-message plugin.
- The BullMQ repeatable-jobs entry used older terminology. Updated it to refer to Job Schedulers while noting legacy repeatable jobs.
- The SQS routing row said "queue per topic". Updated it to queue URLs with SNS/EventBridge for fanout.
- The DLQ comparison was too broad. Updated BullMQ, RabbitMQ, and SQS wording to distinguish BullMQ's failed set/manual DLQ pattern, RabbitMQ DLX configuration, and SQS redrive policies.
- The FIFO and persistence rows were too absolute. Added caveats for BullMQ/RabbitMQ ordering and SQS retention-limited durability.
- The RabbitMQ architecture comment grouped federation with built-in clustering. RabbitMQ supports federation through its federation plugin, so the wording was changed to "support".
- The SQS architecture comment generalized at-least-once delivery across SQS. Updated it to specify standard queues, since FIFO queues have different ordering and deduplication semantics.
- The SQS performance claim mixed a fixed 3,000 messages/second number with standard queues. Reworded the benchmark as illustrative and clarified that standard queues scale automatically to very high throughput.
- The SQS use-case and decision-matrix language implied unlimited/global behavior. Updated it to "very high managed throughput", regional queues, and automatic scaling within SQS quotas.

## Review Notes
The remaining performance and cost examples are illustrative rather than guaranteed benchmark results. Real throughput, latency, and monthly cost depend heavily on batching, polling behavior, worker concurrency, broker topology, Redis/RabbitMQ sizing, AWS Region, and request count.
