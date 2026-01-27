# How to Build RabbitMQ Shovel for Message Transfer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Message Queue, Shovel, Federation, Distributed Systems, DevOps, Messaging, Cross-Cluster

Description: A comprehensive guide to building RabbitMQ Shovel for reliable message transfer between brokers. Learn static and dynamic shovel configuration, cross-cluster transfers, monitoring, and when to choose Shovel over Federation.

---

> The RabbitMQ Shovel plugin is the reliable workhorse for moving messages between brokers. While Federation is about replicating topology, **Shovel is about moving data** - think of it as a dedicated pipeline that consumes from one place and publishes to another.

RabbitMQ Shovel provides a robust mechanism for transferring messages between queues, exchanges, or even entirely different RabbitMQ clusters. Whether you are migrating workloads, building disaster recovery solutions, or connecting geographically distributed systems, Shovel offers fine-grained control over message movement.

This guide walks through everything from basic setup to advanced configurations, with production-ready examples you can adapt for your infrastructure.

---

## Table of Contents

1. What is RabbitMQ Shovel
2. Shovel Architecture
3. Enabling the Shovel Plugin
4. Static Shovel Configuration
5. Dynamic Shovel Configuration
6. Cross-Cluster Message Transfer
7. Shovel Monitoring and Management
8. Federation vs Shovel Comparison
9. Best Practices
10. Troubleshooting Common Issues

---

## 1. What is RabbitMQ Shovel

RabbitMQ Shovel is a plugin that continuously moves messages from a source (queue or exchange) to a destination (queue or exchange). It acts as an AMQP client on both ends, consuming messages from one location and publishing them to another.

Key characteristics:

| Feature | Description |
|---------|-------------|
| Unidirectional | Messages flow in one direction only |
| Decoupled | Source and destination can be on different clusters |
| Reliable | Uses acknowledgments to prevent message loss |
| Flexible | Can transform messages during transfer |
| Resilient | Automatically reconnects on failure |

Common use cases:

- **Data center migration**: Move messages from old to new infrastructure
- **Geographic distribution**: Transfer messages between regional clusters
- **Workload isolation**: Separate production and analytics processing
- **Disaster recovery**: Replicate critical messages to backup clusters
- **Protocol bridging**: Connect AMQP 0.9.1 and AMQP 1.0 endpoints

---

## 2. Shovel Architecture

Understanding how Shovel works internally helps with configuration and troubleshooting.

```mermaid
flowchart LR
    subgraph SourceBroker["Source Broker"]
        SQ[Source Queue]
        SE[Source Exchange]
    end

    subgraph ShovelProcess["Shovel Process"]
        C[Consumer]
        P[Publisher]
        C --> P
    end

    subgraph DestBroker["Destination Broker"]
        DQ[Destination Queue]
        DE[Destination Exchange]
    end

    SQ --> C
    SE --> C
    P --> DQ
    P --> DE

    style ShovelProcess fill:#e1f5fe
```

The Shovel process consists of two AMQP clients:

1. **Consumer**: Connects to the source broker and consumes messages
2. **Publisher**: Connects to the destination broker and publishes messages

Message flow:

```mermaid
sequenceDiagram
    participant SB as Source Broker
    participant S as Shovel
    participant DB as Destination Broker

    S->>SB: Connect & Subscribe
    SB-->>S: Deliver Message
    S->>DB: Publish Message
    DB-->>S: Publish Confirm
    S->>SB: Acknowledge Message

    Note over S: Message safely transferred
```

This acknowledgment flow ensures at-least-once delivery semantics.

---

## 3. Enabling the Shovel Plugin

Before configuring shovels, enable the required plugins on all nodes.

```bash
# Enable the shovel plugin (required)
rabbitmq-plugins enable rabbitmq_shovel

# Enable the management UI extension (recommended for visibility)
rabbitmq-plugins enable rabbitmq_shovel_management

# Verify plugins are enabled
rabbitmq-plugins list | grep shovel
```

Expected output:

```
[E*] rabbitmq_shovel               3.12.0
[E*] rabbitmq_shovel_management    3.12.0
```

For Docker deployments, add to your Dockerfile:

```dockerfile
# Dockerfile for RabbitMQ with Shovel
FROM rabbitmq:3.12-management

# Enable shovel plugins
RUN rabbitmq-plugins enable --offline rabbitmq_shovel rabbitmq_shovel_management
```

