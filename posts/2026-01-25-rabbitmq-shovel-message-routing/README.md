# How to Implement Shovel for Message Routing in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Shovel, Message Routing, Data Migration, Message Queues, Integration

Description: Learn how to use RabbitMQ Shovel plugin for reliable message routing between brokers, queues, and data centers with practical configuration examples.

---

RabbitMQ Shovel is a plugin that moves messages from one place to another. It can connect queues within the same broker, across different brokers, or between entirely separate RabbitMQ clusters. Unlike federation which is bidirectional and policy-based, Shovel gives you explicit point-to-point message movement with fine-grained control.

## When to Use Shovel

Shovel works best for:

- Migrating messages between environments (dev to staging)
- Bridging queues across different clusters
- Aggregating messages from multiple sources
- Moving messages to a different virtual host
- One-time or continuous data migration

```mermaid
flowchart LR
    subgraph Source["Source Broker"]
        SQ[Source Queue]
    end

    SHOVEL[Shovel]

    subgraph Dest["Destination Broker"]
        DX[Dest Exchange]
        DQ[Dest Queue]
        DX --> DQ
    end

    SQ --> SHOVEL
    SHOVEL --> DX
```

## Enabling the Shovel Plugin

First, enable the plugin on nodes that will run shovels:

```bash
# Enable shovel plugin
rabbitmq-plugins enable rabbitmq_shovel

# Enable management UI extension (optional but helpful)
rabbitmq-plugins enable rabbitmq_shovel_management

# Restart RabbitMQ
systemctl restart rabbitmq-server

# Verify plugins are enabled
rabbitmq-plugins list | grep shovel
```

## Configuring Static Shovels

Static shovels are defined in the RabbitMQ configuration file and start automatically.

### Basic Shovel Configuration

```erlang
%% /etc/rabbitmq/rabbitmq.conf (new format)
%% or /etc/rabbitmq/advanced.config (classic format)

%% advanced.config example
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Shovel named 'migrate_orders'
      {migrate_orders, [
        {source, [
          {protocol, amqp091},
          {uris, ["amqp://user:pass@source-broker:5672"]},
          {declarations, []},
          {queue, <<"orders_old">>},
          {prefetch_count, 100}
        ]},
        {destination, [
          {protocol, amqp091},
          {uris, ["amqp://user:pass@dest-broker:5672"]},
          {declarations, [
            {'exchange.declare', [
              {exchange, <<"orders">>},
              {type, <<"direct">>},
              {durable, true}
            ]}
          ]},
          {publish_fields, [
            {exchange, <<"orders">>},
            {routing_key, <<"new_order">>}
          ]}
        ]},
        {ack_mode, on_confirm},
        {reconnect_delay, 5}
      ]}
    ]}
  ]}
].
```

### Using rabbitmq.conf Format

```ini
# /etc/rabbitmq/rabbitmq.conf

# Define a shovel named 'my_shovel'
shovel.my_shovel.source.uri = amqp://user:pass@source-broker:5672
shovel.my_shovel.source.queue = source_queue
shovel.my_shovel.source.prefetch_count = 100

shovel.my_shovel.destination.uri = amqp://user:pass@dest-broker:5672
shovel.my_shovel.destination.exchange = dest_exchange
shovel.my_shovel.destination.routing_key = migrated

shovel.my_shovel.ack_mode = on-confirm
shovel.my_shovel.reconnect_delay = 5
```

## Configuring Dynamic Shovels

Dynamic shovels are configured at runtime and can be changed without restarting RabbitMQ.

### Using rabbitmqctl

```bash
# Create a dynamic shovel
rabbitmqctl set_parameter shovel my-shovel \
  '{"src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@source:5672",
    "src-queue": "source_queue",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@dest:5672",
    "dest-exchange": "dest_exchange",
    "dest-routing-key": "migrated",
    "ack-mode": "on-confirm",
    "prefetch-count": 100}'

# List all shovels
rabbitmqctl list_parameters -p / | grep shovel

# Delete a shovel
rabbitmqctl clear_parameter shovel my-shovel
```

### Using the Management API

