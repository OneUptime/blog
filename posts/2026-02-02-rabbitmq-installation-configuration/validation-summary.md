# Validation Summary: How to Install and Configure RabbitMQ

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- RabbitMQ (server, plugins, management UI, Prometheus plugin)
- AMQP 0-9-1
- Erlang (as a RabbitMQ dependency)
- Ubuntu/Debian apt package management
- Homebrew (macOS)
- Docker and Docker Compose
- `rabbitmqctl` and `rabbitmq-diagnostics` CLIs
- TLS/SSL configuration
- Classic mirrored queues and quorum queues (Raft consensus)
- systemd service management and limits
- Python `pika` client
- Node.js `amqplib` client

## Sources Consulted
- RabbitMQ official documentation: https://www.rabbitmq.com/docs/
- RabbitMQ Debian/Ubuntu installation: https://www.rabbitmq.com/docs/install-debian
- RabbitMQ configuration reference: https://www.rabbitmq.com/docs/configure
- RabbitMQ networking and connection limits: https://www.rabbitmq.com/docs/networking
- RabbitMQ consumers and `consumer_timeout`: https://www.rabbitmq.com/docs/consumers
- RabbitMQ memory use and watermarks: https://www.rabbitmq.com/docs/memory-use and https://www.rabbitmq.com/docs/memory
- RabbitMQ monitoring and HTTP health checks: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ management plugin: https://www.rabbitmq.com/docs/management
- RabbitMQ blog on apt repo migration (2025): https://www.rabbitmq.com/blog/2025/07/16/debian-apt-repositories-are-moving
- pika docs: https://pika.readthedocs.io/
- amqplib docs: https://amqp-node.github.io/amqplib/

## Issues Found
1. **Outdated Debian/Ubuntu apt repository URL.** The post used `https://ppa1.novemberain.com/rabbitmq/rabbitmq-server/deb/ubuntu`, which was the historical Cloudsmith mirror. RabbitMQ migrated the official apt repos to `deb1.rabbitmq.com` / `deb2.rabbitmq.com` (the prior `ppa1.rabbitmq.com` mirrors were scheduled to stop receiving updates by Nov 1, 2025). Updated the URL to `https://deb1.rabbitmq.com/rabbitmq-server/deb/ubuntu jammy main`.

2. **Invalid `connection_max` setting.** The post's `rabbitmq.conf` example included `connection_max = 1000`, which is not a recognized RabbitMQ configuration key — total connection capacity is governed by OS-level limits, Erlang process limits, and per-vhost/user limits configured via `rabbitmqctl`, not via a global `connection_max`. Removed the line; kept `channel_max` (which is valid) and clarified its comment.

3. **Misleading `consumer_timeout` comment.** The setting was labelled "Consumer prefetch (how many unacked messages a consumer can have)", which conflates it with `basic.qos` / prefetch_count. `consumer_timeout` actually closes the channel with `PRECONDITION_FAILED` if a consumer does not ack a delivered message within the given duration (default 30 minutes). Updated the inline comment to describe the real behaviour.

4. **Wrong description of `node-is-mirror-sync-critical` health check.** The post said this endpoint checks "if node is running"; it actually returns 503 if there are classic mirrored queues without a synchronised mirror online (i.e., stopping the node would risk data loss). Corrected the comment and added the modern `node-is-quorum-critical` endpoint, which is the quorum-queue equivalent and more relevant going forward.

## Review Notes
- The Ubuntu install snippet adds the Launchpad Erlang signing key but does not actually add the Launchpad Erlang PPA `apt-add-repository`, so installs will rely on whatever Erlang version Ubuntu's base repos provide. That is enough on recent Ubuntu LTS releases for current RabbitMQ versions, but if the user targets an older Ubuntu where the bundled Erlang is too old, they will need to add the Erlang PPA separately. Left as-is because the install will still succeed on modern Ubuntu.
- The post still teaches classic mirrored queues (`set_policy ha-all ...`). These are deprecated and removed in RabbitMQ 4.x — the post correctly notes that quorum queues are recommended for new deployments, so this is acceptable transitional guidance, but future revisions may want to drop the classic mirroring section entirely once 3.x is past EOL.
- `docker-compose.yml` uses `version: '3.8'`. The `version` field is now obsolete in Compose v2 (it is ignored, not an error). Left untouched because it does not cause failures.
- `RABBITMQ_MNESIA_DIR` is the historical variable name; newer documentation uses `RABBITMQ_MNESIA_BASE`/`RABBITMQ_MNESIA_DIR` (both still recognized) and the underlying database is being renamed away from "Mnesia" in 4.x toward Khepri. The example still works; just noting for future updates.
- The pika and amqplib code samples are syntactically correct and use current public APIs at the time of review.
