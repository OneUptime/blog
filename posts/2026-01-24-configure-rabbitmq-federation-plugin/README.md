# How to Configure RabbitMQ Federation Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Federation, Distributed Systems, Message Queue, High Availability

Description: A complete guide to setting up RabbitMQ federation for cross-datacenter message routing and replication.

---

The RabbitMQ Federation plugin enables message routing between brokers across different geographical locations or administrative domains. Unlike clustering, federation works over unreliable WAN links and does not require full mesh connectivity. This guide covers federation configuration for both exchanges and queues, along with best practices for production deployments.

## Understanding Federation

Federation creates a loose coupling between RabbitMQ brokers, allowing messages to flow from upstream to downstream brokers.

```mermaid
flowchart LR
    subgraph DC1["Data Center 1 (Upstream)"]
        E1[Exchange: orders]
        Q1[Queue: local_orders]
        E1 --> Q1
    end

    subgraph DC2["Data Center 2 (Downstream)"]
        E2[Federated Exchange: orders]
        Q2[Queue: local_orders]
        E2 --> Q2
    end

    subgraph DC3["Data Center 3 (Downstream)"]
        E3[Federated Exchange: orders]
        Q3[Queue: local_orders]
        E3 --> Q3
    end

    E1 -.->|Federation Link| E2
    E1 -.->|Federation Link| E3

    P[Publisher] --> E1
    C1[Consumer] --> Q1
    C2[Consumer] --> Q2
    C3[Consumer] --> Q3
```

### Federation vs Clustering vs Shovel

| Feature | Federation | Clustering | Shovel |
|---------|-----------|------------|--------|
| Network | WAN-tolerant | LAN only | WAN-tolerant |
| Coupling | Loose | Tight | Point-to-point |
| Data Sharing | Selected exchanges/queues | All data | Specific queues |
| Admin Domains | Multiple | Single | Multiple |
| Use Case | Geo-distribution | HA within DC | Data migration |

## Prerequisites

Before configuring federation:

1. RabbitMQ 3.8+ installed on all brokers
2. Network connectivity between brokers (AMQP port 5672 or 5671 for TLS)
3. User accounts with appropriate permissions on each broker

## Enabling the Federation Plugin

Enable the federation plugin on all participating brokers.

```bash
# Enable federation plugin
rabbitmq-plugins enable rabbitmq_federation

# Enable management interface for federation (recommended)
rabbitmq-plugins enable rabbitmq_federation_management

# Verify plugins are enabled
rabbitmq-plugins list | grep federation
```

Expected output:
```
[E*] rabbitmq_federation               3.12.0
[E*] rabbitmq_federation_management    3.12.0
```

## Exchange Federation

Exchange federation replicates messages published to an upstream exchange to downstream exchanges with the same name.

### Architecture

```mermaid
flowchart TD
    subgraph Upstream["Upstream Broker"]
        UE[Exchange: events]
        UQ1[Queue: analytics]
        UQ2[Queue: logging]
        UE --> UQ1
        UE --> UQ2
    end

    subgraph Downstream["Downstream Broker"]
        DE[Federated Exchange: events]
        DQ1[Queue: local_processing]
        DQ2[Queue: archive]
        DE --> DQ1
        DE --> DQ2

        FL[Federation Link]
    end

    UE -.-> FL
    FL --> DE

    P1[Publisher] --> UE
    P2[Local Publisher] --> DE
```

### Step 1: Create Upstream Definition

On the downstream broker, define the upstream connection.

```bash
# Using rabbitmqctl
rabbitmqctl set_parameter federation-upstream dc1-upstream '{
  "uri": "amqp://federation_user:password@dc1-rabbitmq.example.com:5672",
  "expires": 3600000,
  "message-ttl": 86400000,
  "ack-mode": "on-confirm",
  "trust-user-id": false
}'

# List upstream definitions
rabbitmqctl list_parameters -p / | grep federation-upstream
```

### Step 2: Create Federation Policy

Create a policy that enables federation for specific exchanges.

```bash
# Federate all exchanges starting with "events"
rabbitmqctl set_policy federation-events "^events" \
  '{"federation-upstream-set": "all"}' \
  --apply-to exchanges

# Or federate specific exchanges using a pattern
rabbitmqctl set_policy federation-orders "^orders\." \
  '{"federation-upstream": "dc1-upstream"}' \
  --apply-to exchanges

# List policies
rabbitmqctl list_policies
```

### Step 3: Using the Management API

```bash
# Create upstream via HTTP API
curl -u admin:password -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/parameters/federation-upstream/%2f/dc1-upstream \
  -d '{
    "value": {
      "uri": "amqp://federation_user:password@dc1-rabbitmq.example.com:5672",
      "expires": 3600000,
      "ack-mode": "on-confirm"
    }
  }'

# Create policy via HTTP API
curl -u admin:password -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/policies/%2f/federation-events \
  -d '{
    "pattern": "^events",
    "definition": {
      "federation-upstream-set": "all"
    },
    "apply-to": "exchanges"
  }'
```

