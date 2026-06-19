# Validation Summary: How to Migrate from RabbitMQ Classic to Quorum Queues

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- RabbitMQ quorum queues
- RabbitMQ classic mirrored queues
- RabbitMQ Shovel plugin
- RabbitMQ Federation plugin
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-queues`)
- RabbitMQ management HTTP API
- Python
- Pika
- Bash and jq
- RabbitMQ configuration (`rabbitmq.conf`)

## Sources Consulted
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ migration guide for mirrored classic queues to quorum queues: https://www.rabbitmq.com/docs/3.13/migrate-mcq-to-qq
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ dynamic shovel documentation: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ federation documentation: https://www.rabbitmq.com/docs/federation
- RabbitMQ federation reference: https://www.rabbitmq.com/docs/federation-reference
- RabbitMQ federated queues documentation: https://www.rabbitmq.com/docs/federated-queues
- RabbitMQ persistence configuration: https://www.rabbitmq.com/docs/persistence-conf
- RabbitMQ configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ clustering and network partitions guide: https://www.rabbitmq.com/docs/partitions

## Issues Found
- The comparison table used overly absolute language for quorum queue data safety ("Guaranteed delivery"). Changed it to describe the real guarantee: safer data handling when publisher confirms are used and a quorum remains available.
- The comparison table claimed stronger ordering without caveats. Changed it to note FIFO behavior with caveats for both queue types.
- The assessment script and compatibility text said priority queues are unsupported by quorum queues. Current RabbitMQ documentation states RabbitMQ 4.3+ quorum queues always provide priority support, while `x-max-priority` is a classic-queue argument and should be removed from converted definitions. Updated the warnings and migration code accordingly.
- The shovel example said `src-delete-after: queue-length` deletes the shovel after the source is empty. RabbitMQ documents that it deletes after the initial source queue length has been transferred. Updated the comment.
- The blue-green/federation example described federation as queue replication and validated message-count sync. RabbitMQ queue federation pulls messages toward downstream consumers rather than maintaining a fully replicated queue. Updated wording and the verification method.
- The definitions conversion code used `queue.get('arguments', {})`, so queues without an existing `arguments` object would not persist newly added quorum arguments. Changed it to `queue.setdefault('arguments', {})`.
- The validation script attempted to inspect quorum members with undocumented `rabbitmqctl list_queues` fields (`leader`, `members`, `online`). Replaced that check with the documented `rabbitmq-queues quorum_status <queue>` command.
- The tuning snippet used invalid or inappropriate `rabbitmq.conf` syntax and settings (`%%` comments, `raft.segment_max_entries`, `quorum_queue.memory_limit`). Updated it to valid `rabbitmq.conf` syntax and documented settings.

## Review Notes
The Python examples were checked for syntax with Python AST parsing. Some examples remain illustrative and would still need environment-specific details in production, such as credentials, virtual host names, RabbitMQ plugin enablement, publisher confirms for custom drain scripts, and careful handling of existing policies during definition import.
