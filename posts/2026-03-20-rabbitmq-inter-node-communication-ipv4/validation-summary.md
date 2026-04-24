# Validation Summary: How to Configure RabbitMQ Inter-Node Communication on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- RabbitMQ
- Erlang distribution and `epmd`
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-diagnostics`)
- Linux firewalling with `iptables`
- Bash configuration and troubleshooting commands

## Sources Consulted
- RabbitMQ Networking guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ Configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ Clustering guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Cluster Formation and Peer Discovery guide: https://www.rabbitmq.com/docs/4.1/cluster-formation
- RabbitMQ Monitoring guide: https://www.rabbitmq.com/docs/4.1/monitoring
- RabbitMQ `rabbitmq-diagnostics` man page: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8

## Issues Found
- The post used an older `advanced.config` example to pin the distribution port. I replaced it with `distribution.listener.port_range.min` and `distribution.listener.port_range.max` in `rabbitmq.conf`, which is the current documented configuration surface for this setting.
- The IP-based node name example omitted the longname requirement. I added `USE_LONGNAME=true` and updated the CLI example to use `--longnames`, because RabbitMQ requires longnames when IP addresses are used as part of node names.
- The troubleshooting section used `rabbitmqctl node_health_check`, which is deprecated in modern RabbitMQ. I replaced it with `rabbitmq-diagnostics ... ping`, which is the current documented basic connectivity and health check.
- The networking explanation and firewall example were too narrow about inter-node ports. I clarified that `4369` and the distribution port are used by both cluster peers and RabbitMQ CLI tools, so trusted remote CLI hosts need access as well.
- The management port entry now notes that `15672` applies when the management plugin is enabled.

## Review Notes
- The post assumes the default AMQP listener port of `5672`. If `RABBITMQ_NODE_PORT` is changed and the distribution port is not explicitly pinned, RabbitMQ derives the default distribution port as `RABBITMQ_NODE_PORT + 20000`.
- Binding the Erlang distribution listener to a specific IPv4 uses `distribution.listener.interface`. Binding `epmd` itself to a specific interface is a separate concern controlled by `ERL_EPMD_ADDRESS`.
