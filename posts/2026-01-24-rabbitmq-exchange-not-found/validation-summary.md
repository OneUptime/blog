# Validation Summary: How to Fix 'Exchange Not Found' Errors in RabbitMQ

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 exchanges, queues, bindings, and virtual hosts
- Pika Python client
- rabbitmqctl
- rabbitmqadmin
- RabbitMQ Management HTTP API
- JSON topology configuration examples

## Sources Consulted
- RabbitMQ Exchanges documentation: https://www.rabbitmq.com/docs/exchanges
- RabbitMQ Virtual Hosts documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ rabbitmqadmin v2 documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/http-api-reference
- Pika BlockingConnection and BlockingChannel documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html

## Issues Found
- The RabbitMQ virtual host diagram labeled the second vhost as `/production`, but the accompanying Pika configuration uses `virtual_host='production'`. Updated the diagram labels to `production` so the example accurately reflects the configured vhost name.
- The `rabbitmqadmin` exchange declaration command used the legacy v1 syntax. Updated it to the current RabbitMQ documented v2 syntax: `rabbitmqadmin exchanges declare --name "orders" --type "topic" --durable true`.

## Review Notes
Python code blocks were syntax-checked successfully. The Pika examples use current `BlockingConnection` and `BlockingChannel` methods. The RabbitMQ claims about exchanges being vhost-scoped, passive declarations raising 404 channel exceptions when missing, durable exchanges surviving broker restarts, and current `rabbitmqctl` list commands are consistent with the official documentation.
