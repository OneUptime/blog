# Validation Summary: How to Fix 'Queue Not Found' Errors in RabbitMQ

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ queues, virtual hosts, queue durability, exclusive queues, auto-delete queues, and queue TTL
- RabbitMQ CLI (`rabbitmqctl`)
- RabbitMQ HTTP API
- Python Pika client
- Node.js amqplib client
- Bash monitoring script

## Sources Consulted
- RabbitMQ Queues documentation (https://www.rabbitmq.com/docs/queues)
- RabbitMQ Time-To-Live and Expiration documentation (https://www.rabbitmq.com/docs/ttl)
- RabbitMQ Command Line Tools documentation (https://www.rabbitmq.com/docs/cli)
- RabbitMQ HTTP API Reference (https://www.rabbitmq.com/docs/http-api-reference)
- RabbitMQ JavaScript Work Queues tutorial showing `assertQueue` and `sendToQueue` durability options (https://www.rabbitmq.com/tutorials/tutorial-two-javascript)
- Pika channel API documentation for `queue_declare`, `basic_publish`, and `queue_delete` (https://pika.readthedocs.io/en/stable/modules/channel.html)
- amqplib Channel API reference for `assertQueue`, `sendToQueue`, and channel failure behavior (https://amqp-node.github.io/amqplib/channel_api.html)

## Issues Found
1. **Opening explanation incorrectly implied publishing to a missing queue normally raises `NOT_FOUND`.** RabbitMQ raises `NOT_FOUND` for operations such as consuming from, passively declaring, or inspecting a missing queue. Publishing to the default exchange with a missing queue is an unroutable publish rather than a queue-not-found channel exception in the usual case. Updated the opening sentence to describe the error as occurring when consuming from, inspecting, or passively declaring a missing queue.
2. **Node.js `autoDelete` comment described deletion as happening when the queue is empty.** RabbitMQ auto-delete queues are deleted after they have had at least one consumer and the last consumer is cancelled or disconnected. Updated the comment to say the queue is not deleted when consumers disconnect.
3. **The custom virtual host example used `/production`, which can be read as a path rather than a vhost name.** RabbitMQ virtual host names may include slashes, but using `production` makes the example clearer and keeps the Pika connection parameter aligned with the `rabbitmqctl -p` command. Updated both examples to use `production`.
4. **Auto-delete queue examples omitted the prior-consumer condition.** RabbitMQ auto-delete behavior is tied to consumer cancellation or disconnection after the queue has been used by a consumer. Updated the comments and lifecycle diagram label accordingly.
5. **Queue expiration comment implied exact deletion after one hour.** RabbitMQ guarantees deletion after a queue has been unused for at least the expiration period, but not exactly at that instant. Updated the comment to "after at least 1 hour of inactivity."

## Review Notes
- The code examples use current Pika and amqplib APIs and are syntactically valid as illustrative snippets.
- The monitoring script is acceptable for a simple example, but production monitoring should prefer the RabbitMQ HTTP API, Prometheus metrics, or a dedicated monitoring integration instead of repeatedly parsing CLI output.
- The post intentionally uses classic durable queue examples. New RabbitMQ tutorials often show quorum queues for durable work queues, but the classic queue examples remain technically valid.
