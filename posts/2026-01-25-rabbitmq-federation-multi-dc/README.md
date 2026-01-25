# How to Configure Federation for Multi-DC in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Federation, Multi-Datacenter, Distributed Systems, High Availability, Message Queues

Description: A practical guide to configuring RabbitMQ federation for multi-datacenter deployments, enabling message routing across geographically distributed clusters.

---

Running RabbitMQ in multiple data centers presents a challenge: how do you share messages between clusters separated by potentially unreliable network links? RabbitMQ Federation solves this by allowing loose coupling between brokers, replicating messages across data centers without requiring a single tightly-coupled cluster.

## Federation vs Clustering

Before diving in, understand when to use each approach:

| Feature | Clustering | Federation |
|---------|-----------|------------|
| Network | Low latency, reliable | High latency, unreliable OK |
| Topology | Single logical broker | Independent brokers |
| Consistency | Strong | Eventual |
| Use case | HA within DC | Cross-DC replication |

```mermaid
flowchart TB
    subgraph DC1["Data Center 1 (US-East)"]
        C1[RabbitMQ Cluster]
        P1[Producer] --> C1
    end

    subgraph DC2["Data Center 2 (EU-West)"]
        C2[RabbitMQ Cluster]
        C2 --> Consumer2[Consumer]
    end

    C1 -->|"Federation Link<br/>(messages replicated)"| C2
```

## How Federation Works

Federation creates a one-way link from an upstream broker to a downstream broker. Messages published to the upstream are forwarded to the downstream based on configured policies.

Key concepts:
- **Upstream**: The source broker that has the messages
- **Downstream**: The broker that receives federated messages
- **Federation Exchange**: Downstream exchange that pulls messages from upstream
- **Federation Queue**: Downstream queue that mirrors an upstream queue

## Prerequisites

Enable the federation plugin on all nodes that will participate:

```bash
# Enable federation plugin
rabbitmq-plugins enable rabbitmq_federation

# Enable management UI extension (optional but helpful)
rabbitmq-plugins enable rabbitmq_federation_management

# Restart RabbitMQ to apply
systemctl restart rabbitmq-server
```

## Configuring Federation Upstreams

First, define the upstream brokers that the downstream will connect to.

### Using rabbitmqctl

```bash
# On the downstream broker (EU-West), define the upstream (US-East)
rabbitmqctl set_parameter federation-upstream us-east \
  '{"uri":"amqp://federation_user:password@us-east-rabbitmq.example.com:5672","expires":3600000}'
```

### Using the Management API

```bash
# Define upstream via HTTP API
curl -u admin:password -X PUT \
  http://eu-west-rabbitmq:15672/api/parameters/federation-upstream/%2f/us-east \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "uri": "amqp://federation_user:password@us-east-rabbitmq.example.com:5672",
      "expires": 3600000,
      "message-ttl": 86400000,
      "ack-mode": "on-confirm",
      "trust-user-id": false
    }
  }'
```

### Using Python for Configuration

```python
import requests
from requests.auth import HTTPBasicAuth

def configure_upstream(downstream_host, admin_user, admin_pass,
                       upstream_name, upstream_uri, vhost='/'):
    """Configure a federation upstream"""

    # URL encode the vhost (/ becomes %2f)
    vhost_encoded = vhost.replace('/', '%2f')

    url = f"http://{downstream_host}:15672/api/parameters/federation-upstream/{vhost_encoded}/{upstream_name}"

    config = {
        "value": {
            "uri": upstream_uri,
            "expires": 3600000,        # Link expiry in ms (1 hour)
            "message-ttl": 86400000,   # Message TTL in ms (24 hours)
            "ack-mode": "on-confirm",  # Acknowledge after upstream confirms
            "reconnect-delay": 5       # Seconds before reconnect attempt
        }
    }

    response = requests.put(
        url,
        json=config,
        auth=HTTPBasicAuth(admin_user, admin_pass)
    )

    if response.status_code in [201, 204]:
        print(f"Upstream '{upstream_name}' configured successfully")
    else:
        print(f"Failed to configure upstream: {response.text}")

# Configure upstream
configure_upstream(
    downstream_host='eu-west-rabbitmq.example.com',
    admin_user='admin',
    admin_pass='password',
    upstream_name='us-east',
    upstream_uri='amqp://federation_user:pass@us-east-rabbitmq.example.com:5672'
)
```

