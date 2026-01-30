# How to Create RabbitMQ Shovel Dynamic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Shovel, Message Routing, Federation

Description: Learn to implement RabbitMQ dynamic shovels for runtime message routing with API management, source/destination configuration, and monitoring.

---

Message routing between RabbitMQ nodes, clusters, or virtual hosts is a common requirement in distributed systems. While static shovels configured in configuration files work for simple scenarios, dynamic shovels give you runtime control - create, modify, and delete shovels without restarting RabbitMQ. This guide covers everything you need to implement and manage dynamic shovels effectively.

## Table of Contents

1. What is a RabbitMQ Shovel?
2. Static vs Dynamic Shovels
3. Prerequisites
4. Creating Dynamic Shovels via Management API
5. Source and Destination Configuration
6. Advanced Shovel Parameters
7. Monitoring Shovels
8. Deleting and Managing Shovels
9. Common Use Cases
10. Troubleshooting
11. Best Practices

---

## 1. What is a RabbitMQ Shovel?

A shovel is a RabbitMQ plugin that continuously moves messages from a source (queue or exchange) to a destination (queue or exchange). Think of it as a reliable message pump that works across:

- Different virtual hosts on the same node
- Different RabbitMQ nodes
- Different RabbitMQ clusters
- Different data centers

```mermaid
flowchart LR
    subgraph Source["Source Cluster"]
        SQ[Queue: orders]
    end

    subgraph Shovel["Shovel"]
        S[Message Pump]
    end

    subgraph Dest["Destination Cluster"]
        DQ[Queue: orders-backup]
    end

    SQ --> S
    S --> DQ
```

| Feature | Description |
|---------|-------------|
| **Reliability** | Automatically reconnects on failure |
| **Acknowledgment** | Confirms message delivery before removing from source |
| **Cross-cluster** | Works across network boundaries |
| **Protocol** | Uses AMQP 0-9-1 or AMQP 1.0 |

---

## 2. Static vs Dynamic Shovels

| Aspect | Static Shovel | Dynamic Shovel |
|--------|---------------|----------------|
| **Configuration** | `rabbitmq.conf` file | Management API or CLI |
| **Requires restart** | Yes | No |
| **Runtime changes** | Not possible | Full CRUD support |
| **Storage** | Configuration file | RabbitMQ internal database |
| **Use case** | Permanent, unchanging routes | Flexible, programmable routing |

Dynamic shovels are stored in RabbitMQ's internal database and survive node restarts. They are the preferred choice for:

- Multi-tenant systems where routing changes per customer
- Disaster recovery scenarios with failover logic
- Microservices that need runtime message rerouting
- CI/CD pipelines that provision temporary routes

---

## 3. Prerequisites

### Enable the Shovel Plugin

```bash
# Enable the shovel plugin
rabbitmq-plugins enable rabbitmq_shovel

# Enable the management UI for shovels (optional but recommended)
rabbitmq-plugins enable rabbitmq_shovel_management
```

Verify the plugins are enabled:

```bash
rabbitmq-plugins list | grep shovel
```

Expected output:

```
[E*] rabbitmq_shovel                   3.12.0
[E*] rabbitmq_shovel_management        3.12.0
```

### Required Permissions

The user creating shovels needs:

- `administrator` tag for management API access
- Read permissions on the source vhost
- Write permissions on the destination vhost

```bash
# Grant administrator tag
rabbitmqctl set_user_tags myuser administrator

# Set permissions on source vhost
rabbitmqctl set_permissions -p source_vhost myuser ".*" ".*" ".*"

# Set permissions on destination vhost
rabbitmqctl set_permissions -p dest_vhost myuser ".*" ".*" ".*"
```

---

## 4. Creating Dynamic Shovels via Management API

### Basic Shovel Creation

Use the HTTP API to create a dynamic shovel:

