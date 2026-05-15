# Validation Summary: How to Install and Configure RabbitMQ on RHEL 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RabbitMQ Server
- Erlang/OTP
- systemd
- firewalld
- RabbitMQ management plugin
- rabbitmqctl, rabbitmq-plugins, and rabbitmqadmin

## Sources Consulted
- RabbitMQ official RPM installation guide: https://www.rabbitmq.com/docs/install-rpm
- RabbitMQ Erlang version requirements: https://www.rabbitmq.com/docs/which-erlang
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ rabbitmqadmin documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ command line tools documentation: https://www.rabbitmq.com/docs/3.13/cli
- RabbitMQ networking documentation: https://www.rabbitmq.com/docs/next/networking

## Issues Found
- The Erlang install command used `releases/latest/download` with a fixed `erlang-26.2.5-1.el9.x86_64.rpm` filename. That pattern is unreliable because the latest GitHub release may not contain that older file. I changed it to a versioned Erlang RPM URL for `27.3.4.9`, which is a supported Erlang series for current RabbitMQ releases on RHEL 9.
- The RabbitMQ install command used `releases/latest/download` with a fixed `rabbitmq-server-3.13.0-1.el9.noarch.rpm` filename. That URL is stale and can fail when the latest release changes. I changed it to the official current direct-download RPM, `rabbitmq-server-4.3.0-1.el8.noarch.rpm`, which the RabbitMQ RPM installation guide documents as suitable for RHEL 8 and RHEL 9.
- The direct RabbitMQ RPM installation omitted the `logrotate` dependency that RabbitMQ documents for direct RPM installs. I added `sudo dnf install -y logrotate` before installing the RabbitMQ server RPM.
- The RabbitMQ package signing key was imported only in Step 2, after Erlang was installed. I moved the import into Step 1 so the directly installed Erlang RPM is covered before package installation begins.

## Review Notes
- RabbitMQ's official RPM documentation recommends installing from the RabbitMQ-maintained dnf/yum repositories for easier dependency resolution and upgrades. The post still uses direct RPM URLs to preserve the existing step-by-step structure.
- The downloaded `rabbitmqadmin` command in the post is the legacy v1 tool served by the management plugin. RabbitMQ documentation now recommends `rabbitmqadmin` v2 for new usage, but the v1 workflow shown remains valid for simple local testing.