```python
import requests
from requests.auth import HTTPBasicAuth
import json

def create_shovel(host, vhost, name, config, user, password):
    """Create a dynamic shovel via the Management API"""

    # URL encode vhost
    vhost_encoded = vhost.replace('/', '%2f')

    url = f"http://{host}:15672/api/parameters/shovel/{vhost_encoded}/{name}"

    payload = {
        "value": config
    }

    response = requests.put(
        url,
        json=payload,
        auth=HTTPBasicAuth(user, password)
    )

    if response.status_code in [201, 204]:
        print(f"Shovel '{name}' created successfully")
    else:
        print(f"Failed to create shovel: {response.text}")

    return response

# Configure shovel
shovel_config = {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@source-broker:5672",
    "src-queue": "orders_legacy",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@dest-broker:5672",
    "dest-exchange": "orders",
    "dest-routing-key": "migrated",
    "ack-mode": "on-confirm",
    "prefetch-count": 100,
    "reconnect-delay": 5
}

create_shovel(
    host="localhost",
    vhost="/",
    name="migrate-orders",
    config=shovel_config,
    user="admin",
    password="password"
)
```

### Node.js API Client

```javascript
const axios = require('axios');

async function createShovel(host, vhost, name, config, user, password) {
    const vhostEncoded = encodeURIComponent(vhost);
    const url = `http://${host}:15672/api/parameters/shovel/${vhostEncoded}/${name}`;

    try {
        const response = await axios.put(url, { value: config }, {
            auth: { username: user, password: password }
        });

        console.log(`Shovel '${name}' created successfully`);
        return response;
    } catch (error) {
        console.error(`Failed to create shovel: ${error.message}`);
        throw error;
    }
}

// Configuration
const shovelConfig = {
    'src-protocol': 'amqp091',
    'src-uri': 'amqp://user:pass@source:5672',
    'src-queue': 'source_queue',
    'dest-protocol': 'amqp091',
    'dest-uri': 'amqp://user:pass@dest:5672',
    'dest-exchange': 'dest_exchange',
    'dest-routing-key': 'migrated',
    'ack-mode': 'on-confirm',
    'prefetch-count': 100
};

createShovel('localhost', '/', 'my-shovel', shovelConfig, 'admin', 'password');
```

## Shovel Acknowledgment Modes

Choose the right ack mode based on your reliability requirements:

### on-confirm (Recommended)

Messages are acknowledged at the source only after the destination confirms receipt:

```python
config = {
    # ... other config
    "ack-mode": "on-confirm"
}
```

- **Reliability**: At-least-once delivery guaranteed
- **Performance**: Slower due to confirmation wait
- **Use when**: Message loss is unacceptable

### on-publish

Messages are acknowledged after publishing to destination (before confirm):

```python
config = {
    "ack-mode": "on-publish"
}
```

- **Reliability**: Messages can be lost if destination fails before confirming
- **Performance**: Faster than on-confirm
- **Use when**: Some message loss is acceptable

### no-ack

Messages are acknowledged immediately when received from source:

```python
config = {
    "ack-mode": "no-ack"
}
```

- **Reliability**: Messages can be lost
- **Performance**: Fastest
- **Use when**: Speed is critical, loss is acceptable

## Advanced Shovel Patterns

### Pattern 1: Queue Migration with Transformation

Move messages while modifying the routing key:

```python
shovel_config = {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@old-broker:5672",
    "src-queue": "legacy_orders",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@new-broker:5672",
    "dest-exchange": "orders_v2",
    "dest-routing-key": "order.migrated.legacy",
    "add-forward-headers": True,  # Add x-shovelled header
    "ack-mode": "on-confirm"
}
```

### Pattern 2: Multi-Source Aggregation

Create multiple shovels to aggregate messages:

```python
sources = [
    ("us-east", "amqp://user:pass@us-east-rabbit:5672"),
    ("us-west", "amqp://user:pass@us-west-rabbit:5672"),
    ("eu-west", "amqp://user:pass@eu-west-rabbit:5672")
]

for region, uri in sources:
    config = {
        "src-protocol": "amqp091",
        "src-uri": uri,
        "src-queue": "events",
        "dest-protocol": "amqp091",
        "dest-uri": "amqp://user:pass@central-rabbit:5672",
        "dest-exchange": "aggregated_events",
        "dest-routing-key": f"event.{region}",
        "add-forward-headers": True,
        "ack-mode": "on-confirm"
    }

    create_shovel(
        host="localhost",
        vhost="/",
        name=f"aggregate-{region}",
        config=config,
        user="admin",
        password="password"
    )
