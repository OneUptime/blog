# Validation Summary: How to Create RabbitMQ Shovel Dynamic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (Shovel plugin)
- RabbitMQ Management HTTP API
- `rabbitmqctl` CLI
- AMQP 0-9-1 and AMQP 1.0 protocols
- Node.js (axios)
- Python (requests)
- Prometheus (alert rules)

## Sources Consulted
- RabbitMQ Shovel plugin docs: https://www.rabbitmq.com/docs/shovel
- RabbitMQ Dynamic Shovel docs: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ Management HTTP API docs: https://www.rabbitmq.com/docs/management
- `rabbitmqctl` man page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ URI specification: https://www.rabbitmq.com/docs/uri-spec
- RabbitMQ URI query parameters: https://www.rabbitmq.com/docs/uri-query-parameters
- RabbitMQ Prometheus plugin: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Access Control docs: https://www.rabbitmq.com/docs/access-control

## Issues Found
- The post used `prefetch-count` (without the `src-` prefix) in several code samples while also using the correct `src-prefetch-count` in one place. Per current RabbitMQ Dynamic Shovel documentation, the canonical parameter name is `src-prefetch-count`. Updated the following locations to use `src-prefetch-count` consistently:
  - Node.js `createShovel` example (section 4)
  - Python `create_shovel` example (section 4)
  - Prefetch Count JSON example (section 6)
  - "Update a Shovel" JSON example (section 8)
  - Performance bullet in Best Practices (section 11)

## Review Notes
- HTTP API endpoint paths (`/api/parameters/shovel/{vhost}/{name}`, `/api/shovels`, `/api/shovels/{vhost}/{name}`) match the current RabbitMQ Management HTTP API.
- `rabbitmqctl set_parameter`, `clear_parameter`, `list_shovels`, `set_user_tags`, `set_permissions`, and `list_queues` syntax all match the current `rabbitmqctl` reference.
- Plugin enablement commands and the `[E*]` plugin list output format are accurate.
- Parameter names verified against current docs: `src-protocol`/`dest-protocol` (values `amqp091`/`amqp10`), `src-uri`/`dest-uri`, `src-queue`/`dest-queue`, `src-exchange`/`src-exchange-key`, `dest-exchange`/`dest-exchange-key`, `ack-mode` (`on-confirm`/`on-publish`/`no-ack`), `reconnect-delay`, `src-delete-after`, `dest-add-forward-headers`, `dest-add-timestamp-header` — all correct.
- TLS URI query parameter `cacertfile` is a valid RabbitMQ URI query parameter.
- URL-encoding of the default vhost (`%2f`) and special characters in URIs is accurate.
- Default ports cited (5672 for AMQP, 5671 for AMQPS, 15672 for management) are correct.
- The example Prometheus alert (`rabbitmq_shovel_state != 1`) is presented as illustrative; the actual metric naming and label scheme exposed by `rabbitmq_prometheus` may vary by RabbitMQ version, but the snippet is shown as an example rather than authoritative.
- `curl -v telnet://remote-host:5672` works as a basic TCP connectivity test via curl's telnet protocol support; `nc -zv` would be more idiomatic but the shown command is not incorrect.
- The plugin version `3.12.0` shown in the sample plugin-list output is illustrative; readers on newer/older RabbitMQ releases will see a different version string. This is acceptable as example output.
