# Validation Summary: How to Plan Worker Capacity When Message Processing Times Vary Widely

## Status
validated

## Post Type
Technical capacity-planning guide

## Technologies Covered

- Python 3
- Celery 5.6
- RabbitMQ 4.3 and AMQP 0-9-1 consumer prefetch
- Message queues and worker-capacity planning

## Sources Consulted

- [Celery 5.6 optimization guide](https://docs.celeryq.dev/en/stable/userguide/optimizing.html)
- [Celery 5.6 routing guide](https://docs.celeryq.dev/en/stable/userguide/routing.html)
- [Celery 5.6 workers guide](https://docs.celeryq.dev/en/stable/userguide/workers.html)
- [Celery 5.6 configuration reference](https://docs.celeryq.dev/en/stable/userguide/configuration.html)
- [RabbitMQ 4.3 consumer prefetch guide](https://www.rabbitmq.com/docs/consumer-prefetch)
- [RabbitMQ consumer acknowledgements and publisher confirms guide](https://www.rabbitmq.com/docs/confirms)
- [Python 3 `math.ceil` documentation](https://docs.python.org/3/library/math.html#math.ceil)

## Issues Found
No technical issues found.

## Review Notes
The arithmetic and Python calculator output were verified. The Celery `task_routes` configuration, `-A`, `-Q`, `--concurrency`, and `--hostname` worker options are current for Celery 5.6. The explanation of early versus late acknowledgement and prefetch multiplier behavior agrees with the current Celery optimization guide. RabbitMQ's current documentation describes its prefetch count as applying separately to each consumer, as stated in the post. The post appropriately treats the 70% occupancy target as a testable assumption rather than a guarantee.