For Kubernetes with the RabbitMQ Cluster Operator:

```yaml
# rabbitmq-cluster.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
spec:
  replicas: 3
  rabbitmq:
    # Enable shovel plugins via additional config
    additionalPlugins:
      - rabbitmq_shovel
      - rabbitmq_shovel_management
```

---

## 4. Static Shovel Configuration

Static shovels are defined in the RabbitMQ configuration file and start automatically when the broker boots. Use static shovels for permanent, infrastructure-level message routing.

### Basic Static Shovel

Create or edit the advanced configuration file (`/etc/rabbitmq/advanced.config` or `rabbitmq.conf`):

```erlang
%% advanced.config - Basic static shovel example
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Shovel name: orders_to_analytics
      {orders_to_analytics, [
        %% Source configuration
        {source, [
          %% Connect to local broker
          {uris, ["amqp://guest:guest@localhost:5672"]},
          %% Consume from this queue
          {queue, <<"orders.completed">>},
          %% Prefetch count for performance tuning
          {prefetch_count, 100}
        ]},

        %% Destination configuration
        {destination, [
          %% Remote analytics cluster
          {uris, ["amqp://shovel_user:secure_pass@analytics.example.com:5672"]},
          %% Publish to this exchange with routing key
          {publish_properties, [
            {exchange, <<"analytics.ingest">>},
            {routing_key, <<"orders">>}
          ]}
        ]},

        %% Acknowledgment mode: on-confirm ensures no message loss
        {ack_mode, on_confirm},

        %% Reconnect delay on failure (milliseconds)
        {reconnect_delay, 5000}
      ]}
    ]}
  ]}
].
```

### Static Shovel with Message Transformation

Transform messages during transfer using publish properties:

```erlang
%% advanced.config - Shovel with header injection
[
  {rabbitmq_shovel, [
    {shovels, [
      {enriched_events, [
        {source, [
          {uris, ["amqp://localhost"]},
          {queue, <<"raw.events">>}
        ]},
        {destination, [
          {uris, ["amqp://processing.example.com"]},
          {publish_properties, [
            {exchange, <<"enriched.events">>},
            {routing_key, <<"from_source">>}
          ]},
          %% Add custom headers to transferred messages
          {add_forward_headers, true},
          {add_timestamp_header, true}
        ]},
        {ack_mode, on_confirm}
      ]}
    ]}
  ]}
].
```

### Modern rabbitmq.conf Format

For RabbitMQ 3.7+, use the new-style configuration:

```ini
# rabbitmq.conf - Static shovel in modern format

# Define the shovel
shovel.orders_replication.source.uris.1 = amqp://localhost
shovel.orders_replication.source.queue = orders.pending
shovel.orders_replication.source.prefetch-count = 250

shovel.orders_replication.destination.uris.1 = amqp://backup.example.com
shovel.orders_replication.destination.exchange = orders.replicated
shovel.orders_replication.destination.routing-key = backup

shovel.orders_replication.ack-mode = on-confirm
shovel.orders_replication.reconnect-delay = 5
```

---

## 5. Dynamic Shovel Configuration

Dynamic shovels are created at runtime via the management API or CLI. They are stored in RabbitMQ's internal database and survive broker restarts. Use dynamic shovels for operational flexibility and when shovels need to be created programmatically.

### Creating Dynamic Shovels via CLI

```bash
# Create a dynamic shovel using rabbitmqctl
rabbitmqctl set_parameter shovel my-dynamic-shovel '{
  "src-uri": "amqp://localhost",
  "src-queue": "source.queue",
  "dest-uri": "amqp://remote.example.com",
  "dest-exchange": "destination.exchange",
  "dest-exchange-key": "routed",
  "ack-mode": "on-confirm",
  "prefetch-count": 100
}'

# List all dynamic shovels
rabbitmqctl list_parameters -p / --formatter=json | jq '.[] | select(.component=="shovel")'

# Delete a dynamic shovel
rabbitmqctl clear_parameter shovel my-dynamic-shovel
```

### Creating Dynamic Shovels via HTTP API

