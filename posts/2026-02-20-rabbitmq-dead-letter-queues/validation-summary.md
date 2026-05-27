# Validation Summary: How to Implement Dead Letter Queues in RabbitMQ

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- Dead letter exchanges and queues
- Message TTL
- Queue length limits and quorum queue delivery limits
- Python
- Pika
- OneUptime monitoring and alerting

## Sources Consulted
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Time-To-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika specification / BasicProperties documentation: https://pika.readthedocs.io/en/stable/modules/spec.html
- OneUptime website: https://oneuptime.com

## Issues Found
- The post listed only three RabbitMQ dead-lettering events. RabbitMQ also dead-letters quorum queue messages that exceed the configured delivery limit, so I added that case.
- The `consumer_with_dlq.py` example redeclared `orders.processing` without the original dead-letter and TTL arguments. RabbitMQ requires queue declarations to be equivalent, so this could fail with a precondition error after running the setup script. I changed the consumer declaration to `passive=True` so it checks that the configured queue exists.
- The `consumer_with_dlq.py` example called `save_order(order)` without defining it. I added a small placeholder function so the example is syntactically and operationally complete.
- The retry setup comment described the retry delays as exponential backoff, but the configured delays are increasing rather than strictly exponential. I changed the comment to "increasing backoff."
- The `retry_consumer.py` example called `execute_task(task)` without defining it. I added a small placeholder function so the example is complete.
- The `dlq_monitor.py` example imported `requests` but did not use it. Since that dependency was unnecessary and could cause the monitor script to fail in an environment without `requests`, I removed the import.

## Review Notes
The examples use queue arguments for DLX and TTL because the tutorial is demonstrating concrete queue declarations. RabbitMQ's official documentation recommends policies for production DLX and TTL configuration where possible, because policies can be changed without deleting and redeclaring queues.