```

### Pattern 3: One-Time Data Migration

For batch migration, use a shovel that stops when the queue is empty:

```python
migration_config = {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@old-broker:5672",
    "src-queue": "data_to_migrate",
    "src-delete-after": "queue-length",  # Stop when queue emptied
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@new-broker:5672",
    "dest-queue": "migrated_data",
    "ack-mode": "on-confirm",
    "prefetch-count": 1000
}
```

### Pattern 4: Cross-Virtual Host Routing

Move messages between vhosts on the same broker:

```python
config = {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@localhost:5672/source_vhost",
    "src-queue": "internal_events",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@localhost:5672/dest_vhost",
    "dest-exchange": "external_events",
    "ack-mode": "on-confirm"
}
```

## Monitoring Shovels

### Check Shovel Status

```bash
# List all shovels and their status
rabbitmqctl shovel_status

# Output shows:
# Name           Type       Status   Source               Destination
# migrate-orders dynamic    running  amqp://source:5672   amqp://dest:5672
```

### Management API Status Check

```python
def get_shovel_status(host, user, password):
    """Get status of all shovels"""
    url = f"http://{host}:15672/api/shovels"

    response = requests.get(
        url,
        auth=HTTPBasicAuth(user, password)
    )

    shovels = response.json()

    for shovel in shovels:
        name = shovel.get('name', 'unknown')
        state = shovel.get('state', 'unknown')
        src = shovel.get('src_uri', 'unknown')
        dest = shovel.get('dest_uri', 'unknown')

        status_icon = 'OK' if state == 'running' else 'ERROR'
        print(f"[{status_icon}] {name}: {state}")
        print(f"    Source: {src}")
        print(f"    Dest: {dest}")

        if state != 'running':
            print(f"    Reason: {shovel.get('reason', 'unknown')}")

get_shovel_status('localhost', 'admin', 'password')
```

### Alerting on Shovel Failures

```python
def monitor_shovels(host, user, password, alert_callback):
    """Monitor shovels and alert on failures"""
    url = f"http://{host}:15672/api/shovels"

    response = requests.get(url, auth=HTTPBasicAuth(user, password))
    shovels = response.json()

    for shovel in shovels:
        if shovel.get('state') != 'running':
            alert_callback(
                f"Shovel '{shovel['name']}' is in state '{shovel['state']}': "
                f"{shovel.get('reason', 'No reason provided')}"
            )

def send_alert(message):
    print(f"ALERT: {message}")
    # Send to Slack, PagerDuty, etc.

# Run monitoring
monitor_shovels('localhost', 'admin', 'password', send_alert)
```

## Troubleshooting

### Shovel Not Starting

Check connectivity and credentials:

```bash
# Test source connection
rabbitmqctl eval 'net_adm:ping('"'"'rabbit@source-broker'"'"').'

# Check shovel logs
grep -i shovel /var/log/rabbitmq/rabbit@*.log
```

### Messages Not Moving

Verify queue exists and has messages:

```bash
# Check source queue
rabbitmqctl list_queues -p / name messages | grep source_queue

# Check shovel state
rabbitmqctl shovel_status
```

### Performance Issues

Increase prefetch count for higher throughput:

```python
config = {
    # ... other config
    "prefetch-count": 1000,  # Increase from default
}
```

## Best Practices

1. **Use on-confirm mode**: Prevents message loss during failures
2. **Set appropriate prefetch**: Higher values improve throughput
3. **Monitor shovel status**: Alert when shovels stop running
4. **Use TLS for cross-DC**: Encrypt data in transit
5. **Document shovel topology**: Keep track of message flows
6. **Test failover**: Verify shovels reconnect after broker restarts
7. **Use meaningful names**: Name shovels by their purpose

## Conclusion

RabbitMQ Shovel provides reliable, configurable message routing between any AMQP endpoints. Whether you are migrating data, aggregating from multiple sources, or bridging environments, Shovel handles the complexity of reliable message transfer. Configure it dynamically for flexibility or statically for simpler deployments, and always use on-confirm mode when message loss is not acceptable.
