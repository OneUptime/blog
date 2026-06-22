# Validation Summary: How to Fix 'Unroutable Message' Errors in RabbitMQ

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- Pika Python client
- RabbitMQ Management HTTP API
- rabbitmqctl
- Prometheus metrics
- RabbitMQ configuration

## Sources Consulted
- RabbitMQ Publishers guide: https://www.rabbitmq.com/docs/publishers
- RabbitMQ Alternate Exchanges guide: https://www.rabbitmq.com/docs/ae
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Logging guide: https://www.rabbitmq.com/docs/logging
- RabbitMQ Configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ Prometheus guide: https://www.rabbitmq.com/docs/prometheus
- Pika BlockingConnection / BlockingChannel documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika Channel documentation: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The alternate exchange consumer example checked `properties.headers['x-first-death-reason']` as the original routing context. RabbitMQ alternate exchanges do not add dead-letter headers; those headers are associated with dead-lettering, not AE routing. Changed the example to inspect delivery metadata (`method.exchange` and `method.routing_key`) instead.
- The same consumer snippet used `logger` without defining it. Added the `logging` import and logger initialization so the snippet is syntactically complete.
- The publisher confirms section said confirms acknowledge that a message was successfully routed. RabbitMQ publisher confirms acknowledge broker acceptance of the publish; unroutable detection requires `mandatory=True` and return handling. Updated the wording to state that distinction.

## Review Notes
The RabbitMQ logging snippet uses valid log-level settings, but RabbitMQ's own documentation recommends metrics and client return handling for unroutable-message visibility rather than relying on logs alone. The Prometheus example defines an application-level custom metric; RabbitMQ also exposes broker metrics for returned and dropped unroutable messages through its Prometheus plugin.
