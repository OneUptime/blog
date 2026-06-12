# Validation Summary: How to Configure Queue Mirroring in RabbitMQ

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- RabbitMQ quorum queues
- RabbitMQ classic mirrored queues
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-queues`)
- RabbitMQ management HTTP API
- Python (`pika`, `requests`)
- Node.js (`amqplib`)
- RabbitMQ configuration (`rabbitmq.conf`)

## Sources Consulted
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Classic Queue Mirroring documentation for 3.13: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ Virtual Hosts documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ Queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ Classic Queues documentation: https://www.rabbitmq.com/docs/classic-queues
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ 3.13 `rabbitmqctl` manual: https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8
- RabbitMQ `rabbitmq-queues` manual: https://www.rabbitmq.com/docs/man/rabbitmq-queues.8
- RabbitMQ clustering and network partitions documentation: https://www.rabbitmq.com/docs/partitions

## Issues Found
- The post described classic mirrored queues as a current RabbitMQ option. Updated the wording to clarify that classic queue mirroring was deprecated in RabbitMQ 3.9 and removed in RabbitMQ 4.0, while RabbitMQ 3.13 and earlier systems may still use it.
- The comparison table overstated quorum queue guarantees as "No lost acks" and described classic mirrored queues as "All in memory." Updated the table to match RabbitMQ's documented data-safety and storage model.
- The post showed `x-queue-type` being configured through a policy. RabbitMQ policies cannot set or change queue type because queue type is immutable after declaration. Replaced that example with default queue type configuration using `rabbitmqctl add_vhost --default-queue-type quorum` and `default_queue_type = quorum`.
- The quorum status command used `rabbitmqctl quorum_status`, which is not the current command. Replaced it with `rabbitmq-queues quorum_status --vhost "/" <queue_name>` and simplified the `list_queues` example to supported fields.
- The at-least-once dead-lettering example omitted the required reject-publish overflow behavior. Added `x-overflow: reject-publish`.
- The management API queue lookup only URL-encoded `/` in the virtual host and did not encode queue names. Updated it to use `urllib.parse.quote` for both values and added missing imports.
- The leader monitoring example referenced an undefined `get_queue_info` helper. Updated it to call the quorum queue management API helper already shown in the post.
- The classic mirrored queue maintenance example used stale `slave_nodes` CLI fields. Updated the CLI command to use the documented RabbitMQ 3.13 fields `mirror_pids` and `synchronised_mirror_pids`.
- The migration example imported unused `json` and acknowledged messages from the old queue after publishing without enabling publisher confirms. Removed the unused import and enabled publisher confirms with `channel.confirm_delivery()`.
- The quorum queue tuning example used stale or wrong `rabbitmq.conf` keys. Updated them to documented `quorum_queue.commands_soft_limit`, `quorum_queue.initial_cluster_size`, and `quorum_queue.wal_max_size_bytes`.
- The replication health snippet referenced an undefined `get_all_queues` helper. Added a minimal management API helper using `requests`.
- The conclusion referred to "queue mirroring" as essential for current RabbitMQ high availability. Updated it to "queue replication" and softened the replica-count guidance to prefer odd replica counts.

## Review Notes
Classic mirrored queues are now historical for current RabbitMQ 4.x deployments. The remaining classic mirrored queue commands are valid for RabbitMQ 3.13 and earlier, but future revisions of this post could focus more narrowly on quorum queues and RabbitMQ's supported migration tooling.
