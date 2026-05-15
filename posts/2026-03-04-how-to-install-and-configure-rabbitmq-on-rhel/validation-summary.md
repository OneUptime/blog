# Validation Summary: How to Install and Configure RabbitMQ on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RabbitMQ
- Erlang/OTP
- AMQP
- systemd
- firewalld
- RabbitMQ management plugin
- RabbitMQ CLI tools

## Sources Consulted
- RabbitMQ RPM installation guide: https://www.rabbitmq.com/docs/install-rpm
- RabbitMQ package repository update announcement: https://www.rabbitmq.com/blog/2024/08/11/package-repository-updates
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ configuration documentation: https://www.rabbitmq.com/docs/3.13/configure
- RabbitMQ memory threshold documentation: https://www.rabbitmq.com/docs/memory
- RabbitMQ virtual hosts documentation: https://www.rabbitmq.com/docs/vhosts
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation block used deprecated PackageCloud repository URLs for Erlang and RabbitMQ. RabbitMQ announced that its PackageCloud account would be discontinued on August 18, 2024, and the current RPM installation guide uses RabbitMQ-maintained `*.rabbitmq.com` mirrors. I replaced the repository setup with the current RHEL 9 `yum1.rabbitmq.com` and `yum2.rabbitmq.com` repository definitions and signing keys.
- The package installation command omitted `logrotate`, which the RabbitMQ RPM installation guide lists as a package dependency. I added `logrotate` to the `dnf install` command.
- The final production note said to change the default guest credentials. RabbitMQ documentation allows overriding the default user before first boot, but production systems commonly remove or replace the default `guest` user. I changed the wording to "remove or replace" to match the documented options and the guide's earlier `delete_user guest` command.

## Review Notes
- The repository snippet now targets RHEL 9, matching the original post's hard-coded `el/9` repository paths. RHEL 8 requires the corresponding RabbitMQ `el/8` repository definitions.
- The RabbitMQ CLI examples, management plugin enablement, management UI port, virtual host commands, firewall commands, and `rabbitmq.conf` settings reviewed are technically valid.