```bash
# Create shovel using the management HTTP API
curl -u admin:password -X PUT \
  "http://localhost:15672/api/parameters/shovel/%2F/api-created-shovel" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://localhost",
      "src-queue": "api.source",
      "dest-uri": "amqp://destination.example.com",
      "dest-exchange": "api.destination",
      "ack-mode": "on-confirm",
      "prefetch-count": 200,
      "reconnect-delay": 5
    }
  }'

# Get shovel status
curl -u admin:password \
  "http://localhost:15672/api/shovels/%2F/api-created-shovel"
```

### Dynamic Shovel with Node.js

```typescript
// shovel-manager.ts
// Programmatically manage RabbitMQ shovels via the HTTP API

import axios, { AxiosInstance } from 'axios';

interface ShovelConfig {
  name: string;
  sourceUri: string;
  sourceQueue: string;
  destUri: string;
  destExchange: string;
  destRoutingKey?: string;
  ackMode?: 'on-confirm' | 'on-publish' | 'no-ack';
  prefetchCount?: number;
  reconnectDelay?: number;
}

class RabbitMQShovelManager {
  private client: AxiosInstance;
  private vhost: string;

  constructor(
    managementUrl: string,
    username: string,
    password: string,
    vhost: string = '/'
  ) {
    this.vhost = encodeURIComponent(vhost);
    this.client = axios.create({
      baseURL: managementUrl,
      auth: { username, password },
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create or update a shovel
  async createShovel(config: ShovelConfig): Promise<void> {
    const payload = {
      value: {
        'src-uri': config.sourceUri,
        'src-queue': config.sourceQueue,
        'dest-uri': config.destUri,
        'dest-exchange': config.destExchange,
        'dest-exchange-key': config.destRoutingKey || '',
        'ack-mode': config.ackMode || 'on-confirm',
        'prefetch-count': config.prefetchCount || 100,
        'reconnect-delay': config.reconnectDelay || 5
      }
    };

    await this.client.put(
      `/api/parameters/shovel/${this.vhost}/${config.name}`,
      payload
    );
    console.log(`Shovel '${config.name}' created successfully`);
  }

  // Get shovel status
  async getShovelStatus(name: string): Promise<any> {
    const response = await this.client.get(
      `/api/shovels/${this.vhost}/${name}`
    );
    return response.data;
  }

  // List all shovels
  async listShovels(): Promise<any[]> {
    const response = await this.client.get(`/api/shovels/${this.vhost}`);
    return response.data;
  }

  // Delete a shovel
  async deleteShovel(name: string): Promise<void> {
    await this.client.delete(
      `/api/parameters/shovel/${this.vhost}/${name}`
    );
    console.log(`Shovel '${name}' deleted successfully`);
  }

  // Restart a shovel (delete and recreate)
  async restartShovel(config: ShovelConfig): Promise<void> {
    try {
      await this.deleteShovel(config.name);
    } catch (e) {
      // Shovel might not exist
    }
    await this.createShovel(config);
  }
}

// Usage example
async function main() {
  const manager = new RabbitMQShovelManager(
    'http://localhost:15672',
    'admin',
    'password'
  );

  // Create a shovel for order processing
  await manager.createShovel({
    name: 'orders-to-warehouse',
    sourceUri: 'amqp://orders.example.com',
    sourceQueue: 'orders.confirmed',
    destUri: 'amqp://warehouse.example.com',
    destExchange: 'warehouse.inbound',
    destRoutingKey: 'new-order',
    ackMode: 'on-confirm',
    prefetchCount: 250
  });

  // Check status
  const status = await manager.getShovelStatus('orders-to-warehouse');
  console.log('Shovel status:', status.state);
}

main().catch(console.error);
```

---

## 6. Cross-Cluster Message Transfer

Shovel excels at moving messages between geographically distributed or isolated RabbitMQ clusters.

### Architecture for Cross-Cluster Transfer

```mermaid
flowchart TB
    subgraph DC1["Data Center 1 (Primary)"]
        P1[Producer Apps]
        RMQ1[RabbitMQ Cluster]
        P1 --> RMQ1
    end

    subgraph DC2["Data Center 2 (DR/Analytics)"]
        RMQ2[RabbitMQ Cluster]
        C2[Consumer Apps]
        RMQ2 --> C2
    end

    subgraph Shovel["Shovel Configuration"]
        S1[Shovel Process]
    end

    RMQ1 --> S1
    S1 --> RMQ2

    style Shovel fill:#fff3e0
```

### Secure Cross-Cluster Configuration

