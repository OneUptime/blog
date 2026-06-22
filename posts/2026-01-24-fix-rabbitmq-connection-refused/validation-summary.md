# Validation Summary: How to Fix 'Connection Refused' Errors in RabbitMQ

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ
- AMQP
- RabbitMQ configuration
- rabbitmqctl and rabbitmq-plugins
- Python Pika
- Node.js amqplib
- systemd
- UFW, iptables, netstat, ss, nc, telnet, curl

## Sources Consulted
- RabbitMQ Networking documentation: https://www.rabbitmq.com/docs/networking
- RabbitMQ Access Control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- Pika Connection Parameters documentation: https://pika.readthedocs.io/en/stable/modules/parameters.html
- amqplib Channel API documentation: https://amqp-node.github.io/amqplib/channel_api.html
- systemctl manual page: https://www.man7.org/linux/man-pages/man1/systemctl.1.html
- curl manual page: https://curl.se/docs/manpage.html

## Issues Found
- The post stated that RabbitMQ only listens on localhost by default. RabbitMQ's official networking documentation says it listens on port 5672 on all available interfaces by default. Updated Step 2 to explain that localhost-only binding is a possible explicit configuration, not the default.
- The listener example used `listeners.tcp.default = 5672` while describing an explicit all-interface bind. That setting is valid but effectively restates the default. Updated it to `listeners.tcp.1 = 0.0.0.0:5672` to clearly show an explicit IPv4 all-interface binding.
- The common causes table referenced `listeners.tcp.default` for fixing localhost-only binding. Updated it to `listeners.tcp.1` to match the corrected configuration example.

## Review Notes
- The RabbitMQ `guest` user restriction, management plugin command and default UI port, `rabbitmqctl` user and permission commands, Pika connection parameters, and amqplib connection options match the consulted documentation.
- Authentication failures, including remote `guest` restrictions, usually occur after TCP connection succeeds and may surface differently from a pure TCP connection refused error. The post distinguishes authentication failure in the flow diagram, so no edit was required.
