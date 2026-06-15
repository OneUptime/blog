# Validation Summary: How to Configure Federation for Multi-DC in RabbitMQ

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ Federation plugin
- RabbitMQ federated exchanges and federated queues
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-plugins`)
- RabbitMQ Management HTTP API
- AMQP and AMQPS federation upstream URIs
- Python `requests`

## Sources Consulted
- RabbitMQ Federation Plugin documentation: https://www.rabbitmq.com/docs/federation
- RabbitMQ Federation Reference: https://www.rabbitmq.com/docs/federation-reference
- RabbitMQ Federated Exchanges documentation: https://www.rabbitmq.com/docs/federated-exchanges
- RabbitMQ Federated Queues documentation: https://www.rabbitmq.com/docs/federated-queues
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ Plugins documentation: https://www.rabbitmq.com/docs/plugins
- RabbitMQ Access Control documentation: https://www.rabbitmq.com/docs/access-control

## Issues Found
- Corrected the description of federated queues. The original text said a downstream queue mirrors an upstream queue; RabbitMQ queue federation retrieves messages from upstream queues to satisfy local consumer demand, rather than acting as a simple mirror.
- Removed the restart instruction after enabling federation plugins. RabbitMQ plugin enablement contacts a running node and starts plugins online by default; restart is only needed for offline plugin-file changes.
- Fixed Python vhost URL encoding. The original examples only replaced `/` with `%2f`; the updated examples use `urllib.parse.quote(vhost, safe='')` so non-default virtual host names are encoded correctly.
- Completed the mesh federation example by applying a policy that uses the built-in `all` upstream set after creating the upstream definitions.
- Corrected the federation user permissions guidance. The original read-only example is not generally sufficient for exchange federation because RabbitMQ may need to create and use internal federation resources on the upstream. The post now shows a working lab example and tells readers to narrow configure/write/read regexes for production.
- Replaced the nonexistent `rabbitmqctl list_federation_links` command with the documented `rabbitmqctl federation_status` command and corrected the described output fields.
- Corrected the "multiple upstream URIs" explanation. A URI list in one upstream is used to select a node from the same upstream cluster during connection attempts, not to create parallel links. The post now says to define multiple upstreams for simultaneous connections to separate clusters.
- Updated the best-practices permissions bullet so it no longer recommends read-only federation users.

## Review Notes
The post is technically relevant and broadly aligned with RabbitMQ's current federation model. The examples remain version-neutral, but the review used RabbitMQ 4.3 documentation current on 2026-06-15. The HTTP API federation status endpoint requires `rabbitmq_federation_management` to be enabled.