```erlang
%% advanced.config - Cross-cluster shovel with TLS
[
  {rabbitmq_shovel, [
    {shovels, [
      {cross_dc_replication, [
        {source, [
          %% Multiple URIs for high availability
          {uris, [
            "amqps://shovel:password@rmq1.dc1.example.com:5671",
            "amqps://shovel:password@rmq2.dc1.example.com:5671",
            "amqps://shovel:password@rmq3.dc1.example.com:5671"
          ]},
          {queue, <<"critical.events">>},
          {prefetch_count, 500},
          %% Declare queue if it doesn't exist
          {declarations, [
            {'queue.declare', [
              {queue, <<"critical.events">>},
              {durable, true}
            ]}
          ]}
        ]},
        {destination, [
          %% Destination cluster URIs
          {uris, [
            "amqps://shovel:password@rmq1.dc2.example.com:5671",
            "amqps://shovel:password@rmq2.dc2.example.com:5671"
          ]},
          {publish_properties, [
            {exchange, <<"replicated.events">>},
            {routing_key, <<"from_dc1">>},
            {delivery_mode, 2}  %% Persistent
          ]},
          %% Declare exchange if needed
          {declarations, [
            {'exchange.declare', [
              {exchange, <<"replicated.events">>},
              {type, <<"topic">>},
              {durable, true}
            ]}
          ]}
        ]},
        {ack_mode, on_confirm},
        {reconnect_delay, 10000}
      ]}
    ]}
  ]},

  %% TLS configuration for shovel connections
  {ssl, [
    {versions, ['tlsv1.3', 'tlsv1.2']}
  ]}
].
```

### Bidirectional Replication

For active-active setups, configure shovels in both directions:

```mermaid
flowchart LR
    subgraph DC1["Data Center 1"]
        Q1A[queue.dc1.local]
        Q1B[queue.dc1.replicated]
    end

    subgraph DC2["Data Center 2"]
        Q2A[queue.dc2.local]
        Q2B[queue.dc2.replicated]
    end

    Q1A -->|"Shovel: dc1-to-dc2"| Q2B
    Q2A -->|"Shovel: dc2-to-dc1"| Q1B
```

```erlang
%% advanced.config - Bidirectional replication (DC1 config)
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Outbound: DC1 -> DC2
      {dc1_to_dc2, [
        {source, [
          {uris, ["amqp://localhost"]},
          {queue, <<"orders.dc1.local">>}
        ]},
        {destination, [
          {uris, ["amqp://dc2.example.com"]},
          {publish_properties, [
            {exchange, <<"">>},
            {routing_key, <<"orders.dc1.replicated">>}
          ]}
        ]},
        {ack_mode, on_confirm}
      ]},

      %% Inbound: Receive from DC2 (configured on DC2, shown here for reference)
      %% DC2 would have a matching dc2_to_dc1 shovel
    ]}
  ]}
].
```

### Handling Network Partitions

```typescript
// resilient-shovel.ts
// Monitor and recreate shovels after network issues

import { RabbitMQShovelManager, ShovelConfig } from './shovel-manager';

interface ShovelHealth {
  name: string;
  state: 'running' | 'starting' | 'terminated';
  lastError?: string;
}

class ResilientShovelManager {
  private manager: RabbitMQShovelManager;
  private shovels: Map<string, ShovelConfig> = new Map();
  private checkInterval: NodeJS.Timer | null = null;

  constructor(manager: RabbitMQShovelManager) {
    this.manager = manager;
  }

  // Register a shovel for monitoring
  registerShovel(config: ShovelConfig): void {
    this.shovels.set(config.name, config);
  }

  // Start health monitoring
  startMonitoring(intervalMs: number = 30000): void {
    this.checkInterval = setInterval(async () => {
      await this.checkAndRepairShovels();
    }, intervalMs);

    console.log(`Shovel monitoring started (interval: ${intervalMs}ms)`);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check all registered shovels and repair if needed
  private async checkAndRepairShovels(): Promise<void> {
    for (const [name, config] of this.shovels) {
      try {
        const status = await this.manager.getShovelStatus(name);

        if (status.state === 'terminated') {
          console.warn(`Shovel '${name}' terminated: ${status.reason}`);
          console.log(`Attempting to restart shovel '${name}'...`);

          await this.manager.restartShovel(config);
          console.log(`Shovel '${name}' restarted successfully`);
        } else if (status.state === 'running') {
          // Log throughput metrics
          console.log(`Shovel '${name}': ${status.state}, ` +
            `messages transferred: ${status.message_count || 0}`);
        }
      } catch (error: any) {
        // Shovel might not exist, create it
        if (error.response?.status === 404) {
          console.log(`Shovel '${name}' not found, creating...`);
          await this.manager.createShovel(config);
        } else {
          console.error(`Error checking shovel '${name}':`, error.message);
        }
      }
    }
  }
}

// Usage
async function setupResilientShovels() {
  const manager = new RabbitMQShovelManager(
    'http://localhost:15672',
    'admin',
    'password'
  );

  const resilient = new ResilientShovelManager(manager);

  // Register shovels for monitoring
  resilient.registerShovel({
    name: 'critical-events-replication',
    sourceUri: 'amqp://primary.example.com',
    sourceQueue: 'critical.events',
    destUri: 'amqp://backup.example.com',
    destExchange: 'replicated.events',
    ackMode: 'on-confirm',
    prefetchCount: 100
  });

  // Start monitoring with 30-second interval
  resilient.startMonitoring(30000);

  // Handle shutdown gracefully
  process.on('SIGTERM', () => {
    resilient.stopMonitoring();
    process.exit(0);
  });
}
```

