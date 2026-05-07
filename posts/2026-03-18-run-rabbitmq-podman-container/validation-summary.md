# Validation Summary: How to Run RabbitMQ in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- RabbitMQ
- RabbitMQ Docker Official Image
- RabbitMQ Management UI and HTTP API
- RabbitMQ configuration
- RabbitMQ plugins
- AMQP message persistence

## Sources Consulted
- RabbitMQ Docker Official Image documentation: https://hub.docker.com/_/rabbitmq/
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ Queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ Reliability Guide: https://www.rabbitmq.com/docs/reliability
- RabbitMQ Plugins documentation: https://www.rabbitmq.com/docs/plugins
- RabbitMQ rabbitmq-plugins manual: https://www.rabbitmq.com/docs/man/rabbitmq-plugins.8
- RabbitMQ Memory Threshold documentation: https://www.rabbitmq.com/docs/memory
- RabbitMQ Free Disk Space Alarms documentation: https://www.rabbitmq.com/docs/disk-alarms
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pull documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html

## Issues Found
- The post used the older `rabbitmq:3-management` image tag. The current Docker Official Image documentation lists supported RabbitMQ management tags in the 4.x series, so the examples were updated to `docker.io/library/rabbitmq:4-management`.
- The `podman run` examples used short image names after pulling a fully qualified image. Podman documents short-name resolution ambiguity, so the run examples now use the fully qualified image reference.
- The custom configuration example reused the same `rabbitmq-data` volume while the persistent container could still be running. Sharing a RabbitMQ data directory between two running broker containers is unsafe, so the custom example now uses a separate `rabbitmq-custom-data` named volume and the cleanup command removes both volumes.
- The publish example declared a durable queue but published the message with empty properties. RabbitMQ documentation states that durable queues only recover persistent messages after restart, so the example now sets `delivery_mode` to `2`.
- The plugin section described the `rabbitmq_consistent_hash_exchange` plugin as a delayed message exchange plugin. The comment was corrected to describe the consistent hash exchange plugin.
- The verification command used `rabbitmq-plugins list --enabled`, but the documented option for listing enabled plugins is `-e`. The command was updated to `rabbitmq-plugins list -e`.
- The introduction and summary described the setup as production-ready or suitable for lightweight production. Because the examples use development credentials and no production hardening such as TLS, clustering, secrets management, or resource limits, the wording was narrowed to development, testing, and local messaging environments.

## Review Notes
- The management HTTP API examples are technically valid, but RabbitMQ documentation notes that HTTP publish/consume is inefficient and AMQP or another messaging protocol is preferred for application messaging.
- `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS` are supported, but RabbitMQ documentation describes them as intended for development and CI environments.
