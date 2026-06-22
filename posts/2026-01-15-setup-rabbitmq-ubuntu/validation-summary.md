# Validation Summary: How to Set Up RabbitMQ Message Broker on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- RabbitMQ
- Erlang/OTP
- AMQP
- RabbitMQ management plugin and HTTP API
- RabbitMQ clustering
- RabbitMQ quorum queues
- TLS/SSL
- Prometheus metrics
- UFW firewall

## Sources Consulted
- RabbitMQ official Debian/Ubuntu installation guide: https://www.rabbitmq.com/docs/install-debian
- RabbitMQ official configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ official management plugin guide: https://www.rabbitmq.com/docs/management
- RabbitMQ official TLS support guide: https://www.rabbitmq.com/docs/ssl
- RabbitMQ official quorum queues guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ official schema definitions export/import guide: https://www.rabbitmq.com/docs/definitions
- RabbitMQ official rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ official rabbitmqadmin v2 guide: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ official CLI tools guide: https://www.rabbitmq.com/docs/cli
- RabbitMQ official mirrored classic queues migration guide: https://www.rabbitmq.com/docs/3.13/migrate-mcq-to-qq

## Issues Found
- The apt repository setup used the older packagecloud RabbitMQ server repository and a separate Launchpad Erlang signing key. Updated it to the current Team RabbitMQ `deb1.rabbitmq.com` and `deb2.rabbitmq.com` repositories signed by the Team RabbitMQ key, matching the official Ubuntu installation guide.
- The `advanced.config` example set `{loopback_users, []}`, which would allow the default `guest` user to connect remotely if present and contradicted the post's security guidance. Changed it to keep `guest` loopback-only.
- The `rabbitmq-env.conf` example used full environment variable names (`RABBITMQ_CONFIG_FILE`, `RABBITMQ_LOGS`) inside the env file. RabbitMQ env files use names without the `RABBITMQ_` prefix, so these were corrected to `CONFIG_FILE` and `LOG_BASE`.
- The configuration verification command used `rabbitmqctl environment`. Updated it to `rabbitmq-diagnostics environment`, the current diagnostics command documented for inspecting node environment/configuration state.
- The Management API examples used `admin:password` even though the post created `admin` with `SecurePassword123`. Updated the examples to use the same credentials.
- The certificate generation commands changed into `/etc/rabbitmq/ssl` after creating it with `sudo`, then ran `openssl` without elevated permissions. Added `sudo` to the OpenSSL commands so the files can be written in that directory.
- The quorum queue example used legacy `rabbitmqadmin` v1 syntax. Updated it to current `rabbitmqadmin` v2 syntax using `queues declare --type quorum`.

## Review Notes
The post is technically valid after the fixes. For a future production-focused revision, the TLS section could recommend CA-issued certificates or RabbitMQ's `tls-gen` tooling instead of self-signed certificates, and the high availability guidance could explain quorum queue sizing and membership management in more depth.