## Configuring Federation Policies

Policies determine which exchanges or queues participate in federation.

### Federate All Exchanges

```bash
# Federate all exchanges matching pattern ".*" (all exchanges)
rabbitmqctl set_policy federate-all ".*" \
  '{"federation-upstream-set":"all"}' \
  --apply-to exchanges
```

### Federate Specific Exchanges

```bash
# Federate only exchanges starting with "events."
rabbitmqctl set_policy federate-events "^events\\..*" \
  '{"federation-upstream":"us-east"}' \
  --apply-to exchanges
```

### Federate Queues

```bash
# Federate queues matching pattern
rabbitmqctl set_policy federate-orders "^orders\\." \
  '{"federation-upstream":"us-east"}' \
  --apply-to queues
```

### Python Policy Configuration

```python
def set_federation_policy(host, admin_user, admin_pass,
                          policy_name, pattern, upstream_name,
                          apply_to='exchanges', vhost='/'):
    """Set a federation policy"""

    vhost_encoded = vhost.replace('/', '%2f')
    url = f"http://{host}:15672/api/policies/{vhost_encoded}/{policy_name}"

    policy = {
        "pattern": pattern,
        "definition": {
            "federation-upstream": upstream_name
        },
        "apply-to": apply_to,
        "priority": 0
    }

    response = requests.put(
        url,
        json=policy,
        auth=HTTPBasicAuth(admin_user, admin_pass)
    )

    if response.status_code in [201, 204]:
        print(f"Policy '{policy_name}' created successfully")
    else:
        print(f"Failed to create policy: {response.text}")

# Federate all exchanges named "events.*"
set_federation_policy(
    host='eu-west-rabbitmq.example.com',
    admin_user='admin',
    admin_pass='password',
    policy_name='federate-events',
    pattern='^events\\..*',
    upstream_name='us-east',
    apply_to='exchanges'
)
```

## Multi-Datacenter Topology Patterns

### Pattern 1: Hub and Spoke

One central broker federates to multiple regional brokers.

```mermaid
flowchart TB
    subgraph Central["Central DC (Hub)"]
        HUB[RabbitMQ Hub]
    end

    subgraph US["US Region"]
        US1[RabbitMQ US]
    end

    subgraph EU["EU Region"]
        EU1[RabbitMQ EU]
    end

    subgraph ASIA["Asia Region"]
        ASIA1[RabbitMQ Asia]
    end

    HUB -->|"federate"| US1
    HUB -->|"federate"| EU1
    HUB -->|"federate"| ASIA1
```

Configuration on each spoke:

```bash
# On US broker
rabbitmqctl set_parameter federation-upstream central \
  '{"uri":"amqp://fed:pass@central-rabbitmq:5672"}'

rabbitmqctl set_policy federate-all ".*" \
  '{"federation-upstream":"central"}' --apply-to exchanges
```

### Pattern 2: Bidirectional Federation

Two data centers federate to each other for active-active setup.

```bash
# On DC1: Configure DC2 as upstream
rabbitmqctl set_parameter federation-upstream dc2 \
  '{"uri":"amqp://fed:pass@dc2-rabbitmq:5672"}'

# On DC2: Configure DC1 as upstream
rabbitmqctl set_parameter federation-upstream dc1 \
  '{"uri":"amqp://fed:pass@dc1-rabbitmq:5672"}'

# Apply policy on both
rabbitmqctl set_policy federate-events "^events\\." \
  '{"federation-upstream-set":"all"}' --apply-to exchanges
```

### Pattern 3: Mesh Federation

Every broker federates with every other broker.

```python
datacenters = [
    {'name': 'us-east', 'uri': 'amqp://fed:pass@us-east-rmq:5672'},
    {'name': 'us-west', 'uri': 'amqp://fed:pass@us-west-rmq:5672'},
    {'name': 'eu-west', 'uri': 'amqp://fed:pass@eu-west-rmq:5672'},
    {'name': 'ap-south', 'uri': 'amqp://fed:pass@ap-south-rmq:5672'}
]

def configure_mesh_federation(local_dc, all_dcs):
    """Configure federation to all other DCs"""
    for dc in all_dcs:
        if dc['name'] != local_dc:
            configure_upstream(
                downstream_host=f"{local_dc}-rmq.example.com",
                admin_user='admin',
                admin_pass='password',
                upstream_name=dc['name'],
                upstream_uri=dc['uri']
            )

    # Create upstream set including all remotes
    remote_names = [dc['name'] for dc in all_dcs if dc['name'] != local_dc]
    # Set policy for all upstreams
```

