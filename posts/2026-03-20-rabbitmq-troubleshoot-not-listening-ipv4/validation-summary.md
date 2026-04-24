# Validation Summary: How to Troubleshoot RabbitMQ Not Listening on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- Erlang runtime and RabbitMQ CLI tooling
- Linux service and networking tools (`systemctl`, `journalctl`, `ss`, `lsof`, `fuser`, `ufw`, `iptables`, `nc`)
- RabbitMQ Management HTTP API

## Sources Consulted
- RabbitMQ Networking guide — https://www.rabbitmq.com/docs/networking
- RabbitMQ Troubleshooting guide — https://www.rabbitmq.com/docs/troubleshooting
- RabbitMQ `rabbitmq-diagnostics` man page — https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- RabbitMQ Logging guide — https://www.rabbitmq.com/docs/4.1/logging
- RabbitMQ Access Control guide — https://www.rabbitmq.com/docs/access-control
- RabbitMQ Clustering guide — https://www.rabbitmq.com/docs/clustering
- RabbitMQ `rabbitmqctl` man page — https://www.rabbitmq.com/docs/next/man/rabbitmqctl.8
- Local command help output checked for Linux CLI syntax: `ss --help`, `journalctl --help`, `fuser` usage output

## Issues Found

1. **`rabbitmq-diagnostics network_info` was not a valid current command.** Replaced it with `rabbitmq-diagnostics check_port_listener 5672`, which is documented and directly relevant to verifying the AMQP listener.

2. **The post implied `check_port_connectivity` proves AMQP is responding.** RabbitMQ documents that this command only verifies that listener ports accept a new TCP connection; it does not perform AMQP protocol handshake or authentication. Updated the comment to reflect the actual behavior.

3. **The wrong-IP section could mislead readers about how port 25672 is bound.** `listeners.tcp.*` configures AMQP client listeners, but inter-node and CLI traffic uses `distribution.listener.interface`. Added that setting and tightened the config grep example accordingly.

4. **The port-conflict kill example was brittle.** Replaced `kill $(fuser ...)` with `fuser -k -TERM 5672/tcp` after a verbose `fuser` inspection, which is clearer and uses supported `fuser` options directly.

5. **The reset sequence was technically incorrect and the comment was misleading.** `rabbitmqctl reset` requires the RabbitMQ application to be stopped with `rabbitmqctl stop_app`; stopping the whole service with `systemctl stop` prevents the CLI command from connecting. Also, `reset` does not reset `rabbitmq.conf`; it clears node state and data. Updated the sequence to `stop_app`, `reset`, `start_app` and corrected the comment.

## Review Notes
- The post is Linux-centric and assumes systemd-based hosts plus common Linux networking tools. That is acceptable given the command set used throughout the article.
- The log file path examples use the common Linux package defaults under `/var/log/rabbitmq/`. RabbitMQ log locations can be overridden, so `rabbitmq-diagnostics log_tail` and `log_tail_stream` are more portable when CLI connectivity works.
- The management API example uses `guest:guest` on `127.0.0.1`, which is valid for default localhost-only `guest` access, but it will fail if the default credentials were changed or the management plugin is not enabled.
