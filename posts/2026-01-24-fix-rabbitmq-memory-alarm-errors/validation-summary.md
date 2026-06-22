# Validation Summary: How to Fix 'Memory Alarm' Errors in RabbitMQ

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- RabbitMQ memory alarms and resource alarms
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-diagnostics`, `rabbitmqadmin`)
- RabbitMQ configuration (`rabbitmq.conf`)
- RabbitMQ Management plugin and HTTP API
- RabbitMQ Prometheus metrics
- Docker Compose and Kubernetes deployment snippets
- systemd service resource limits
- Bash monitoring and cleanup scripts

## Sources Consulted
- RabbitMQ Memory Alarm Threshold documentation: https://www.rabbitmq.com/docs/memory
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ `rabbitmq-diagnostics` manual: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- RabbitMQ `rabbitmqadmin` v2 documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ Classic Queues documentation: https://www.rabbitmq.com/docs/classic-queues
- RabbitMQ Lazy Queues historical documentation: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Prometheus and monitoring documentation: https://www.rabbitmq.com/docs/prometheus and https://www.rabbitmq.com/docs/monitoring
- RabbitMQ server discussion/release note for alarm metrics: https://github.com/rabbitmq/rabbitmq-server/discussions/3318

## Issues Found
- The post stated the default memory high watermark was 40%. Current RabbitMQ documentation lists the default as 60%, so the explanation, sample output, and configuration comments were updated.
- Several diagnostic examples parsed `rabbitmqctl status` with brittle `grep` patterns. These were changed to `rabbitmq-diagnostics alarms`, `check_local_alarms`, and `memory_breakdown`, which are the documented tools for alarms and memory breakdowns.
- Several `rabbitmqadmin` examples used v1 syntax or unsupported `--sort` usage. These were updated to current `rabbitmqadmin` v2 syntax or replaced with `rabbitmqctl` plus shell sorting.
- The container guidance used relative thresholds and `RABBITMQ_TOTAL_MEMORY_AVAILABLE_OVERRIDE_VALUE`. Current RabbitMQ documentation recommends absolute memory thresholds for containers and Kubernetes, so the Docker Compose and Kubernetes examples were updated.
- The memory calculation strategy table said `allocated` was the default. Current documentation lists `rss` as the default and includes `legacy`; the configuration and table were corrected.
- The average message size command used incorrect `awk` columns and would not calculate the intended value. It now uses `rabbitmqctl list_queues name messages message_bytes` and divides bytes by message count.
- The `rabbitmqctl list_queues` example included `publish_rate` and `deliver_rate`, which are not valid `list_queues` fields. It now checks ready and unacknowledged messages with documented queue fields.
- The management statistics reset command used `rabbit_mgmt_db:reset()`. Current documentation uses `rabbit_mgmt_storage:reset()` and `reset_all()`, so the post now uses `rabbit_mgmt_storage:reset_all()`.
- The post recommended configuring classic lazy queues. RabbitMQ no longer supports lazy mode, so that section was replaced with current classic queue storage behavior.
- The quorum queue declaration included unsupported/obsolete `x-max-in-memory-length`. It now uses current `rabbitmqadmin queues declare --type quorum` syntax.
- The health check script looked for `mem_alarm,true` in status output and parsed human-formatted memory strings. It now uses `rabbitmq-diagnostics check_local_alarms` and documented memory breakdown output.
- The cleanup cron used `idle_since`, which is not a documented current `rabbitmqctl list_queues` field. It now deletes only queues that are both empty and unused, with `--if-unused --if-empty`.

## Review Notes
- The Prometheus metric examples are plausible for RabbitMQ Prometheus output, but exact metric availability can depend on RabbitMQ version and endpoint configuration.
- The systemd `MemoryHigh` and `MemoryMax` example is syntactically valid systemd configuration, but operators should tune values to their service-level objectives and avoid unexpected OOM kills.