### Upstream Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `uri` | AMQP URI for upstream broker | Required |
| `expires` | Time before unused federation link closes (ms) | None |
| `message-ttl` | TTL for messages in transit (ms) | None |
| `ack-mode` | When to ack upstream messages | `on-confirm` |
| `prefetch-count` | Number of unacked messages | 1000 |
| `reconnect-delay` | Delay between reconnection attempts (s) | 5 |
| `trust-user-id` | Trust upstream user-id header | false |

## Queue Federation

Queue federation allows a downstream queue to receive messages from an upstream queue when local consumers are available.

```mermaid
flowchart TD
    subgraph Upstream["Upstream Broker (DC1)"]
        UQ[Queue: shared_work]
        UC[Local Consumer]
        UQ --> UC
    end

    subgraph Downstream["Downstream Broker (DC2)"]
        DQ[Federated Queue: shared_work]
        DC[Local Consumer]
        DQ --> DC

        FL[Federation Link]
    end

    UQ -.->|Messages pulled when DC has consumers| FL
    FL --> DQ

    P[Publisher] --> UQ
```

### Configuring Queue Federation

```bash
# Create upstream definition (same as exchange federation)
rabbitmqctl set_parameter federation-upstream dc1-upstream '{
  "uri": "amqp://federation_user:password@dc1-rabbitmq.example.com:5672",
  "ack-mode": "on-confirm"
}'

# Create policy for queue federation
rabbitmqctl set_policy federation-work-queues "^work\." \
  '{"federation-upstream-set": "all"}' \
  --apply-to queues
```

### Queue Federation Behavior

Queue federation pulls messages from upstream only when:
1. Local consumers are connected to the downstream queue
2. The upstream queue has messages available
3. Local consumers have available prefetch capacity

This enables work distribution across datacenters while maintaining message locality.

## Multi-Datacenter Federation

For complex multi-datacenter deployments, configure upstream sets.

```mermaid
flowchart TD
    subgraph Primary["Primary DC (US-East)"]
        PE[Exchange: orders]
    end

    subgraph Secondary["Secondary DC (US-West)"]
        SE[Federated Exchange: orders]
        S_UP[Upstream: US-East]
    end

    subgraph Tertiary["Tertiary DC (EU)"]
        TE[Federated Exchange: orders]
        T_UP[Upstream: US-East, US-West]
    end

    PE -.-> S_UP
    S_UP --> SE

    PE -.-> T_UP
    SE -.-> T_UP
    T_UP --> TE
```

### Creating Upstream Sets

```bash
# On EU datacenter broker - define multiple upstreams
rabbitmqctl set_parameter federation-upstream us-east-upstream '{
  "uri": "amqp://federation:pass@us-east-rabbitmq.example.com:5672"
}'

rabbitmqctl set_parameter federation-upstream us-west-upstream '{
  "uri": "amqp://federation:pass@us-west-rabbitmq.example.com:5672"
}'

# Create an upstream set combining both
rabbitmqctl set_parameter federation-upstream-set all-regions '[
  {"upstream": "us-east-upstream"},
  {"upstream": "us-west-upstream"}
]'

# Apply policy using the upstream set
rabbitmqctl set_policy federation-global "^global\." \
  '{"federation-upstream-set": "all-regions"}' \
  --apply-to exchanges
```

## TLS Configuration

For production deployments, secure federation links with TLS.

```bash
# Create upstream with TLS
rabbitmqctl set_parameter federation-upstream secure-upstream '{
  "uri": "amqps://federation:password@remote-rabbitmq.example.com:5671?cacertfile=/path/to/ca.pem&certfile=/path/to/client-cert.pem&keyfile=/path/to/client-key.pem&verify=verify_peer&server_name_indication=remote-rabbitmq.example.com"
}'
```

Or using the management API:

```bash
curl -u admin:password -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/parameters/federation-upstream/%2f/secure-upstream \
  -d '{
    "value": {
      "uri": "amqps://federation:password@remote-rabbitmq.example.com:5671",
      "tls": {
        "cacertfile": "/path/to/ca.pem",
        "certfile": "/path/to/client-cert.pem",
        "keyfile": "/path/to/client-key.pem",
        "verify": "verify_peer",
        "server_name_indication": "remote-rabbitmq.example.com"
      }
    }
  }'
```

## Monitoring Federation Status

### Using rabbitmqctl

```bash
# List federation links and their status
rabbitmqctl federation_status

# Sample output:
# Node         | Exchange/Queue | Upstream    | Status  | Local Connection | URI
# rabbit@node1 | orders         | dc1-upstream | running | <pid>           | amqp://...
```

### Using Management API

```bash
# Get federation link status
curl -u admin:password http://localhost:15672/api/federation-links | jq '.'

# Sample response
[
  {
    "node": "rabbit@downstream",
    "exchange": "orders",
    "upstream": "dc1-upstream",
    "type": "exchange",
    "vhost": "/",
    "status": "running",
    "local_connection": "<pid>",
    "uri": "amqp://dc1-rabbitmq.example.com:5672",
    "timestamp": "2024-01-15 10:30:00"
  }
]
```