## Authentication for Federation Links

Create dedicated users for federation with limited permissions:

```bash
# On upstream broker
rabbitmqctl add_user federation_user secure_password
rabbitmqctl set_permissions -p / federation_user "^$" "^$" ".*"
# Read-only access: can't configure, can't write, can read all

# If using TLS
rabbitmqctl set_parameter federation-upstream remote-dc \
  '{"uri":"amqps://federation_user:pass@remote:5671","trust-user-id":false}'
```

## Monitoring Federation Links

Check federation status:

```bash
# List federation links
rabbitmqctl list_federation_links

# Output shows status of each link:
# upstream | exchange | status | local_connection | uri
```

Using the Management API:

```python
def check_federation_status(host, admin_user, admin_pass):
    """Check status of all federation links"""
    url = f"http://{host}:15672/api/federation-links"

    response = requests.get(
        url,
        auth=HTTPBasicAuth(admin_user, admin_pass)
    )

    links = response.json()

    for link in links:
        status = link.get('status', 'unknown')
        upstream = link.get('upstream', 'unknown')
        exchange = link.get('exchange', 'unknown')

        status_icon = 'OK' if status == 'running' else 'ERROR'
        print(f"[{status_icon}] {upstream} -> {exchange}: {status}")

        if status != 'running':
            print(f"  Error: {link.get('error', 'No error details')}")

check_federation_status('eu-west-rabbitmq', 'admin', 'password')
```

## Handling Network Partitions

Federation handles network issues gracefully:

```python
upstream_config = {
    "value": {
        "uri": "amqp://fed:pass@remote:5672",
        "reconnect-delay": 5,      # Wait 5s before reconnecting
        "expires": 3600000,        # Link expires after 1 hour idle
        "ack-mode": "on-confirm",  # Wait for confirms before ack
        "max-hops": 1              # Prevent message loops
    }
}
```

The `max-hops` parameter prevents infinite loops in bidirectional setups:

```bash
# With max-hops=1, a message will only cross one federation link
# This prevents: DC1 -> DC2 -> DC1 -> DC2 -> ...
```

## Performance Tuning

### Prefetch Settings

Control how many messages are in flight:

```python
upstream_config = {
    "value": {
        "uri": "amqp://fed:pass@remote:5672",
        "prefetch-count": 1000,  # Messages to prefetch (default 1000)
    }
}
```

### Link Throughput

Monitor and adjust based on throughput:

```bash
# Check message rates via API
curl -u admin:password \
  http://localhost:15672/api/federation-links | jq '.[].messages_unconfirmed'
```

### Multiple Upstreams for Scaling

Define multiple upstream URIs for parallel links:

```python
upstream_config = {
    "value": {
        "uri": [
            "amqp://fed:pass@node1:5672",
            "amqp://fed:pass@node2:5672",
            "amqp://fed:pass@node3:5672"
        ]
    }
}
```

## Troubleshooting

### Link Not Establishing

Check connectivity and credentials:

```bash
# Test connectivity from downstream to upstream
nc -zv us-east-rabbitmq.example.com 5672

# Verify credentials work
rabbitmqctl authenticate_user federation_user password
```

### Messages Not Flowing

Verify the policy is applied:

```bash
# Check policies
rabbitmqctl list_policies

# Verify exchange has federation enabled
rabbitmqctl list_exchanges name policy | grep events
```

### High Latency

Check message backlog on federation link:

```bash
curl -u admin:pass http://localhost:15672/api/federation-links | \
  jq '.[] | {upstream: .upstream, unconfirmed: .messages_unconfirmed}'
```

## Best Practices

1. **Use dedicated federation users**: Limit permissions to read-only
2. **Enable TLS**: Encrypt federation traffic between data centers
3. **Set max-hops**: Prevent message loops in bidirectional setups
4. **Monitor link status**: Alert when links go down
5. **Test failover**: Verify messages queue when upstream is unavailable
6. **Document topology**: Keep a diagram of your federation setup

## Conclusion

RabbitMQ Federation enables reliable message distribution across data centers without requiring low-latency network connections. Configure upstreams carefully, use policies to control what gets federated, and monitor your links. When done right, federation provides the geographic distribution your application needs while maintaining the independence of each regional broker.
