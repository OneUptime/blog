# Validation Summary: How to Fix 'Access Refused' Authentication Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 authentication and authorization
- rabbitmqctl and rabbitmq-diagnostics CLI tools
- RabbitMQ rabbitmq.conf configuration
- Python Pika client
- TLS/SSL client connections

## Sources Consulted
- RabbitMQ Access Control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ Authentication Mechanisms documentation: https://www.rabbitmq.com/docs/authentication
- Pika ConnectionParameters documentation: https://pika.readthedocs.io/en/stable/modules/parameters.html
- Pika credentials documentation: https://pika.readthedocs.io/en/stable/modules/credentials.html
- Pika 1.4.1 wheel source for ConnectionParameters keyword validation

## Issues Found
- The permission diagram showed queue binding as requiring only read permission. RabbitMQ documents queue.bind as requiring write permission on the target queue and read permission on the source exchange, so the diagram now points Bind Queue to both Write and Read.
- The CLI example used `rabbitmqctl list_auth_mechanism_schemes`, which is not listed in the current RabbitMQ CLI manual. Replaced it with `rabbitmq-diagnostics environment | grep auth_mechanisms`, which aligns with RabbitMQ's documented effective-configuration inspection workflow.
- The Pika client example used `authentication_mechanism_class=pika.spec.PLAIN`. Current Pika `ConnectionParameters` does not document this parameter and rejects unknown keyword arguments. Updated the example to use `PlainCredentials`, which is the documented way to authenticate with username/password and uses PLAIN when the broker offers it.
- The complete setup example said read permission is used to bind queues. Updated the comment to state that queue bindings require write on the queue and read on the exchange.

## Review Notes
- The post remains version-neutral. RabbitMQ 4.3.1 introduced a caveat where passive declarations require at least one permission on the target resource; the diagnostic example uses a passive declare, so future edits could call that out explicitly for readers on RabbitMQ 4.3.1 or newer.
