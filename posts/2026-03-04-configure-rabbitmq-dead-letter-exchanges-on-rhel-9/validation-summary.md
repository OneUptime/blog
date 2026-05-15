# Validation Summary: How to Configure RabbitMQ Dead Letter Exchanges on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder guide

## Technologies Covered
- RabbitMQ
- Dead Letter Exchanges
- Red Hat Enterprise Linux 9
- systemd

## Sources Consulted
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ RPM-based Linux installation documentation: https://www.rabbitmq.com/docs/install-rpm

## Issues Found
- The post is a placeholder rather than a working RabbitMQ Dead Letter Exchange guide. It uses generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>` instead of RabbitMQ-specific commands or configuration.
- The post does not explain or configure RabbitMQ dead lettering. Official RabbitMQ documentation describes configuring dead letter exchanges through queue optional arguments or, preferably, policies using keys such as `dead-letter-exchange` and `dead-letter-routing-key`.
- The service commands are not RabbitMQ-specific. RabbitMQ's RPM documentation identifies the systemd service as `rabbitmq-server`.
- Because the article does not contain a salvageable RabbitMQ DLX procedure and is effectively placeholder content, it was classified as `not-technically-relevant` rather than rewritten into a new article.

## Review Notes
The title and description describe a RabbitMQ Dead Letter Exchange tutorial for RHEL 9, but the body does not include the required RabbitMQ installation, exchange declaration, queue binding, policy setup, or verification commands. A future replacement should use RabbitMQ's current policy-based DLX guidance and RHEL-compatible `rabbitmq-server` service management commands.
