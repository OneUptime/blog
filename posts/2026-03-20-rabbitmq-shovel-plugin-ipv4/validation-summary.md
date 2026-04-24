# Validation Summary: How to Configure RabbitMQ Shovel Plugin for IPv4 Remote Brokers

## Status
validated

## Post Type
Guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Shovel plugin
- RabbitMQ Federation plugin
- AMQP 0-9-1
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-plugins`)
- RabbitMQ Management HTTP API

## Sources Consulted
- RabbitMQ Shovel plugin overview: https://www.rabbitmq.com/docs/shovel
- RabbitMQ static shovels: https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ dynamic shovels: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ access control and permissions: https://www.rabbitmq.com/docs/access-control
- RabbitMQ runtime parameters: https://www.rabbitmq.com/docs/parameters
- RabbitMQ federation overview: https://www.rabbitmq.com/docs/federation
- RabbitMQ federated queues: https://www.rabbitmq.com/docs/federated-queues
- RabbitMQ plugins: https://www.rabbitmq.com/docs/plugins

## Issues Found
- The static shovel example used `rabbitmq.conf` keys, but RabbitMQ documents static shovels in `advanced.config` using Erlang terms. I replaced the snippet with a valid `advanced.config` example and noted that static shovel changes require a restart.
- The remote permissions command used the virtual host argument in the wrong position. I corrected it to `rabbitmqctl set_permissions -p "/" shoveler ".*" ".*" ".*"` to match RabbitMQ CLI syntax.
- The dynamic shovel example published to a destination exchange without noting that `dest-exchange` is not declared automatically. I added a short note that the destination exchange must already exist on the remote broker.
- The federation comparison overstated federation as always copying messages. I corrected the comparison and takeaway text to reflect RabbitMQ’s documented distinction between exchange federation and queue federation.
- The acknowledgement explanation said the destination “confirms receipt,” which is imprecise for publisher confirms. I corrected it to say the destination broker confirms the publish before the source message is acknowledged.

## Review Notes
- The plugin enable command is valid. A restart is not required just to enable plugins online, but it is required for static shovel configuration changes because static shovels are loaded on node boot.
- RabbitMQ’s current docs describe dynamic shovels as the preferred modern approach; the post remains valid, but readers should generally prefer dynamic shovels unless they specifically need boot-time static configuration.