---

## 7. Shovel Monitoring and Management

Effective monitoring ensures shovels operate reliably and helps catch issues early.

### Management UI

Access the Shovel status page in the RabbitMQ Management UI:

```
http://localhost:15672/#/shovels
```

The UI shows:
- Shovel name and virtual host
- Current state (running, starting, terminated)
- Source and destination details
- Message transfer statistics

### CLI Monitoring Commands

```bash
# List all shovel statuses
rabbitmqctl shovel_status

# Output example:
# Shovel Status
# name: orders_to_analytics
# type: static
# state: running
# source_uri: amqp://localhost
# destination_uri: amqp://analytics.example.com

# Get detailed status as JSON
rabbitmqctl shovel_status --formatter=json | jq .

# Check if shovel plugin is running
rabbitmq-diagnostics check_running

# View shovel-related logs
journalctl -u rabbitmq-server | grep -i shovel
```

### Prometheus Metrics

RabbitMQ exposes shovel metrics for Prometheus:

```yaml
# prometheus.yml - scrape config
scrape_configs:
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
    metrics_path: /metrics
```

Key metrics to monitor:

| Metric | Description |
|--------|-------------|
| `rabbitmq_shovel_state` | Current shovel state (1=running, 0=not running) |
| `rabbitmq_shovel_messages_published_total` | Total messages transferred |
| `rabbitmq_shovel_messages_confirmed_total` | Messages confirmed by destination |
| `rabbitmq_shovel_connection_status` | Connection health to source/dest |

### Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: rabbitmq-shovel-alerts
    rules:
      # Alert when shovel stops running
      - alert: RabbitMQShovelDown
        expr: rabbitmq_shovel_state == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ Shovel {{ $labels.shovel }} is down"
          description: "Shovel has been in non-running state for more than 2 minutes"

      # Alert on message transfer lag
      - alert: RabbitMQShovelLag
        expr: |
          rate(rabbitmq_shovel_messages_published_total[5m]) == 0
          and rabbitmq_shovel_state == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ Shovel {{ $labels.shovel }} has no throughput"
          description: "Shovel is running but no messages transferred in 5 minutes"
```

### Custom Monitoring Script

```python
#!/usr/bin/env python3
# monitor_shovels.py
# Monitor RabbitMQ shovels and send alerts

import requests
import json
import sys
from datetime import datetime

class ShovelMonitor:
    def __init__(self, host: str, user: str, password: str):
        self.base_url = f"http://{host}:15672/api"
        self.auth = (user, password)

    def get_shovel_status(self) -> list:
        """Fetch status of all shovels"""
        response = requests.get(
            f"{self.base_url}/shovels",
            auth=self.auth
        )
        response.raise_for_status()
        return response.json()

    def check_health(self) -> dict:
        """Check health of all shovels"""
        shovels = self.get_shovel_status()
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'healthy': [],
            'unhealthy': [],
            'summary': {'total': len(shovels), 'running': 0, 'failed': 0}
        }

        for shovel in shovels:
            name = shovel['name']
            state = shovel.get('state', 'unknown')

            if state == 'running':
                results['healthy'].append({
                    'name': name,
                    'state': state,
                    'source': shovel.get('src_uri', 'N/A'),
                    'destination': shovel.get('dest_uri', 'N/A')
                })
                results['summary']['running'] += 1
            else:
                results['unhealthy'].append({
                    'name': name,
                    'state': state,
                    'reason': shovel.get('reason', 'Unknown'),
                    'source': shovel.get('src_uri', 'N/A'),
                    'destination': shovel.get('dest_uri', 'N/A')
                })
                results['summary']['failed'] += 1

        return results

