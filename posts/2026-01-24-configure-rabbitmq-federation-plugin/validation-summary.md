# Validation Summary: How to Configure RabbitMQ Federation Plugin

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RabbitMQ Federation plugin
- RabbitMQ federated exchanges and federated queues
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-plugins`, `rabbitmqadmin`)
- RabbitMQ Management HTTP API
- AMQP / AMQPS and TLS configuration
- Prometheus alerting
- Python `pika` publishing example

## Sources Consulted
- RabbitMQ Federation Plugin documentation: https://www.rabbitmq.com/docs/federation
- RabbitMQ Federation Reference: https://www.rabbitmq.com/docs/federation-reference
- RabbitMQ Federated Exchanges documentation: https://www.rabbitmq.com/docs/federated-exchanges
- RabbitMQ Federated Queues documentation: https://www.rabbitmq.com/docs/federated-queues
- RabbitMQ URI Query Parameters documentation: https://www.rabbitmq.com/docs/uri-query-parameters
- RabbitMQ `rabbitmqctl` manual page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- RabbitMQ Release Information: https://www.rabbitmq.com/release-information

## Issues Found
- The federation-vs-clustering table said clustering shares "All data". Updated it to clarify that RabbitMQ clusters replicate cluster metadata, while queue contents are replicated only when using a replicated queue type such as quorum queues.
- The prerequisites recommended RabbitMQ 3.8+. Updated this to "a currently supported RabbitMQ release" because 3.8 is no longer an appropriate baseline for a 2026 production guide.
- The exchange federation description implied a strict same-name replication model. Updated it to note that the same exchange name is the default, but an upstream exchange name can be configured.
- Queue federation behavior omitted two key constraints from the official docs: the downstream queue must have run out of local messages, and the upstream queue must have messages not being consumed locally. Updated the behavior list.
- The Management API TLS example used a nested `tls` object inside the federation upstream value. RabbitMQ documents federation TLS options as AMQP URI query parameters or global Erlang client TLS options, so the example was changed to put `cacertfile`, `certfile`, `keyfile`, `verify`, and `server_name_indication` in the `amqps://` URI.
- The `rabbitmqctl federation_status` sample output was shown as a table, but RabbitMQ documents Erlang term output containing keys such as `type`, `name`, `vhost`, `connection`, `upstream_name`, `status`, and `timestamp`. Replaced the sample with the documented shape.
- The Prometheus metrics listed non-documented metric names (`rabbitmq_federation_links_count`, `rabbitmq_federation_link_status`, `rabbitmq_federation_messages_transferred_total`). Replaced them with the documented `rabbitmq_federation_links` metric grouped by status, and updated alert expressions accordingly.
- The network troubleshooting section used `net_adm:ping`, which checks Erlang distribution reachability and is not a direct AMQP federation connectivity test. Removed that command and kept the AMQP port connectivity check.

## Review Notes
The remaining examples are illustrative and depend on site-specific users, vhosts, policies, certificates, and firewall rules. For production use, the examples should be adapted with least-privilege permissions and explicit policy priorities to avoid conflicts with existing policies.
