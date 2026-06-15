# Validation Summary: How to Implement Shovel for Message Routing in RabbitMQ

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- RabbitMQ Shovel plugin
- RabbitMQ dynamic and static shovel configuration
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-plugins`)
- RabbitMQ Management HTTP API
- Python `requests`
- Node.js `axios`

## Sources Consulted
- RabbitMQ Shovel Plugin documentation: https://www.rabbitmq.com/docs/shovel
- RabbitMQ Dynamic Shovels documentation: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ Static Shovels documentation: https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ Schema Definitions documentation: https://www.rabbitmq.com/docs/definitions
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Management HTTP API reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ networking troubleshooting documentation: https://www.rabbitmq.com/docs/troubleshooting-networking
- RabbitMQ `rabbitmq-diagnostics` manual: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8

## Issues Found
- The opening comparison described federation as bidirectional. RabbitMQ documents Shovel as always unidirectional, while federation can be bidirectional or N-directional with multiple clusters. Updated the wording to be precise.
- The static shovel section implied static shovels could be configured in `rabbitmq.conf`. RabbitMQ documents static shovels as `advanced.config` only. Updated the text and replaced the invalid `rabbitmq.conf` shovel keys with a valid definitions import example for dynamic shovels.
- Several dynamic shovel examples used invalid parameter names: `dest-routing-key`, `prefetch-count`, and `add-forward-headers`. Updated them to `dest-exchange-key`, `src-prefetch-count`, and `dest-add-forward-headers` per the RabbitMQ dynamic shovel reference.
- The Python Management API example encoded only `/` in vhost names. Replaced it with `urllib.parse.quote(vhost, safe='')` so arbitrary virtual host names are path-safe.
- The troubleshooting command used Erlang node ping while describing source AMQP connectivity. Replaced it with an AMQP port reachability check using `nc`.

## Review Notes
The article is now technically accurate for current RabbitMQ documentation. Dynamic shovels are the modern recommended approach in RabbitMQ docs; static shovels remain documented but are less flexible and require node restarts for configuration changes.
