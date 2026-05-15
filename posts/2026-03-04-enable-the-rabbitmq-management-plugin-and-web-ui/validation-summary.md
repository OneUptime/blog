# Validation Summary: How to Enable the RabbitMQ Management Plugin and Web UI on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RabbitMQ
- RabbitMQ Management Plugin
- systemd
- firewalld

## Sources Consulted
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ RPM-based Linux installation documentation: https://www.rabbitmq.com/docs/install-rpm
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`. Changed these to `rabbitmq-server` and noted that official RabbitMQ and Erlang RPM repositories should be configured first for RHEL.
- The post installed unrelated generic dependencies, including EPEL and Development Tools. Replaced them with `logrotate`, which RabbitMQ documents as an RPM package dependency for direct RPM installation.
- The post used placeholder service configuration paths such as `/etc/<service>/config.conf`. Replaced this with `/etc/rabbitmq/rabbitmq.conf` and the documented `management.tcp.port = 15672` setting.
- The post did not actually enable the management plugin. Added the documented `rabbitmq-plugins enable rabbitmq_management` command.
- The post used placeholder systemd and log commands for `<service>`. Replaced these with `rabbitmq-server`.
- The post used `sudo <service> --test`, which is not a valid RabbitMQ validation command. Replaced it with `rabbitmq-diagnostics -q ping` and `rabbitmq-diagnostics -s listeners`.
- The post used `firewall-cmd --add-service=<service>`, but RabbitMQ management UI is commonly opened by TCP port. Replaced this with `firewall-cmd --permanent --add-port=15672/tcp`.
- The troubleshooting section did not mention the default `guest` account localhost restriction. Added a note that remote management access should use a separate user.

## Review Notes
The post is now technically accurate for enabling the RabbitMQ management plugin and web UI on RHEL. A future improvement would be to include the complete official RabbitMQ repository setup for a specific RHEL major version, because RabbitMQ notes that distribution repositories can lag behind supported RabbitMQ releases.
