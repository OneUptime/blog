# Validation Summary: How to Deploy RabbitMQ via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker and Docker Compose
- RabbitMQ
- RabbitMQ Management Plugin
- AMQP 0-9-1
- Python
- Pika

## Sources Consulted
- RabbitMQ configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ schema definition export and import guide: https://www.rabbitmq.com/docs/definitions
- RabbitMQ management plugin guide: https://www.rabbitmq.com/docs/management
- RabbitMQ credentials and password hashing guide: https://www.rabbitmq.com/docs/passwords
- RabbitMQ authentication and access control guide: https://www.rabbitmq.com/docs/access-control
- RabbitMQ configurable limits guide: https://www.rabbitmq.com/docs/limits
- RabbitMQ free disk space alarms guide: https://www.rabbitmq.com/docs/disk-alarms
- RabbitMQ MQTT plugin guide: https://www.rabbitmq.com/docs/mqtt
- RabbitMQ plugins guide: https://www.rabbitmq.com/docs/plugins
- RabbitMQ Docker Official Image documentation: https://hub.docker.com/_/rabbitmq
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Pika blocking consume example: https://pika.readthedocs.io/en/latest/examples/blocking_consume.html
- Pika blocking publish example: https://pika.readthedocs.io/en/latest/examples/blocking_publish_mandatory.html

## Issues Found
- The introduction said RabbitMQ implements AMQP, MQTT, and STOMP directly. RabbitMQ speaks AMQP 0-9-1 natively, while MQTT and STOMP support are provided by plugins. Updated the wording to reflect that accurately.
- The Compose snippet used the obsolete top-level `version: "3.8"` field and an outdated `rabbitmq:3.13-management-alpine` image tag. Removed the obsolete `version` field and updated the image to the current RabbitMQ 4.x management Alpine tag.
- The stack exposed port `1883` for MQTT even though the Docker image does not enable `rabbitmq_mqtt` by default. Removed the port mapping so the example does not imply MQTT works without enabling the plugin.
- The stack used `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`, and `RABBITMQ_DEFAULT_VHOST` alongside a definitions file. Reworked the example to seed users and permissions entirely through `definitions.json`, which is the documented approach for boot-time topology seeding.
- The RabbitMQ config used `management.load_definitions`, which RabbitMQ documents as deprecated. Replaced it with the current boot-time definition import settings using `definitions.import_backend` and `definitions.local.path`.
- The logging example wrote to `/var/log/rabbitmq/rabbit.log`, which is not the right default pattern for a container-focused deployment. Switched the config to console logging with `log.file = false` so it matches container logging expectations.
- The definitions example used placeholder `password_hash` values labelled as bcrypt hashes. RabbitMQ expects its own salted password hash format, not bcrypt. Replaced the placeholders with valid RabbitMQ SHA-256 password hashes and aligned them with the documented plaintext credentials used in the post.
- The seeded `admin` user had no vhost permissions. RabbitMQ requires users to be granted permissions on the vhosts they access, so I added full permissions for `admin` on `/` and `myapp`.
- The monitoring commands queried queues and exchanges without a `-p myapp` vhost selector, so they would not show the topology created in the post. Updated the commands to target `myapp` and switched the status example to `rabbitmq-diagnostics -q status`, which RabbitMQ currently recommends for node status checks.
- The conclusion implied that the persistent volume alone guarantees queued messages survive restarts. Clarified that persistence depends on the volume together with durable queues and persistent messages.

## Review Notes
- The post now uses `rabbitmq:4-management-alpine`, which keeps the guide on the supported RabbitMQ 4.x image line. If deterministic upgrades matter more than convenience, pinning a full patch tag would make the example more reproducible.
- `vm_memory_high_watermark.relative = 0.8` is valid, but RabbitMQ recommends absolute memory thresholds in containerized environments when possible because relative thresholds are based on detected RAM.
- Local checks: the fenced YAML, JSON, and Python snippets in the updated README were parsed successfully, and the RabbitMQ password hashes in `definitions.json` were verified against the documented plaintext passwords. Docker is not installed in this workspace, so runtime validation with a real RabbitMQ container or `docker compose config` was not possible.