def main():
    monitor = ShovelMonitor(
        host='localhost',
        user='admin',
        password='password'
    )

    health = monitor.check_health()

    # Output JSON for integration with monitoring systems
    print(json.dumps(health, indent=2))

    # Exit with error code if any shovels are unhealthy
    if health['summary']['failed'] > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == '__main__':
    main()
```

---

## 8. Federation vs Shovel Comparison

Both Federation and Shovel move messages between brokers, but they serve different purposes.

```mermaid
flowchart TB
    subgraph Federation["Federation Plugin"]
        direction TB
        FU[Upstream Broker]
        FD[Downstream Broker]
        FU -.->|"Topology Replication<br/>Exchange/Queue Linking"| FD
    end

    subgraph Shovel["Shovel Plugin"]
        direction TB
        SS[Source Broker]
        SD[Destination Broker]
        SS -->|"Direct Message<br/>Transfer"| SD
    end
```

### Detailed Comparison

| Aspect | Shovel | Federation |
|--------|--------|------------|
| **Direction** | Unidirectional | Can be bidirectional |
| **Scope** | Queue-to-queue or exchange-to-exchange | Exchange or queue federation |
| **Configuration** | Explicit source/destination | Upstream/downstream relationships |
| **Message Handling** | Consumes and republishes | Links exchanges/queues logically |
| **Use Case** | Data migration, DR, bridging | Distributed topology, WAN optimization |
| **Latency Impact** | Messages leave source queue | Messages can stay at upstream |
| **Complexity** | Simpler, direct | More complex, topology-aware |
| **Queue Semantics** | Messages removed from source | Can keep messages at source |

### When to Use Shovel

1. **One-time migrations**: Moving queues between clusters
2. **Explicit data pipelines**: ETL-style message processing
3. **Protocol bridging**: AMQP 0.9.1 to AMQP 1.0
4. **Message transformation**: Adding headers during transfer
5. **Disaster recovery**: Async replication to DR site

### When to Use Federation

1. **Distributed exchanges**: Same exchange across multiple sites
2. **WAN-optimized topology**: Reduce cross-datacenter traffic
3. **Scalability**: Distribute load across federated nodes
4. **Local-first consumption**: Consumers prefer local messages

### Hybrid Approach

Sometimes both are needed:

```mermaid
flowchart LR
    subgraph Region1["US-East Region"]
        R1E[orders.exchange]
        R1Q[orders.local]
        R1E --> R1Q
    end

    subgraph Region2["US-West Region"]
        R2E[orders.exchange]
        R2Q[orders.local]
        R2E --> R2Q
    end

    subgraph Analytics["Analytics Cluster"]
        AQ[orders.analytics]
    end

    R1E <-.->|"Federation<br/>(Bidirectional)"| R2E
    R1Q -->|"Shovel<br/>(One-way)"| AQ
    R2Q -->|"Shovel<br/>(One-way)"| AQ