### Prometheus Metrics

```yaml
# Key federation metrics
- rabbitmq_federation_links_count
- rabbitmq_federation_link_status{upstream="dc1-upstream",status="running"}
- rabbitmq_federation_messages_transferred_total
```

### Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: rabbitmq_federation
    rules:
      - alert: RabbitMQFederationLinkDown
        expr: rabbitmq_federation_link_status{status!="running"} == 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Federation link {{ $labels.upstream }} is down"
          description: "Link status: {{ $labels.status }}"

      - alert: RabbitMQFederationLinkMissing
        expr: absent(rabbitmq_federation_links_count)
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "No federation links detected"
```

## Troubleshooting Federation

### Common Issues

#### 1. Authentication Failures

```bash
# Check credentials on upstream
rabbitmqctl authenticate_user federation_user password

# Verify user permissions
rabbitmqctl list_user_permissions federation_user

# Grant necessary permissions
rabbitmqctl set_permissions -p / federation_user ".*" ".*" ".*"
```

#### 2. Network Connectivity

```bash
# Test connectivity from downstream to upstream
nc -zv dc1-rabbitmq.example.com 5672

# Check if federation can connect
rabbitmqctl eval 'net_adm:ping('\''rabbit@dc1-rabbitmq'\'').'

# Verify firewall rules
iptables -L -n | grep 5672
```

#### 3. Exchange/Queue Not Federating

```bash
# Verify policy matches the exchange/queue
rabbitmqctl list_policies

# Check if federation-upstream-set "all" includes your upstream
rabbitmqctl list_parameters | grep federation

# Ensure exchange exists on upstream
rabbitmqadmin -H dc1-rabbitmq.example.com list exchanges name
```

#### 4. Message Not Flowing

```mermaid
flowchart TD
    A[Messages Not Flowing] --> B{Link Status?}
    B -->|Not Running| C[Check Network/Auth]
    B -->|Running| D{Exchange Exists Upstream?}
    D -->|No| E[Create Exchange]
    D -->|Yes| F{Bindings Match?}
    F -->|No| G[Check Routing Keys]
    F -->|Yes| H{Messages Published?}
    H -->|No| I[Check Publisher]
    H -->|Yes| J[Check Consumer]
```

```bash
# Check link details
rabbitmqctl federation_status | grep -A 5 "exchange_name"

# Verify upstream exchange has messages
rabbitmqadmin -H dc1-rabbitmq.example.com list queues name messages
```

## Best Practices

### 1. Use Dedicated Federation Users

```bash
# On upstream broker
rabbitmqctl add_user federation_user strong_password
rabbitmqctl set_permissions -p / federation_user "^federation\\..*" ".*" ".*"
rabbitmqctl set_user_tags federation_user monitoring
```

### 2. Configure Appropriate Timeouts

```bash
# Set reasonable expires and reconnect-delay
rabbitmqctl set_parameter federation-upstream production-upstream '{
  "uri": "amqp://federation:pass@upstream:5672",
  "expires": 3600000,
  "reconnect-delay": 10,
  "ack-mode": "on-confirm",
  "prefetch-count": 500
}'
```

### 3. Use Exchange Federation for Pub/Sub

Exchange federation is ideal for:
- Event broadcasting across regions
- Log aggregation
- Notification distribution

### 4. Use Queue Federation for Work Distribution

Queue federation is ideal for:
- Distributing work across datacenters
- Providing locality for consumers
- Load balancing across regions

### 5. Implement Circuit Breaker Pattern

```python
# Application-level circuit breaker for federation failover
import pika
from circuitbreaker import circuit

class FederatedPublisher:
    def __init__(self, primary_host, fallback_host):
        self.primary_host = primary_host
        self.fallback_host = fallback_host

    @circuit(failure_threshold=5, recovery_timeout=30)
    def publish_primary(self, message):
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(self.primary_host)
        )
        channel = connection.channel()
        channel.basic_publish(
            exchange='orders',
            routing_key='new',
            body=message,
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()

    def publish(self, message):
        try:
            self.publish_primary(message)
        except Exception:
            # Fallback to local broker
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(self.fallback_host)
            )
            channel = connection.channel()
            channel.basic_publish(
                exchange='orders',
                routing_key='new',
                body=message,
                properties=pika.BasicProperties(delivery_mode=2)
            )
            connection.close()
```

## Summary

RabbitMQ federation enables robust cross-datacenter messaging with:

1. **Exchange Federation** - Replicate messages to multiple downstream brokers
2. **Queue Federation** - Distribute work across datacenters with local consumers
3. **Upstream Sets** - Configure multiple upstream sources for redundancy
4. **TLS Security** - Encrypt federation traffic over WAN links

Key configuration steps:
1. Enable the federation plugin on all brokers
2. Create upstream definitions pointing to source brokers
3. Create policies to enable federation for specific exchanges/queues
4. Monitor link status and set up alerting

Federation provides a flexible and WAN-tolerant solution for distributed messaging architectures while maintaining the independence of each broker instance.
