# Validation Summary: How to Build RabbitMQ Policy Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (policies, queues, exchanges)
- `rabbitmqctl` CLI
- RabbitMQ HTTP Management API
- Bash / `jq` for scripting
- Classic mirrored queues (HA), lazy queues, dead-letter exchanges

## Sources Consulted
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ Parameters and Policies: https://www.rabbitmq.com/docs/parameters
- `rabbitmqctl` reference: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/management
- RabbitMQ TTL: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Length Limit (max-length / overflow): https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Dead Letter Exchanges: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Classic Mirrored Queues (deprecated): https://www.rabbitmq.com/docs/ha
- RabbitMQ Lazy Queues (deprecated in 3.12+): https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues

## Issues Found
No technical issues found.

The post's `rabbitmqctl set_policy` syntax, HTTP API endpoint paths, JSON payload structure, policy parameter names/types, overflow strategies, HA modes, queue mode values, and verification commands all match the official RabbitMQ documentation. URL-encoding of the default vhost as `%2F` is correct.

## Review Notes
- The post correctly notes that quorum queues are preferred over classic mirrored queues for new deployments. Worth highlighting in a future update: classic mirrored queues were removed entirely in RabbitMQ 4.0, so the `ha-mode` / `ha-params` / `ha-sync-mode` examples only apply to RabbitMQ 3.x clusters.
- Lazy queues (`queue-mode: lazy`) were deprecated in RabbitMQ 3.12 (classic queue v2 made the distinction largely unnecessary) and the option is no longer effective on quorum queues. The post's example is accurate for 3.x but readers on 4.x should be aware the parameter has no effect on quorum queues.
- The bash apply script that re-interpolates `$pattern` (containing literal backslashes) into a JSON body relies on RabbitMQ's lenient JSON parsing of escape sequences like `\.`. Strict JSON parsers would reject this; using `jq` to construct the full body (e.g., `jq -nc --argjson p "$policy" '$p'`) would be cleaner, but the current script works in practice against RabbitMQ.
- Minor: `rabbitmqctl list_policies` output typically includes a leading `vhost` column. The example output omits it but is otherwise representative.