```

---

## 9. Best Practices

### Configuration Best Practices

```erlang
%% Production-ready shovel configuration
[
  {rabbitmq_shovel, [
    {shovels, [
      {production_shovel, [
        {source, [
          %% Always use multiple URIs for HA
          {uris, [
            "amqps://shovel:${SHOVEL_PASSWORD}@node1.example.com:5671",
            "amqps://shovel:${SHOVEL_PASSWORD}@node2.example.com:5671"
          ]},
          {queue, <<"critical.messages">>},
          %% Tune prefetch based on message size and network latency
          %% Higher for small messages, lower for large
          {prefetch_count, 250},
          %% Declare resources to ensure they exist
          {declarations, [
            {'queue.declare', [
              {queue, <<"critical.messages">>},
              {durable, true},
              {arguments, [
                {<<"x-queue-type">>, longstr, <<"quorum">>}
              ]}
            ]}
          ]}
        ]},
        {destination, [
          {uris, [
            "amqps://shovel:${SHOVEL_PASSWORD}@dest1.example.com:5671",
            "amqps://shovel:${SHOVEL_PASSWORD}@dest2.example.com:5671"
          ]},
          {publish_properties, [
            {exchange, <<"processed.messages">>},
            {routing_key, <<"from_source">>},
            {delivery_mode, 2}  %% Always persist critical messages
          ]},
          {declarations, [
            {'exchange.declare', [
              {exchange, <<"processed.messages">>},
              {type, <<"topic">>},
              {durable, true}
            ]}
          ]}
        ]},
        %% ALWAYS use on_confirm for production
        {ack_mode, on_confirm},
        %% Reconnect with backoff, not too aggressive
        {reconnect_delay, 10000}
      ]}
    ]}
  ]}
].
```

### Security Best Practices

1. **Use dedicated shovel users** with minimal permissions:

```bash
# Create a dedicated shovel user
rabbitmqctl add_user shovel_user secure_password

# Grant only necessary permissions
# Source side: read from specific queue
rabbitmqctl set_permissions -p / shovel_user "^$" "^$" "^source\.queue$"

# Destination side: write to specific exchange
rabbitmqctl set_permissions -p / shovel_user "^$" "^dest\.exchange$" "^$"
```

2. **Always use TLS** for cross-network shovels
3. **Rotate credentials** regularly
4. **Use environment variables** for secrets (never hardcode)

### Performance Tuning

| Parameter | Small Messages (<1KB) | Large Messages (>100KB) |
|-----------|----------------------|------------------------|
| prefetch_count | 500-1000 | 10-50 |
| ack_mode | on_confirm | on_confirm |
| reconnect_delay | 5-10s | 10-30s |

### Operational Checklist

- [ ] Enable shovel management plugin for visibility
- [ ] Configure monitoring and alerting
- [ ] Use TLS for all cross-network connections
- [ ] Create dedicated service accounts with minimal permissions
- [ ] Document all shovel configurations
- [ ] Test failover scenarios regularly
- [ ] Monitor message lag and throughput
- [ ] Set up log aggregation for shovel events
- [ ] Implement health checks in your deployment pipeline

---

## 10. Troubleshooting Common Issues

### Shovel Not Starting

```bash
# Check shovel status
rabbitmqctl shovel_status

# Common causes:
# 1. Invalid URI format
# 2. Authentication failure
# 3. Network connectivity
# 4. Missing queue/exchange at source

# Debug with verbose logging
rabbitmqctl set_log_level debug
journalctl -u rabbitmq-server -f | grep shovel
```

### Connection Failures

```bash
# Test connectivity to remote broker
nc -zv remote.example.com 5672

# Test AMQP connection
rabbitmqadmin -H remote.example.com -u user -p pass list queues

# Check TLS certificate validity
openssl s_client -connect remote.example.com:5671 -showcerts
```

### Message Loss Investigation

```bash
# Check unacknowledged messages
rabbitmqctl list_queues name messages messages_unacknowledged

# Verify ack_mode is set to on_confirm
rabbitmqctl shovel_status | grep ack_mode

# Check for publisher confirms on destination
rabbitmqctl list_connections name confirm | grep shovel
```

### Performance Issues

```bash
# Monitor message rates
rabbitmqctl list_queues name message_stats.publish_details.rate

# Check if destination is backing up
rabbitmqctl list_queues -p /dest messages messages_ready

# Adjust prefetch if needed (dynamic shovel)
rabbitmqctl set_parameter shovel my-shovel \
  '{"prefetch-count": 500, ...}'
```

---

## Summary

RabbitMQ Shovel is an essential tool for reliable message transfer between brokers. Key takeaways:

1. **Use static shovels** for permanent infrastructure-level routing
2. **Use dynamic shovels** for operational flexibility and programmatic control
3. **Always use `on_confirm` ack mode** in production to prevent message loss
4. **Configure multiple URIs** for high availability
5. **Monitor shovel health** with Prometheus metrics and alerting
6. **Choose Shovel over Federation** when you need explicit, unidirectional data movement
7. **Secure connections** with TLS and dedicated service accounts
8. **Tune prefetch** based on message size and network characteristics

---

*Need to monitor your RabbitMQ shovels and get alerted when transfers fail? [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring with built-in alerting for message queue health, helping you catch issues before they impact your users.*
