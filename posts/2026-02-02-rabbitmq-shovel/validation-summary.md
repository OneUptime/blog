# Validation Summary: How to Implement RabbitMQ Shovel for Cross-Datacenter Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (Shovel plugin, Management plugin, Prometheus plugin)
- AMQP 0-9-1 protocol
- Erlang term configuration (`advanced.config`) and `rabbitmq.conf`
- TLS / OpenSSL certificate generation
- RabbitMQ HTTP API (parameters, shovels, queues, health)
- Python (pika client, redis-py)
- Redis (for deduplication via `SET NX EX`)
- Prometheus (scrape config and alerting rules)
- Bash scripting (operational and failover scripts)
- Mermaid diagrams (flowchart, stateDiagram-v2)

## Sources Consulted
- RabbitMQ Shovel (static) docs — https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ Shovel (dynamic) docs — https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ HTTP API reference — https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ TLS URI query parameters — https://www.rabbitmq.com/docs/uri-query-parameters
- RabbitMQ Prometheus plugin docs — https://www.rabbitmq.com/docs/prometheus
- pika BlockingConnection / URLParameters reference
- redis-py `SET` command (`nx`, `ex` options)

## Issues Found
1. **Incorrect URL encoding of vhost in dynamic shovel curl example.** The post used `/api/parameters/shovel/%2Forders_vhost/dc1_to_dc2_orders`. `%2F` decodes to `/`, so the example targeted a vhost literally named `/orders_vhost` rather than the intended `orders_vhost`. The vhost name contains no special characters, so no encoding is required. Changed to `/api/parameters/shovel/orders_vhost/dc1_to_dc2_orders`.

2. **Invalid `shovel.ssl_options.*` keys in `rabbitmq.conf`.** The post placed `shovel.ssl_options.cacertfile`, `.certfile`, `.keyfile`, and `.verify` in `rabbitmq.conf`. These keys do not exist — there is no global shovel TLS namespace. Shovel client TLS must be configured per shovel, either via TLS query parameters on the `amqps://` URI or via `ssl_options` inside the shovel definition in `advanced.config`. Removed the invalid block and added a short note plus a correct example using URI query parameters.

## Review Notes
- The static shovel Erlang config keys (`protocol`, `uris`, `declarations`, `queue`, `prefetch_count`, `publish_properties`, `add_forward_headers`, `publish_fields`, `ack_mode`, `reconnect_delay`) are all valid per the shovel-static docs.
- `dest-uri` as a JSON array in the dynamic shovel definition is supported (per the shovel-dynamic docs the value may be a string or list of strings; URIs are tried until one succeeds).
- Prometheus plugin port `15692` is correct (default for `rabbitmq_prometheus`).
- `/api/health/checks/alarms` is a real endpoint and returns 200/503 based on alarm state.
- The Prometheus metric names referenced in the alerting rules (`rabbitmq_shovel_state`, `rabbitmq_shovel_state_transitions_total`, `rabbitmq_shovel_messages_published_total`, `rabbitmq_shovel_messages_confirmed_total`) are illustrative — the exact metric and label names exposed by `rabbitmq_prometheus` and `rabbitmq_shovel_prometheus` may differ slightly across RabbitMQ versions, so operators should confirm against `/metrics` for their deployment before relying on these expressions verbatim.
- The Python `redis.set(..., nx=True)` returns `True` on a successful set and `None` when the key already exists; the `not is_new` check therefore correctly treats `None` as "duplicate".
- The `reconnect_delay` setting is a flat integer delay, not exponential backoff as one inline comment suggests, but this is a minor wording nuance rather than a factual error in the configuration itself.
