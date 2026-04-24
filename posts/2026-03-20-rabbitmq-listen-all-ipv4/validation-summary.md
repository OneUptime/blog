# Validation Summary: How to Configure RabbitMQ to Listen on All IPv4 Interfaces

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- RabbitMQ
- AMQP
- RabbitMQ Management plugin
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-diagnostics`)
- UFW
- iptables
- `ss`
- `nc` / netcat

## Sources Consulted
- RabbitMQ Networking guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ Management plugin guide: https://www.rabbitmq.com/docs/management
- RabbitMQ Access Control guide: https://www.rabbitmq.com/docs/access-control
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ `rabbitmq-diagnostics` manual: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- Local `ufw --help`
- Local `iptables --help`
- Local `nc -h`

## Issues Found
1. **Outdated management listener keys**: The post used `management.listener.ip` and `management.listener.port`. Current RabbitMQ documentation uses `management.tcp.ip` and `management.tcp.port`. I updated the configuration snippet and conclusion to use the current keys.

2. **Inaccurate default-listener explanation**: The post said RabbitMQ defaults to `0.0.0.0`. Current RabbitMQ docs state that RabbitMQ listens on port 5672 on all available interfaces by default. I updated the introduction, config comment, and conclusion to distinguish the default behavior from an explicit IPv4-only all-interface binding with `listeners.tcp.1 = 0.0.0.0:5672`.

3. **Unsupported diagnostics command**: The post used `rabbitmq-diagnostics network_info`, which is not present in the current RabbitMQ CLI documentation. I replaced it with the documented `rabbitmq-diagnostics -s listeners`.

4. **Overstated `guest` user comment**: The post labeled the default `guest` user as simply "insecure". Current RabbitMQ docs are more specific: the `guest` user is localhost-only by default, but production systems should not rely on it. I updated the comment to reflect the documented recommendation without overstating the default behavior.

## Review Notes
- The RabbitMQ CLI commands shown for creating users, virtual hosts, setting permissions, listing listeners, and listing connections are valid against current RabbitMQ documentation.
- The UFW, iptables, `ss`, and `nc` command syntax is valid based on local CLI help output.
- This review was documentation-based; the commands were not executed against a live RabbitMQ node in this repository.
