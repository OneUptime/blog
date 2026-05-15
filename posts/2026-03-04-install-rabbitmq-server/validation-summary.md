# Validation Summary: How to Install RabbitMQ Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RabbitMQ Server
- Erlang/OTP
- dnf/yum RPM repositories
- systemd
- firewalld

## Sources Consulted
- RabbitMQ official RPM installation guide: https://www.rabbitmq.com/docs/install-rpm
- RabbitMQ official configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ official command line tools guide: https://www.rabbitmq.com/docs/cli
- RabbitMQ official networking guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ official Erlang version requirements: https://www.rabbitmq.com/docs/which-erlang
- firewalld official firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks

## Issues Found
- The installation commands used placeholders such as `<package-name>` instead of real RabbitMQ packages. Replaced them with RabbitMQ signing key imports, the RabbitMQ RPM repository definition, and `dnf install -y erlang rabbitmq-server`, matching RabbitMQ's official RPM installation guidance.
- The dependency step installed `epel-release` and `"Development Tools"`, which are not required by the official RabbitMQ RPM installation path. Replaced that with `logrotate`, which RabbitMQ documents as a package dependency.
- The configuration path used `/etc/<service>/config.conf`, which is not RabbitMQ's main configuration file. Replaced it with `/etc/rabbitmq/rabbitmq.conf`.
- The systemd commands used `<service>`, which would not run. Replaced them with the actual `rabbitmq-server` unit.
- The verification command used a nonexistent generic `<service> --test` pattern. Replaced it with `rabbitmq-diagnostics ping` and `rabbitmq-diagnostics status`, which are documented RabbitMQ CLI diagnostics.
- The firewall command used `--add-service=<service>`, but RabbitMQ does not require that placeholder service name. Replaced it with `--add-port=5672/tcp` for AMQP client traffic and noted `15672/tcp` for the management plugin.
- The monitoring and troubleshooting commands used `<service>` placeholders. Replaced them with RabbitMQ-specific service and process names.

## Review Notes
The repository example is written for RHEL 9 and includes an inline note for adapting it to RHEL 8. The post could be expanded in the future with separate RHEL 8 and RHEL 9 repository blocks, TLS configuration examples, and user/vhost setup, but the current commands are technically valid for the stated installation flow.
