# Validation Summary: How to Configure RabbitMQ Management Plugin for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Management Plugin
- RabbitMQ HTTP API
- RabbitMQ CLI tools (`rabbitmq-plugins`, `rabbitmqctl`)
- TLS/HTTPS
- SSH tunneling

## Sources Consulted
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ Access Control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/4.1/http-api-reference
- RabbitMQ `rabbitmqctl` manual page: https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8

## Issues Found
- The post used obsolete management listener keys (`management.listener.ip` and `management.listener.port`). I changed them to the current `management.tcp.ip` and `management.tcp.port` keys, and updated the conclusion to match.
- The post said RabbitMQ must be restarted after `rabbitmq-plugins enable rabbitmq_management`. RabbitMQ documents that node restart is not required after plugin activation, so I removed the restart command and corrected the note.
- The HTTPS example configured the HTTPS port but did not bind the HTTPS listener to the IPv4 address. I added `management.ssl.ip = 10.0.0.5` so the HTTPS example also reflects IPv4 binding.
- The monitoring user example claimed read-only access but did not grant the user any virtual host permissions. I added `rabbitmqctl set_permissions -p "/" monitor "^$" "^$" "^$"` so the user can access the management UI/API for the `/` virtual host without matching any resources for configure, write, or read operations.
- The comment above the admin permissions command said it granted access on all vhosts, but `rabbitmqctl set_permissions -p "/" ...` only applies to the `/` virtual host. I corrected the comment to match the command.
- The HTTP API health-check example used an invalid endpoint (`/api/healthchecks/node`). I changed it to the documented `GET /api/health/checks/is-in-service` endpoint and updated the description.
- The admin user comment said “management tag” while the command actually set the `administrator` tag. I corrected the comment.

## Review Notes
- The HTTP API examples still use `http://` on port `15672`. That is technically valid because RabbitMQ can serve HTTP and HTTPS together, but if a reader configures HTTPS-only access they must use `https://` on port `15671` and trust the configured CA or supply appropriate TLS client options.
- No further technical issues were found after these corrections.
