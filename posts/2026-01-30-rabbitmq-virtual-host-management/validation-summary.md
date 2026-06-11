# Validation Summary: How to Implement RabbitMQ Virtual Host Management

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- RabbitMQ (broker, vhosts, permissions, vhost limits)
- `rabbitmqctl` CLI
- RabbitMQ Management HTTP API
- RabbitMQ Prometheus plugin
- Bash scripting (`curl`, `openssl`, `sed`)

## Sources Consulted
- RabbitMQ `rabbitmqctl(8)` man page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8.html
- RabbitMQ CLI tools overview: https://www.rabbitmq.com/docs/cli
- RabbitMQ Access Control / Permissions documentation
- RabbitMQ Virtual Hosts documentation
- RabbitMQ Management HTTP API documentation
- RabbitMQ Prometheus plugin metrics documentation

## Issues Found
1. **Invalid columns passed to `rabbitmqctl list_vhosts`.** Two code blocks used `rabbitmqctl list_vhosts name messages consumers`. Per the official `rabbitmqctl(8)` reference, the valid info items for `list_vhosts` are: `name`, `tracing`, `default_queue_type`, `description`, `tags`, and `cluster_state`. `messages` and `consumers` are info items belonging to `list_queues`, not `list_vhosts`, and passing them to `list_vhosts` would fail. Replaced both occurrences with a valid column set (`name cluster_state default_queue_type tracing`) and adjusted the surrounding comment in the monitoring section so it still made sense.

2. **Missing markdown heading prefix on "Resource Limits and Quotas".** The line read `Resource Limits and Quotas` rather than `## Resource Limits and Quotas`, breaking the section heading rendering. Added the `##` prefix to restore the heading.

## Review Notes
- The permission-type descriptions (configure / write / read) are slightly simplified — for example, `write` also covers binding queues to exchanges, and `read` covers queue purging and binding exchanges to queues. The simplification is acceptable for an introductory guide and was left as-is.
- `rabbitmqctl add_vhost --description ... --tags ...` requires a reasonably modern RabbitMQ (3.11+). Users on older versions would need to drop those flags. Not flagged in the post, but acceptable since the post targets current RabbitMQ releases.
- The Prometheus metric names (`rabbitmq_queue_messages_ready`, `rabbitmq_connections`, `rabbitmq_channel_messages_published_total`) match commonly exposed metrics from the RabbitMQ Prometheus plugin. Exact availability and the presence of the `vhost` label depend on which scrape endpoint is used (`/metrics`, `/metrics/per-object`, or `/metrics/detailed`). Considered correct enough for an example.
- AMQP URI vhost encoding in the provisioning script (`amqp://...@host/%2Ftenant-a`) is correct: the vhost path segment is URL-encoded, so the slash in `/tenant-a` becomes `%2F`.
- The `monitoring` user tag set via `rabbitmqctl set_user_tags` is a real, supported tag for management UI access.
