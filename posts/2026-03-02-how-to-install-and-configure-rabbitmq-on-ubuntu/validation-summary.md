# Validation Summary: How to Install and Configure RabbitMQ on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- RabbitMQ Server
- Erlang/OTP
- AMQP
- RabbitMQ management plugin and HTTP API
- RabbitMQ CLI tools
- RabbitMQ virtual hosts, users, permissions, exchanges, queues, bindings, and dead letter exchanges
- UFW firewall rules

## Sources Consulted
- RabbitMQ official Debian/Ubuntu installation guide: https://www.rabbitmq.com/docs/install-debian
- RabbitMQ official configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ official logging guide: https://www.rabbitmq.com/docs/logging
- RabbitMQ official management plugin guide: https://www.rabbitmq.com/docs/management
- RabbitMQ official HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ official rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ official dead letter exchange guide: https://www.rabbitmq.com/docs/dlx

## Issues Found
- The installation snippet used older Erlang Solutions and packagecloud repository instructions while describing the setup as the official RabbitMQ repository. Updated it to use the current Team RabbitMQ apt repositories, signing key, mirrors, and apt pinning pattern from the official Debian/Ubuntu installation guide.
- The admin permissions comment said the command granted access to all virtual hosts, but `rabbitmqctl set_permissions -p "/"` only targets the default `/` virtual host. Updated the comment to match the command.
- The post called `/etc/rabbitmq/rabbitmq.conf` the advanced configuration file. Corrected it to the main configuration file; RabbitMQ's advanced configuration file is `advanced.config`.
- The `default_user` comment said it is used for clustering rather than login. Corrected the comment to explain that it creates a default user only when RabbitMQ initializes a new database.
- The maximum message size comment said the default is 128 MB. Updated it to the current RabbitMQ 4.3 default of 16 MB while keeping the example value that explicitly raises it to 128 MB.
- The HTTP API publish example used `POST`; the current RabbitMQ HTTP API reference defines the exchange publish endpoint as `PUT`. Updated the command.
- Quoted example passwords containing `!` in shell commands and `curl -u` arguments so they work reliably in interactive shells with history expansion enabled.

## Review Notes
The management plugin restart command is not always required after enabling the plugin on a running node, but it remains a valid operational step and was left unchanged. The repository snippet follows the official amd64 Team RabbitMQ apt repository pattern; arm64 installations require the documented Launchpad-based Erlang adjustment.
