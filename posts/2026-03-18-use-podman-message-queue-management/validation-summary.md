# Validation Summary: How to Use Podman for Message Queue Management

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Podman
- RabbitMQ
- Apache Kafka
- ZooKeeper
- Redis
- Python
- Pika
- systemd Quadlet
- Kafka UI

## Sources Consulted
- Podman documentation: https://docs.podman.io/
- Podman `podman-pod-create`: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman volume mount options: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- RabbitMQ Docker Official Image docs: https://hub.docker.com/_/rabbitmq/
- RabbitMQ Configuration: https://www.rabbitmq.com/docs/4.2/configure
- RabbitMQ Schema Definition Export and Import: https://www.rabbitmq.com/docs/definitions
- RabbitMQ Access Control: https://www.rabbitmq.com/docs/3.13/access-control
- Confluent Docker configuration reference: https://docs.confluent.io/platform/7.5/installation/docker/config-reference.html
- Confluent Platform 7.6 Docker listener examples: https://docs.confluent.io/platform/7.6/kafka/multi-node.html
- Redis key eviction reference: https://redis.io/docs/latest/develop/reference/eviction/
- Redis `XGROUP CREATE`: https://redis.io/docs/latest/commands/xgroup-create/
- Pika connection parameters: https://pika.readthedocs.io/en/latest/modules/parameters.html
- Pika BlockingConnection adapter: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Kafka UI configuration properties: https://docs.kafka-ui.provectus.io/configuration/misc-configuration-properties

## Issues Found
- RabbitMQ image references used `rabbitmq:3-management-alpine`, which is outdated relative to the current official image tags. Updated the examples to `rabbitmq:4-management-alpine`.
- The production RabbitMQ example mounted `definitions.json` but never applied it. Added `rabbitmqctl await_startup` and `rabbitmqctl import_definitions /etc/rabbitmq/definitions.json` so the declared queues, exchange, and binding are actually loaded.
- The production RabbitMQ example reused the earlier demo data volume and relied on `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS`. Switched it to a separate `rabbitmq-prod-data` volume, added `mkdir -p ~/rabbitmq` so the bind-mounted files exist before `podman run`, and moved the seed credentials into `rabbitmq.conf` to align the example with RabbitMQ's documented first-boot configuration behavior.
- The Kafka ZooKeeper section described ZooKeeper as a requirement without the current deprecation context from Confluent. Updated the text to position ZooKeeper as a legacy deployment mode and refreshed the Confluent image tags to `7.6.10`.
- The Kafka KRaft example was missing required Confluent listener configuration for combined mode. Added `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`, `KAFKA_INTER_BROKER_LISTENER_NAME`, corrected listeners, advertised listeners, quorum voters, and switched the cluster ID generation command to `/bin/kafka-storage random-uuid`.
- The Kafka topic commands assumed the ZooKeeper-based container name only. Added a note to use `kafka-kraft` when following the KRaft example instead.
- The Redis example used `maxmemory-policy allkeys-lru`, which can evict stream keys under memory pressure. Changed it to `noeviction` to avoid silently discarding queue data.
- The Redis consumer-group example created the group at `$` after inserting sample messages, which skips the existing entries from the group's perspective. Changed the start ID to `0`.

## Review Notes
- No further technical issues were found after the corrections above.
- ZooKeeper mode is still useful for legacy or comparison examples, but Confluent recommends KRaft for new deployments, and the single-node combined-mode KRaft example shown here is for local development rather than production.
- The sample credentials are acceptable for illustration, but real deployments should use generated secrets.
- The Kafka UI example uses host networking, so its bootstrap address may need adjustment on remote or non-local Podman setups.
