# Validation Summary: How to Configure RabbitMQ Virtual Hosts and User Permissions on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RabbitMQ
- systemd
- firewalld

## Sources Consulted
- RabbitMQ RPM installation documentation: https://www.rabbitmq.com/docs/install-rpm
- RabbitMQ virtual hosts documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The article is a generic placeholder and does not provide RabbitMQ-specific installation, virtual host, user, or permission commands. The commands use placeholders such as `<package-name>` and `<service>` instead of `rabbitmq-server`, `rabbitmqctl add_vhost`, `rabbitmqctl add_user`, or `rabbitmqctl set_permissions`.
- The suggested configuration path `/etc/<service>/config.conf` is not an accurate RabbitMQ configuration path. RabbitMQ RPM packages use RabbitMQ-specific paths such as `/etc/rabbitmq/rabbitmq.conf` when configuration is needed.
- The service management commands use `<service>` instead of the RabbitMQ systemd unit name `rabbitmq-server`.
- The verification command `sudo <service> --test` is not a valid RabbitMQ verification command. RabbitMQ provides tools such as `rabbitmqctl status` and `rabbitmq-diagnostics`.
- The firewall example uses `--add-service=<service>`, but the post does not identify a valid firewalld service or RabbitMQ port. RabbitMQ commonly requires explicit port rules depending on what is exposed, such as AMQP port `5672/tcp` or management UI port `15672/tcp`.
- Because the technical content is placeholder material throughout and does not teach the topic named in the title, the post should be removed or fully rewritten rather than lightly corrected.

## Review Notes
The topic is salvageable, but this specific post is not. A replacement should use the official RabbitMQ RPM repository instructions for RHEL-compatible systems, start `rabbitmq-server`, create vhosts with `rabbitmqctl add_vhost`, create users with `rabbitmqctl add_user`, assign permissions with `rabbitmqctl set_permissions`, and verify with RabbitMQ CLI tools.
