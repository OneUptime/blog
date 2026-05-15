# Validation Summary: How to Set Up RabbitMQ Shovel Plugin for Cross-Cluster Replication on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- RabbitMQ Shovel plugin
- RabbitMQ Server on RHEL 9 / CentOS Stream 9
- Linux systemd service management

## Sources Consulted
- RabbitMQ Shovel Plugin documentation: https://www.rabbitmq.com/docs/shovel
- RabbitMQ Dynamic Shovel configuration documentation: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ Static Shovel configuration documentation: https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ Plugins documentation: https://www.rabbitmq.com/docs/plugins
- RabbitMQ RPM-based Linux installation documentation: https://www.rabbitmq.com/docs/install-rpm

## Issues Found
- The post is a generic placeholder and does not provide a technically valid RabbitMQ Shovel setup. It uses placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>` instead of RabbitMQ commands or files.
- The article never installs RabbitMQ, starts `rabbitmq-server`, enables `rabbitmq_shovel`, enables `rabbitmq_shovel_management` or `rabbitmq_management` where needed, or defines a static or dynamic shovel.
- The configuration guidance is inaccurate for RabbitMQ Shovel. RabbitMQ dynamic shovels are configured through runtime parameters, the management API/UI, or `rabbitmqadmin`, while static shovels are configured in `advanced.config`; the post instead references a non-existent generic service config file.
- Because correcting the article would require adding substantial missing sections and replacing the placeholder content with a real tutorial, no README changes were made. The post should be removed or rewritten.

## Review Notes
RabbitMQ Shovel is a core plugin that moves messages unidirectionally from a source to a destination. A valid guide should distinguish static and dynamic shovels and include concrete RabbitMQ commands, queue/exchange examples, and version-appropriate installation steps for RHEL 9.
