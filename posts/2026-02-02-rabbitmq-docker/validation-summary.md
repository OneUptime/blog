# Validation Summary: How to Use RabbitMQ with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (3.x with management plugin)
- Docker / Docker Compose
- Python (pika library)
- Erlang (enabled_plugins file format, Erlang cookie, node names)
- Prometheus (RabbitMQ Prometheus plugin / metrics endpoint)
- OpenSSL (TLS certificate generation)
- AMQP 0-9-1 protocol concepts (exchanges, queues, channels, ack/nack)
- Quorum queues (Raft-based replicated queues)

## Sources Consulted
- RabbitMQ official documentation — https://www.rabbitmq.com/docs
- RabbitMQ Docker image documentation — https://hub.docker.com/_/rabbitmq
- RabbitMQ configuration reference — https://www.rabbitmq.com/docs/configure
- RabbitMQ clustering guide — https://www.rabbitmq.com/docs/clustering
- RabbitMQ quorum queues — https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Prometheus plugin — https://www.rabbitmq.com/docs/prometheus
- RabbitMQ TLS configuration — https://www.rabbitmq.com/docs/ssl
- pika documentation — https://pika.readthedocs.io/
- Docker Compose reference — https://docs.docker.com/compose/

## Issues Found
1. **`channel_max` mis-described as a connection limit.** The original comment said `# Connection limits` / `# Maximum concurrent connections`. `channel_max` actually limits the maximum number of channels per AMQP connection (the AMQP 0-9-1 max is 2047). Updated the header to "Channel limits" and the inline comment to "Maximum channels per connection (highest permissible value is 2047)".
2. **`consumer_timeout` mis-labelled as "Message TTL default".** `consumer_timeout` is the maximum time a consumer can take before acknowledging a delivery — RabbitMQ closes the channel/connection if it isn't ack'd in that window. It is not a TTL. Updated the comment to "Consumer acknowledgement timeout".
3. **`RABBITMQ_NODENAME` comment said "Enable clustering plugin".** That env var sets the Erlang node name (it does not enable any plugin; clustering is built into the broker). Updated comment to "Erlang node name (required for clustering)".
4. **Prometheus metric names were inaccurate.**
   - `rabbitmq_queue_messages` was described as "Messages ready for delivery", but that metric covers total messages (ready + unacked). The correct ready-only metric is `rabbitmq_queue_messages_ready` — updated.
   - `rabbitmq_node_mem_used` is not the exporter's metric name; replaced with `rabbitmq_process_resident_memory_bytes`.
   - `rabbitmq_node_disk_free` should include the `_bytes` suffix used by the Prometheus plugin — replaced with `rabbitmq_node_disk_free_bytes`.

## Review Notes
- The post uses `rabbitmq:3-management` throughout. RabbitMQ 4.x has been released; `3-management` continues to resolve to the latest RabbitMQ 3.13.x image, so commands remain valid. Authors may want to call out the 4.x track in a future revision.
- `docker-compose.yml` files declare `version: '3.8'`. The Compose Spec no longer requires the top-level `version` field — it is ignored by current Compose but does not cause errors. Not changed.
- `pika.BasicProperties(delivery_mode=2)` still works. Newer pika versions also accept `pika.DeliveryMode.Persistent`; the integer form remains supported, so no change.
- `ssl_options.fail_if_no_peer_cert = false` is consistent with the surrounding "client cert is optional" intent; for stricter mutual TLS, operators would set this to `true`. The text already calls this out as mutual TLS, which is mildly aspirational — readers should know `verify_peer` + `fail_if_no_peer_cert=false` is "verify if presented", not "required".
- The cluster bootstrap section uses the manual `rabbitmqctl join_cluster` flow. RabbitMQ also supports peer discovery via `cluster_formation.*` config; the manual approach in the post is correct and commonly used.
- TLS versions list both 1.2 and 1.3, which matches current RabbitMQ recommendations. Older protocols are correctly omitted.
