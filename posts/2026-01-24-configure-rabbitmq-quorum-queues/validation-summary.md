# Validation Summary: How to Configure RabbitMQ Quorum Queues

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- RabbitMQ quorum queues
- RabbitMQ clustering and Raft-based replication
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-queues`, `rabbitmqadmin`)
- RabbitMQ `rabbitmq.conf`
- Python `pika`
- Node.js `amqplib`
- Spring AMQP `QueueBuilder`

## Sources Consulted
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Configurable Limits documentation: https://www.rabbitmq.com/docs/limits
- RabbitMQ Virtual Hosts and Default Queue Type documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Time-To-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ `rabbitmq-queues` manual: https://www.rabbitmq.com/docs/man/rabbitmq-queues.8
- Spring AMQP `QueueBuilder` API documentation: https://docs.spring.io/spring-amqp/docs/current/api/org/springframework/amqp/core/QueueBuilder.html

## Issues Found
- Corrected the default for `x-quorum-initial-group-size` from "Cluster size" to `3`, matching RabbitMQ's default quorum queue group size.
- Corrected the default for `x-delivery-limit`; RabbitMQ 4.0+ defaults to `20`, while RabbitMQ 3.x used unlimited delivery attempts.
- Replaced invalid/obsolete `rabbitmq.conf` keys (`quorum_queue.default_initial_cluster_size`, `raft.segment_max_entries`, and `quorum_queue.memory_limit`) with current quorum queue configuration keys.
- Removed the non-standard `RABBITMQ_DEFAULT_QUEUE_TYPE` environment variable example and replaced it with supported virtual-host default queue type commands.
- Updated poison-message retry guidance because current RabbitMQ delivery-limit behavior does not count `basic.nack` requeues toward `x-delivery-limit`; the poison-message example now uses `basic_reject(..., requeue=True)`.
- Replaced invalid `rabbitmqctl list_queues` fields (`leader`, `members`, `online`) with supported queue fields and used `rabbitmq-queues quorum_status` for leader and replica status.
- Replaced the misleading "force leader election" command sequence with the supported `rabbitmq-queues rebalance quorum` operation.
- Corrected misleading comments for network and handshake settings.

## Review Notes
The post is technically relevant and code-heavy. The examples are now aligned with current RabbitMQ quorum queue documentation. Future improvements could mention that policies are generally preferred over hardcoded queue `x-arguments` for mutable settings such as dead-lettering, length limits, and delivery limits.
