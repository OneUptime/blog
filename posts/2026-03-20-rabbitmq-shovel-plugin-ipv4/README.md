# How to Configure RabbitMQ Shovel Plugin for IPv4 Remote Brokers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Shovel, IPv4, AMQP, Messaging, Plugin, Configuration

Description: Learn how to configure the RabbitMQ Shovel plugin to move messages from a queue on one IPv4 broker to an exchange on another broker.

---

The RabbitMQ Shovel plugin consumes messages from a source queue and republishes them to a destination exchange on the same or a different broker. Unlike federation (which is configured with upstreams and policies on exchanges or queues), a shovel moves messages between explicitly configured endpoints, making it ideal for message migration, aggregation, or routing between datacenters.

## Use Cases for Shovel

- Move messages from a local broker to a central aggregator over IPv4.
- Migrate messages from an old broker to a new one without downtime.
- Forward overflow messages from a local queue to a backup broker.

## Enabling the Shovel Plugin

```bash
rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management
systemctl restart rabbitmq-server
```

## Static Shovel via advanced.config

Static shovels are loaded on node boot, so restart RabbitMQ after saving `advanced.config`.

```erlang
%% /etc/rabbitmq/advanced.config

[
  {rabbitmq_shovel,
   [{shovels,
     [{my_shovel,
       [{source,
         [{protocol, amqp091},
          {uris, ["amqp://admin:password@127.0.0.1:5672"]},
          {queue, <<"source-queue">>}]},
        {destination,
         [{protocol, amqp091},
          {uris, ["amqp://shoveler:shovelerpass@10.0.0.20:5672"]},
          {declarations, [{'exchange.declare',
                           [{exchange, <<"target-exchange">>},
                            {type, <<"direct">>},
                            durable]}]},
          {publish_fields, [{exchange, <<"target-exchange">>},
                            {routing_key, <<"shovel.forwarded">>}]}]},
        {ack_mode, on_confirm},
        {reconnect_delay, 5}
       ]}]}]}
].
```

## Dynamic Shovel via CLI

Dynamic shovels are stored in the RabbitMQ database and can be created/deleted at runtime.

```bash
# Create a dynamic shovel on the local broker.
# The destination exchange must already exist on the remote broker.
rabbitmqctl set_parameter shovel my-dynamic-shovel \
'{
  "src-protocol": "amqp091",
  "src-uri": "amqp://admin:password@127.0.0.1:5672",
  "src-queue": "local-queue",
  "dest-protocol": "amqp091",
  "dest-uri": "amqp://shoveler:shovelerpass@10.0.0.20:5672",
  "dest-exchange": "remote-exchange",
  "dest-exchange-key": "forwarded",
  "ack-mode": "on-confirm",
  "reconnect-delay": 5
}'
```

## Creating the Destination User on the Remote Broker

```bash
# On the remote broker (10.0.0.20):
rabbitmqctl add_user shoveler shovelerpass
rabbitmqctl set_permissions -p "/" shoveler ".*" ".*" ".*"
```

## Checking Shovel Status

```bash
# Via CLI
rabbitmqctl shovel_status

# Via management API
curl -u admin:password http://localhost:15672/api/shovels | python3 -m json.tool

# Expected state: "running" when the shovel is active
```

## Removing a Dynamic Shovel

```bash
rabbitmqctl clear_parameter shovel my-dynamic-shovel
```

## Shovel vs Federation

| Feature | Shovel | Federation |
|---------|--------|------------|
| Scope | Explicit source/destination endpoints | Policies on exchanges or queues |
| Direction | Usually one-way | One-way, bidirectional, or N-directional |
| Messages | Moves messages unconditionally from the source | Exchange federation replays/copies; queue federation moves on demand |
| Configuration | Static definitions or dynamic runtime parameters | Upstreams plus policies |
| Best for | Migration, aggregation | Geo-distribution, distributed topologies |

## Key Takeaways

- Shovels move messages unconditionally from a configured source; exchange federation replays message streams, while queue federation moves messages on demand.
- Dynamic shovels (via `set_parameter`) can be created and removed without restart.
- Set `reconnect-delay` to auto-reconnect if the destination IPv4 broker becomes temporarily unavailable.
- Use `ack-mode: on-confirm` for reliable delivery; the source message is only acknowledged after the destination broker confirms the publish.