```bash
curl -u admin:password -X PUT \
  http://localhost:15672/api/parameters/shovel/%2f/my-shovel \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "src-protocol": "amqp091",
      "src-uri": "amqp://localhost",
      "src-queue": "source-queue",
      "dest-protocol": "amqp091",
      "dest-uri": "amqp://localhost",
      "dest-queue": "destination-queue"
    }
  }'
```

Note: `%2f` is the URL-encoded form of `/` (the default virtual host).

### Shovel Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as Management API
    participant RMQ as RabbitMQ Node
    participant DB as Internal Database

    Client->>API: PUT /api/parameters/shovel/{vhost}/{name}
    API->>RMQ: Validate configuration
    RMQ->>DB: Store shovel definition
    DB-->>RMQ: Confirmation
    RMQ->>RMQ: Start shovel process
    RMQ-->>API: 201 Created
    API-->>Client: Success response
```

### Using Node.js

```javascript
const axios = require('axios');

async function createShovel(shovelName, config) {
  const baseUrl = 'http://localhost:15672/api';
  const vhost = encodeURIComponent('/');

  const shovelConfig = {
    value: {
      'src-protocol': 'amqp091',
      'src-uri': config.sourceUri,
      'src-queue': config.sourceQueue,
      'dest-protocol': 'amqp091',
      'dest-uri': config.destUri,
      'dest-queue': config.destQueue,
      'ack-mode': config.ackMode || 'on-confirm',
      'prefetch-count': config.prefetchCount || 1000
    }
  };

  try {
    const response = await axios.put(
      `${baseUrl}/parameters/shovel/${vhost}/${shovelName}`,
      shovelConfig,
      {
        auth: {
          username: 'admin',
          password: 'password'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Shovel "${shovelName}" created successfully`);
    return response.data;
  } catch (error) {
    console.error('Failed to create shovel:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
createShovel('orders-backup-shovel', {
  sourceUri: 'amqp://user:pass@source-host:5672',
  sourceQueue: 'orders',
  destUri: 'amqp://user:pass@backup-host:5672',
  destQueue: 'orders-backup',
  ackMode: 'on-confirm',
  prefetchCount: 500
});
```

### Using Python

```python
import requests
from urllib.parse import quote

def create_shovel(shovel_name: str, config: dict) -> dict:
    """Create a dynamic RabbitMQ shovel."""
    base_url = "http://localhost:15672/api"
    vhost = quote("/", safe="")

    shovel_config = {
        "value": {
            "src-protocol": "amqp091",
            "src-uri": config["source_uri"],
            "src-queue": config["source_queue"],
            "dest-protocol": "amqp091",
            "dest-uri": config["dest_uri"],
            "dest-queue": config["dest_queue"],
            "ack-mode": config.get("ack_mode", "on-confirm"),
            "prefetch-count": config.get("prefetch_count", 1000)
        }
    }

    response = requests.put(
        f"{base_url}/parameters/shovel/{vhost}/{shovel_name}",
        json=shovel_config,
        auth=("admin", "password"),
        headers={"Content-Type": "application/json"}
    )

    response.raise_for_status()
    print(f"Shovel '{shovel_name}' created successfully")
    return response.json() if response.text else {}


# Usage
create_shovel("orders-backup-shovel", {
    "source_uri": "amqp://user:pass@source-host:5672",
    "source_queue": "orders",
    "dest_uri": "amqp://user:pass@backup-host:5672",
    "dest_queue": "orders-backup",
    "ack_mode": "on-confirm",
    "prefetch_count": 500
})
```

### Using RabbitMQ CLI

```bash
# Create a shovel using rabbitmqctl
rabbitmqctl set_parameter shovel my-shovel \
  '{"src-protocol": "amqp091",
    "src-uri": "amqp://localhost",
    "src-queue": "source-queue",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://localhost",
    "dest-queue": "destination-queue"}'
```

---

## 5. Source and Destination Configuration

### Queue to Queue

The simplest configuration - move messages from one queue to another:

```json
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@source-host:5672/source-vhost",
    "src-queue": "orders",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@dest-host:5672/dest-vhost",
    "dest-queue": "orders-replica"
  }
}
```

```mermaid
flowchart LR
    subgraph Source["Source VHost"]
        SQ[orders queue]
    end

    subgraph Shovel
        S((Shovel))
    end

    subgraph Dest["Destination VHost"]
        DQ[orders-replica queue]
    end

    SQ -->|consume| S
    S -->|publish| DQ
```

### Exchange to Queue

Consume from an exchange (with routing key binding) and publish to a queue:

```json
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://localhost",
    "src-exchange": "events",
    "src-exchange-key": "order.created",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://localhost",
    "dest-queue": "order-notifications"
  }
}
```

### Queue to Exchange

Consume from a queue and republish to an exchange:

```json
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://localhost",
    "src-queue": "outbound-events",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://remote-host",
    "dest-exchange": "incoming-events",
    "dest-exchange-key": "external.event"
  }
}
```

### Exchange to Exchange

Full exchange-to-exchange routing:

```json
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://localhost",
    "src-exchange": "local-events",
    "src-exchange-key": "#",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://remote-host",
    "dest-exchange": "replicated-events"
  }
}
```

```mermaid
flowchart LR
    subgraph Local["Local Cluster"]
        LE[local-events exchange]
        TQ[temp queue]
    end

    subgraph Shovel
        S((Shovel))
    end

    subgraph Remote["Remote Cluster"]
        RE[replicated-events exchange]
    end

    LE -->|bind with #| TQ
    TQ -->|consume| S
    S -->|publish| RE
```

---

## 6. Advanced Shovel Parameters

### Acknowledgment Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `on-confirm` | Ack after destination confirms | Production - ensures no message loss |
| `on-publish` | Ack after publishing (no confirm wait) | Higher throughput, slight risk |
| `no-ack` | No acknowledgment | Testing only - messages can be lost |

```json
{
  "value": {
    "src-uri": "amqp://localhost",
    "src-queue": "high-volume-queue",
    "dest-uri": "amqp://remote-host",
    "dest-queue": "backup-queue",
    "ack-mode": "on-confirm"
  }
}
```

### Prefetch Count

Control how many messages the shovel fetches before acknowledgment:

```json
{
  "value": {
    "src-uri": "amqp://localhost",
    "src-queue": "source",
    "dest-uri": "amqp://localhost",
    "dest-queue": "dest",
    "prefetch-count": 500
  }
}
```

Higher values increase throughput but use more memory. Start with 500-1000 and tune based on message size.

### Reconnect Delay

Configure retry behavior on connection failures:

```json
{
  "value": {
    "src-uri": "amqp://localhost",
    "src-queue": "source",
    "dest-uri": "amqp://remote-host",
    "dest-queue": "dest",
    "reconnect-delay": 5
  }
}
```

The shovel waits 5 seconds before attempting reconnection.

### Message Properties

Preserve or modify message properties during transfer:

```json
{
  "value": {
    "src-uri": "amqp://localhost",
    "src-queue": "source",
    "dest-uri": "amqp://localhost",
    "dest-queue": "dest",
    "dest-add-forward-headers": true,
    "dest-add-timestamp-header": true
  }
}
```

This adds headers showing the shovel path and transfer timestamp.

### Complete Configuration Example

```json
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://user:pass@source-cluster:5672/orders-vhost",
    "src-queue": "orders",
    "src-prefetch-count": 500,
    "src-delete-after": "never",

    "dest-protocol": "amqp091",
    "dest-uri": "amqp://user:pass@backup-cluster:5672/orders-vhost",
    "dest-queue": "orders-backup",
    "dest-add-forward-headers": true,
    "dest-add-timestamp-header": true,

    "ack-mode": "on-confirm",
    "reconnect-delay": 5
  }
}
```

---

## 7. Monitoring Shovels

### List All Shovels

```bash
# Via CLI
rabbitmqctl list_shovels

# Via API
curl -u admin:password http://localhost:15672/api/shovels
```

### Get Shovel Status

```bash
curl -u admin:password http://localhost:15672/api/shovels/%2f/my-shovel
```

Response:

```json
{
  "name": "my-shovel",
  "vhost": "/",
  "type": "dynamic",
  "state": "running",
  "src_uri": "amqp://localhost",
  "src_queue": "source-queue",
  "dest_uri": "amqp://remote-host",
  "dest_queue": "dest-queue"
}
```

### Shovel States

```mermaid
stateDiagram-v2
    [*] --> starting: Shovel created
    starting --> running: Connection established
    running --> running: Messages transferred
    running --> terminated: Connection lost
    terminated --> starting: Reconnect attempt
    starting --> terminated: Connection failed
```

| State | Description | Action |
|-------|-------------|--------|
| `starting` | Establishing connections | Wait |
| `running` | Actively transferring messages | Normal operation |
| `terminated` | Connection lost, will retry | Check network/credentials |

### Monitoring Script

```javascript
const axios = require('axios');

async function monitorShovels() {
  const baseUrl = 'http://localhost:15672/api';

  try {
    const response = await axios.get(`${baseUrl}/shovels`, {
      auth: { username: 'admin', password: 'password' }
    });

    const shovels = response.data;

    console.log('Shovel Status Report');
    console.log('====================');

    for (const shovel of shovels) {
      const status = shovel.state === 'running' ? 'OK' : 'ALERT';
      console.log(`[${status}] ${shovel.name}: ${shovel.state}`);

      if (shovel.state !== 'running') {
        console.log(`  - Source: ${shovel.src_uri}`);
        console.log(`  - Destination: ${shovel.dest_uri}`);
        console.log(`  - Reason: ${shovel.reason || 'Unknown'}`);
      }
    }

    // Return unhealthy shovels for alerting
    return shovels.filter(s => s.state !== 'running');
  } catch (error) {
    console.error('Failed to fetch shovel status:', error.message);
    throw error;
  }
}

// Run monitoring
monitorShovels().then(unhealthy => {
  if (unhealthy.length > 0) {
    console.log(`\nWarning: ${unhealthy.length} shovel(s) not running!`);
    process.exit(1);
  }
});
```

### Prometheus Metrics

RabbitMQ exposes shovel metrics via the Prometheus plugin:

```yaml
# Example Prometheus alert rule
groups:
  - name: rabbitmq_shovel_alerts
    rules:
      - alert: ShovelNotRunning
        expr: rabbitmq_shovel_state != 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ shovel {{ $labels.shovel }} is not running"
          description: "Shovel has been in non-running state for 5 minutes"
```

---

## 8. Deleting and Managing Shovels

### Delete a Shovel

```bash
# Via API
curl -u admin:password -X DELETE \
  http://localhost:15672/api/parameters/shovel/%2f/my-shovel

# Via CLI
rabbitmqctl clear_parameter shovel my-shovel
```

### Update a Shovel

To update, simply PUT with the same name and new configuration:

```bash
curl -u admin:password -X PUT \
  http://localhost:15672/api/parameters/shovel/%2f/my-shovel \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://localhost",
      "src-queue": "source-queue",
      "dest-uri": "amqp://new-destination-host",
      "dest-queue": "new-destination-queue",
      "prefetch-count": 1000
    }
  }'
```

### Batch Management

```python
import requests
from urllib.parse import quote

class ShovelManager:
    def __init__(self, host: str, username: str, password: str):
        self.base_url = f"http://{host}:15672/api"
        self.auth = (username, password)

    def list_shovels(self, vhost: str = "/") -> list:
        """List all shovels in a vhost."""
        vhost_encoded = quote(vhost, safe="")
        response = requests.get(
            f"{self.base_url}/parameters/shovel/{vhost_encoded}",
            auth=self.auth
        )
        response.raise_for_status()
        return response.json()

    def create_shovel(self, name: str, config: dict, vhost: str = "/") -> None:
        """Create or update a shovel."""
        vhost_encoded = quote(vhost, safe="")
        response = requests.put(
            f"{self.base_url}/parameters/shovel/{vhost_encoded}/{name}",
            json={"value": config},
            auth=self.auth
        )
        response.raise_for_status()

    def delete_shovel(self, name: str, vhost: str = "/") -> None:
        """Delete a shovel."""
        vhost_encoded = quote(vhost, safe="")
        response = requests.delete(
            f"{self.base_url}/parameters/shovel/{vhost_encoded}/{name}",
            auth=self.auth
        )
        response.raise_for_status()

    def delete_all_shovels(self, vhost: str = "/") -> int:
        """Delete all shovels in a vhost. Returns count deleted."""
        shovels = self.list_shovels(vhost)
        for shovel in shovels:
            self.delete_shovel(shovel["name"], vhost)
        return len(shovels)


# Usage
manager = ShovelManager("localhost", "admin", "password")

# List existing shovels
shovels = manager.list_shovels()
print(f"Found {len(shovels)} shovels")

# Create multiple shovels
regions = ["us-east", "us-west", "eu-central"]
for region in regions:
    manager.create_shovel(
        f"replicate-to-{region}",
        {
            "src-uri": "amqp://localhost",
            "src-queue": "events",
            "dest-uri": f"amqp://{region}.rabbitmq.internal",
            "dest-queue": "events",
            "ack-mode": "on-confirm"
        }
    )

# Clean up
deleted = manager.delete_all_shovels()
print(f"Deleted {deleted} shovels")
```

---

## 9. Common Use Cases

### Data Center Replication

```mermaid
flowchart TB
    subgraph DC1["Data Center 1 - Primary"]
        P1[Producer]
        Q1[orders queue]
        P1 --> Q1
    end

    subgraph Shovel1["Shovel"]
        S1((DC1 to DC2))
    end

    subgraph DC2["Data Center 2 - DR"]
        Q2[orders queue]
        C2[Consumer]
        Q2 --> C2
    end

    Q1 --> S1
    S1 --> Q2
```

Configuration:

```json
{
  "value": {
    "src-uri": "amqp://user:pass@dc1-rabbitmq:5672",
    "src-queue": "orders",
    "dest-uri": "amqp://user:pass@dc2-rabbitmq:5672",
    "dest-queue": "orders",
    "ack-mode": "on-confirm",
    "reconnect-delay": 1
  }
}
```

### Multi-Tenant Message Isolation

Route messages from a shared queue to tenant-specific queues:

```javascript
async function setupTenantShovel(tenantId, tenantConfig) {
  const shovelConfig = {
    'src-uri': 'amqp://localhost',
    'src-exchange': 'tenant-events',
    'src-exchange-key': `tenant.${tenantId}.#`,
    'dest-uri': tenantConfig.rabbitmqUri,
    'dest-queue': 'events',
    'ack-mode': 'on-confirm'
  };

  await createShovel(`tenant-${tenantId}-shovel`, shovelConfig);
}

// When a new tenant signs up
setupTenantShovel('acme-corp', {
  rabbitmqUri: 'amqp://user:pass@acme.dedicated.rabbitmq:5672'
});
```

### Migration Between Clusters

Gradually migrate traffic from old to new cluster:

```mermaid
flowchart LR
    subgraph Old["Old Cluster"]
        OQ[orders queue]
    end

    subgraph Shovel
        S((Migration Shovel))
    end

    subgraph New["New Cluster"]
        NQ[orders queue]
        NC[New Consumers]
        NQ --> NC
    end

    OQ --> S
    S --> NQ
```

### Event Aggregation

Collect events from multiple services into a central analytics queue:

```python
services = [
    {"name": "auth-service", "host": "auth.internal", "queue": "auth-events"},
    {"name": "order-service", "host": "orders.internal", "queue": "order-events"},
    {"name": "payment-service", "host": "payments.internal", "queue": "payment-events"},
]

for service in services:
    manager.create_shovel(
        f"aggregate-{service['name']}",
        {
            "src-uri": f"amqp://user:pass@{service['host']}:5672",
            "src-queue": service["queue"],
            "dest-uri": "amqp://user:pass@analytics.internal:5672",
            "dest-exchange": "all-events",
            "dest-exchange-key": f"service.{service['name']}",
            "ack-mode": "on-confirm"
        }
    )
```

---

## 10. Troubleshooting

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Authentication failure | State: `terminated`, reason mentions credentials | Verify username/password in URI |
| Network unreachable | State: `terminated`, connection refused | Check firewall rules, DNS resolution |
| Queue not found | State: `terminated`, NOT_FOUND error | Ensure source queue exists before creating shovel |
| Permission denied | State: `terminated`, ACCESS_REFUSED | Grant proper permissions to shovel user |

### Debug Checklist

1. **Verify plugin is enabled**
   ```bash
   rabbitmq-plugins list | grep shovel
   ```

2. **Check shovel status**
   ```bash
   rabbitmqctl list_shovels
   ```

3. **Review logs**
   ```bash
   tail -f /var/log/rabbitmq/rabbit@hostname.log | grep -i shovel
   ```

4. **Test connectivity**
   ```bash
   # From the RabbitMQ node
   curl -v telnet://remote-host:5672
   ```

5. **Verify queue exists**
   ```bash
   rabbitmqctl list_queues -p /vhost name
   ```

### Connection String Format

```
amqp://username:password@hostname:port/vhost
```

Special characters in password must be URL-encoded:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `#` | `%23` |

Example with special password `p@ss:word`:

```
amqp://user:p%40ss%3Aword@hostname:5672/vhost
```

---

## 11. Best Practices

### Security

- Use dedicated credentials for shovels with minimal required permissions
- Enable TLS for cross-datacenter shovels
- Rotate credentials periodically
- Never expose management API to public internet

```json
{
  "value": {
    "src-uri": "amqps://shovel-user:pass@source:5671?cacertfile=/path/to/ca.pem",
    "src-queue": "secure-queue",
    "dest-uri": "amqps://shovel-user:pass@dest:5671?cacertfile=/path/to/ca.pem",
    "dest-queue": "secure-queue"
  }
}
```

### Performance

- Set appropriate `prefetch-count` based on message size (larger messages = lower count)
- Use `on-confirm` ack mode for reliability
- Monitor shovel lag and throughput
- Consider multiple shovels for high-volume queues

### Reliability

- Always use `on-confirm` acknowledgment mode in production
- Set reasonable `reconnect-delay` (1-5 seconds)
- Monitor shovel state and alert on `terminated` status
- Test failover scenarios regularly

### Naming Conventions

Use descriptive names that indicate:
- Direction (e.g., `dc1-to-dc2`)
- Purpose (e.g., `orders-backup`)
- Environment (e.g., `prod-audit-replication`)

Example: `prod-orders-dc1-to-dc2-backup`

---

## Summary

| Task | Method |
|------|--------|
| **Create shovel** | PUT to `/api/parameters/shovel/{vhost}/{name}` |
| **List shovels** | GET `/api/shovels` or `rabbitmqctl list_shovels` |
| **Delete shovel** | DELETE `/api/parameters/shovel/{vhost}/{name}` |
| **Monitor state** | GET `/api/shovels/{vhost}/{name}` - check `state` field |

Dynamic shovels give you runtime control over message routing without service restarts. Use them for cross-cluster replication, disaster recovery, multi-tenant isolation, and migration scenarios. Always monitor shovel state and use `on-confirm` acknowledgment mode to prevent message loss.

---

**Related Reading:**

- [RabbitMQ Federation Plugin](https://www.rabbitmq.com/federation.html) - For bidirectional exchange replication
- [RabbitMQ Clustering Guide](https://www.rabbitmq.com/clustering.html) - For high availability within a single site
- [Message Queuing Best Practices](https://oneuptime.com/blog) - General messaging architecture patterns
