# Validation Summary: How to Fix 'Precondition Failed' Errors in RabbitMQ

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- Pika Python client
- rabbitmqctl
- RabbitMQ Management HTTP API
- Python

## Sources Consulted
- RabbitMQ Queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ Channels documentation: https://www.rabbitmq.com/docs/channels
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Command Line Tools guide: https://www.rabbitmq.com/docs/cli
- Pika Channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika BlockingConnection documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html

## Issues Found
- The passive declaration example reused the same Pika channel after `ChannelClosedByBroker`. RabbitMQ channel-level exceptions close the channel, so a failed passive declaration for a missing queue leaves that channel unusable. Updated the example to create a new channel before declaring the queue.
- The production retry example retried after a failed passive declaration without reopening the channel. Updated the inner exception handler to reconnect before continuing because the failed passive declaration also closes the channel.

## Review Notes
- The post's core explanation is accurate: RabbitMQ raises a `406 PRECONDITION_FAILED` channel error when an existing queue or exchange is redeclared with non-equivalent properties.
- The RabbitMQ HTTP API examples use the default `/` vhost encoded as `%2f` and default `guest:guest` credentials, which are appropriate for local examples but should be changed for production deployments.
