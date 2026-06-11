# Validation Summary: How to Build RabbitMQ Federation Topologies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (versions 3.8+, examples reference 3.12.0)
- RabbitMQ Federation Plugin (`rabbitmq_federation`, `rabbitmq_federation_management`)
- RabbitMQ Prometheus Plugin (`rabbitmq_prometheus`)
- RabbitMQ Tracing Plugin (`rabbitmq_tracing`)
- `rabbitmqctl` and `rabbitmqadmin` CLI tools
- RabbitMQ Management HTTP API
- AMQP / AMQPS protocol
- Python `pika` library for AMQP clients
- Bash / jq for monitoring scripts
- Prometheus / PromQL

## Sources Consulted
- RabbitMQ Federation Reference: https://www.rabbitmq.com/docs/federation-reference
- RabbitMQ Federation Plugin: https://www.rabbitmq.com/docs/federation
- RabbitMQ Management HTTP API: https://www.rabbitmq.com/docs/management
- RabbitMQ 3.13.1 release notes (federation Prometheus metric introduction): https://github.com/rabbitmq/rabbitmq-server/releases/tag/v3.13.1
- RabbitMQ GitHub issue #10345 (federation link running count metric)
- rabbitmq-prometheus issue #21 (federation metrics request)

## Issues Found

1. **Incorrect default for `reconnect-delay`.** The post stated the default was 1 second; the official Federation Reference documents the default as 5 seconds. Updated the inline parameter explanation to "default 5" and changed the example value from 5 (which would have been a no-op against the assumed default) to 10 so the snippet actually illustrates tuning.

2. **`channel-use-max` is not a valid federation upstream parameter.** It does not appear in the official Federation Reference parameter list. Removed it from the Connection Settings example JSON and from the explanation list to avoid users setting a parameter that RabbitMQ will reject or silently ignore.

3. **Prometheus metric names did not exist.** The post listed `rabbitmq_federation_links_running`, `rabbitmq_federation_messages_transferred_total`, and `rabbitmq_federation_link_errors_total`. None of these are exposed by the `rabbitmq_prometheus` plugin. Per the RabbitMQ 3.13.1 release notes, the actual federation metric added is `rabbitmq_federation_running_link_count` (a gauge of running links on the node). Replaced the three invented metrics with this single real metric and pointed readers to the `/api/federation-links` HTTP endpoint (already covered earlier in the post) for richer per-link status information.

## Review Notes

- The post correctly states `rabbit_federation_status:status().` via `rabbitmqctl eval` works; the modern CLI shortcut `rabbitmqctl federation_status` would also be valid and more user-friendly, but the existing approach is not wrong.
- The Combining Federation with Other Policies example uses classic mirrored queue arguments (`ha-mode`, `ha-params`, `ha-sync-mode`). These were deprecated in RabbitMQ 3.13 and removed entirely in RabbitMQ 4.0 in favor of quorum queues and streams. The example still works for the version range the post targets (3.8–3.12), so left as-is, but readers on 4.x will need to replace these with quorum-queue policies.
- The `max-hops` parameter applies to exchange federation only; the post discusses it in the bidirectional/mesh section which is consistent with that scoping.
- The Python `pika` example uses `BlockingConnection` with `x-priority` consumer arguments — both are valid and current RabbitMQ extensions.
- All `rabbitmqctl`, `rabbitmqadmin`, and HTTP API command syntax verified as correct against current RabbitMQ documentation.
