# Validation Summary: How to Set Up RabbitMQ Federation Over IPv4 Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RabbitMQ
- RabbitMQ Federation plugin
- RabbitMQ Management HTTP API
- AMQP 0-9-1
- IPv4 networking

## Sources Consulted
- RabbitMQ Federation guide: https://www.rabbitmq.com/docs/federation
- RabbitMQ Federated Exchanges guide: https://www.rabbitmq.com/docs/federated-exchanges
- RabbitMQ Federation Reference: https://www.rabbitmq.com/docs/federation-reference
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Access Control guide: https://www.rabbitmq.com/docs/access-control
- RabbitMQ URI Specification: https://www.rabbitmq.com/docs/uri-spec
- rabbitmqadmin v2 guide: https://www.rabbitmq.com/docs/management-cli

## Issues Found
- The description and introduction implied that exchange and queue federation behave the same way. I narrowed the wording to exchange federation so it matches the commands actually shown and RabbitMQ's documented behavior.
- The upstream AMQP URI omitted the vhost path. I changed it to `/%2F` and made the default-vhost scope explicit, because federation upstreams are vhost-scoped and the URI should identify the target vhost.
- The permissions command used incorrect `rabbitmqctl set_permissions` argument order. I updated it to the documented `-p "/" feduser ".*" ".*" ".*"` form.
- The link-verification step used `rabbitmqctl eval 'rabbit_federation_status:status().'`, which relies on an internal Erlang call instead of the documented CLI. I replaced it with `rabbitmqctl federation_status`.
- The testing section would not work as written because the `orders` exchange was never declared, the downstream queue and binding were missing, and the example used legacy `rabbitmqadmin` v1-style commands. I replaced that flow with documented HTTP API calls that declare the required topology on both brokers, publish to the upstream exchange, and fetch from the downstream queue.
- The `max-hops` explanation was too general. I clarified that it applies to messages published to federated exchanges.

## Review Notes
- The post now accurately documents an exchange-federation setup on the default vhost `/`. Queue federation in RabbitMQ has different semantics and would require a separate example.
- Review was documentation-based against current RabbitMQ docs available on April 24, 2026; commands were not executed against live brokers in this repository.
