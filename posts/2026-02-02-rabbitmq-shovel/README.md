# How to Implement RabbitMQ Shovel for Cross-Datacenter Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Cross-Datacenter, Shovel, Message Queue, Replication, Distributed Systems, High Availability

Description: A comprehensive guide to implementing RabbitMQ Shovel for cross-datacenter message replication, covering architecture design, configuration, failover strategies, and production best practices.

---

Running message queues across multiple datacenters introduces significant complexity. Network partitions, latency variations, and eventual consistency all become real concerns. RabbitMQ Shovel provides a reliable mechanism to replicate messages between geographically distributed brokers while handling these challenges gracefully.

## Understanding Cross-Datacenter Replication with Shovel

Shovel creates a lightweight AMQP client that consumes messages from a source and republishes them to a destination. Unlike clustering (which requires low-latency connections), Shovel works reliably over WAN links with higher latency and occasional connectivity issues.

```mermaid
flowchart LR
    subgraph DC1["Datacenter 1 - Primary"]
        P[Publisher] --> Q1[Orders Queue]
        Q1 --> S[Shovel]
    end

    subgraph WAN["WAN Link"]
        S -->|AMQP/TLS| T[Tunnel]
    end

    subgraph DC2["Datacenter 2 - Secondary"]
        T --> Q2[Orders Queue Replica]
        Q2 --> C[Consumer]
    end
```

### Why Shovel Over Federation or Clustering?

Each approach serves different use cases:

| Feature | Shovel | Federation | Clustering |
|---------|--------|------------|------------|
| WAN Tolerance | Excellent | Good | Poor |
| Message Direction | Unidirectional | Bidirectional | N/A |
| Setup Complexity | Low | Medium | High |
| Message Ordering | Preserved | Preserved | Preserved |
| Latency Impact | Minimal | Some | Significant |

Shovel excels when you need straightforward, reliable message movement from point A to point B across unreliable networks.

## Architecture Patterns for Cross-Datacenter Replication

Several architectural patterns address different requirements for cross-datacenter messaging.

### Active-Passive Replication

The most common pattern replicates messages from an active datacenter to a passive one for disaster recovery.

```mermaid
flowchart TB
    subgraph Primary["Primary DC - Active"]
        PA[App Servers] --> PB[RabbitMQ Cluster]
        PB --> PS[Shovel Plugin]
    end

    subgraph Secondary["Secondary DC - Passive/Standby"]
        PS -->|Replicate| SB[RabbitMQ Cluster]
        SB -.->|Failover Only| SA[App Servers]
    end

    subgraph Monitor["Monitoring"]
        M[Health Checks] --> PA
        M --> SB
    end
```

### Active-Active with Bidirectional Shovel

For workloads distributed across datacenters, bidirectional shovels enable both sites to process messages.

```mermaid
flowchart LR
    subgraph DC1["Datacenter 1"]
        A1[Apps] --> Q1[Local Queue]
        Q1 --> S1[Shovel Out]
        R1[Remote Queue] --> A1
    end

    subgraph DC2["Datacenter 2"]
        A2[Apps] --> Q2[Local Queue]
        Q2 --> S2[Shovel Out]
        R2[Remote Queue] --> A2
    end

    S1 -->|Region-tagged| R2
    S2 -->|Region-tagged| R1
```

## Setting Up the Shovel Plugin

Before configuring shovels, enable the plugin on all RabbitMQ nodes that will participate in replication.

Enable the Shovel and management plugins on each node:

```bash
# Enable the shovel plugin for core functionality
rabbitmq-plugins enable rabbitmq_shovel

# Enable the management plugin for UI-based configuration and monitoring
rabbitmq-plugins enable rabbitmq_shovel_management

# Verify plugins are enabled
rabbitmq-plugins list | grep shovel
```

## Configuring Static Shovels for Cross-Datacenter Replication

Static shovels are defined in the RabbitMQ configuration file and survive broker restarts. They are ideal for permanent replication links.

Add the following configuration to your `rabbitmq.conf` or `advanced.config` file. The Erlang term format provides full control over shovel behavior:

```erlang
%% advanced.config - Static shovel for cross-datacenter replication
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Define a shovel named 'dc1_to_dc2_orders'
      {dc1_to_dc2_orders, [
        %% Source configuration - local broker
        {source, [
          {protocol, amqp091},
          {uris, ["amqp://shovel_user:secure_password@localhost:5672/orders_vhost"]},
          {declarations, [
            %% Ensure the source queue exists
            {'queue.declare', [{queue, <<"orders">>}, {durable, true}]}
          ]},
          {queue, <<"orders">>},
          %% Acknowledge messages only after confirmed at destination
          {prefetch_count, 100}
        ]},

        %% Destination configuration - remote datacenter
        {destination, [
          {protocol, amqp091},
          %% Multiple URIs for failover between DC2 nodes
          {uris, [
            "amqps://shovel_user:secure_password@dc2-rabbit-1.example.com:5671/orders_vhost",
            "amqps://shovel_user:secure_password@dc2-rabbit-2.example.com:5671/orders_vhost"
          ]},
          {declarations, [
            {'queue.declare', [{queue, <<"orders_replica">>}, {durable, true}]}
          ]},
          {publish_properties, [
            {delivery_mode, 2}  %% Persistent messages
          ]},
          %% Add headers to track replication source
          {add_forward_headers, true},
          {publish_fields, [
            {exchange, <<"">>},
            {routing_key, <<"orders_replica">>}
          ]}
        ]},

        %% Reliability settings
        {ack_mode, on_confirm},  %% Wait for publisher confirms
        {reconnect_delay, 5}     %% Reconnect after 5 seconds on failure
      ]}
    ]}
  ]}
].
```

## Configuring Dynamic Shovels via HTTP API

Dynamic shovels can be created, modified, and deleted at runtime without restarting the broker. They persist in the internal database and survive restarts.

Use the RabbitMQ HTTP API to create a dynamic shovel for order replication:

```bash
# Create a dynamic shovel using the HTTP API
# The shovel will replicate messages from local 'orders' queue to remote datacenter

curl -u admin:admin_password -X PUT \
  http://localhost:15672/api/parameters/shovel/%2Forders_vhost/dc1_to_dc2_orders \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "src-protocol": "amqp091",
      "src-uri": "amqp://localhost:5672",
      "src-queue": "orders",
      "src-prefetch-count": 100,
      "src-delete-after": "never",
      "dest-protocol": "amqp091",
      "dest-uri": [
        "amqps://dc2-rabbit-1.example.com:5671",
        "amqps://dc2-rabbit-2.example.com:5671"
      ],
      "dest-queue": "orders_replica",
      "dest-add-forward-headers": true,
      "ack-mode": "on-confirm",
      "reconnect-delay": 5
    }
  }'
```

## Implementing Secure Cross-Datacenter Connections

Messages traveling across datacenters must be encrypted. Configure TLS for all inter-datacenter shovel connections.

### Generating Certificates

Create a certificate authority and broker certificates for secure communication:

```bash
#!/bin/bash
# generate-certs.sh - Create CA and broker certificates for shovel TLS

# Create directory structure for certificates
mkdir -p /etc/rabbitmq/ssl/{ca,server,client}
cd /etc/rabbitmq/ssl

# Generate Certificate Authority key and certificate
openssl genrsa -out ca/ca_key.pem 4096
openssl req -x509 -new -nodes -key ca/ca_key.pem \
  -sha256 -days 3650 -out ca/ca_cert.pem \
  -subj "/CN=RabbitMQ-CA/O=MyOrg/C=US"

# Generate server certificate for DC1 broker
openssl genrsa -out server/dc1_key.pem 4096
openssl req -new -key server/dc1_key.pem \
  -out server/dc1_csr.pem \
  -subj "/CN=dc1-rabbit.example.com/O=MyOrg/C=US"
openssl x509 -req -in server/dc1_csr.pem \
  -CA ca/ca_cert.pem -CAkey ca/ca_key.pem \
  -CAcreateserial -out server/dc1_cert.pem \
  -days 365 -sha256

# Generate client certificate for shovel connections
openssl genrsa -out client/shovel_key.pem 4096
openssl req -new -key client/shovel_key.pem \
  -out client/shovel_csr.pem \
  -subj "/CN=shovel-client/O=MyOrg/C=US"
openssl x509 -req -in client/shovel_csr.pem \
  -CA ca/ca_cert.pem -CAkey ca/ca_key.pem \
  -CAcreateserial -out client/shovel_cert.pem \
  -days 365 -sha256

# Set appropriate permissions
chmod 600 /etc/rabbitmq/ssl/*/key.pem
chown rabbitmq:rabbitmq /etc/rabbitmq/ssl -R
```

### Configuring TLS in rabbitmq.conf

Update the broker configuration to enable TLS for both listeners and shovel clients:

```ini
# rabbitmq.conf - TLS configuration for cross-datacenter communication

# TLS listener configuration
listeners.ssl.default = 5671
ssl_options.cacertfile = /etc/rabbitmq/ssl/ca/ca_cert.pem
ssl_options.certfile = /etc/rabbitmq/ssl/server/dc1_cert.pem
ssl_options.keyfile = /etc/rabbitmq/ssl/server/dc1_key.pem
ssl_options.verify = verify_peer
ssl_options.fail_if_no_peer_cert = true

# Minimum TLS version for security
ssl_options.versions.1 = tlsv1.3
ssl_options.versions.2 = tlsv1.2

# Shovel TLS client settings
shovel.ssl_options.cacertfile = /etc/rabbitmq/ssl/ca/ca_cert.pem
shovel.ssl_options.certfile = /etc/rabbitmq/ssl/client/shovel_cert.pem
shovel.ssl_options.keyfile = /etc/rabbitmq/ssl/client/shovel_key.pem
shovel.ssl_options.verify = verify_peer
```

## Handling Network Partitions and Failover

Network issues between datacenters are inevitable. Configure shovels to handle these gracefully.

```mermaid
stateDiagram-v2
    [*] --> Running: Shovel Started
    Running --> Disconnected: Network Failure
    Disconnected --> Reconnecting: After reconnect_delay
    Reconnecting --> Running: Connection Restored
    Reconnecting --> Disconnected: Connection Failed
    Running --> [*]: Shovel Deleted

    note right of Disconnected
        Messages queue locally
        No data loss
    end note
```

### Configuring Reconnection Behavior

Configure appropriate reconnection delays and message handling during outages in your advanced.config:

```erlang
%% advanced.config - Resilient shovel configuration
[
  {rabbitmq_shovel, [
    {shovels, [
      {resilient_dc_shovel, [
        {source, [
          {protocol, amqp091},
          {uris, ["amqp://localhost:5672/production"]},
          {queue, <<"critical_events">>},
          %% Higher prefetch allows batching during recovery
          {prefetch_count, 500}
        ]},
        {destination, [
          {protocol, amqp091},
          %% Multiple destination URIs for automatic failover
          {uris, [
            "amqps://dc2-node1.example.com:5671/production",
            "amqps://dc2-node2.example.com:5671/production",
            "amqps://dc2-node3.example.com:5671/production"
          ]},
          {publish_fields, [
            {exchange, <<"">>},
            {routing_key, <<"critical_events_replica">>}
          ]}
        ]},
        %% Wait for publisher confirms before acknowledging source
        {ack_mode, on_confirm},
        %% Exponential backoff starting at 5 seconds
        {reconnect_delay, 5}
      ]}
    ]}
  ]}
].
```

## Implementing Message Deduplication

Cross-datacenter replication can occasionally result in duplicate messages during failover scenarios. Implement deduplication at the consumer level.

A Python consumer with Redis-based deduplication handles potential duplicates:

```python
# dedup_consumer.py - Consumer with message deduplication for cross-DC replication

import pika
import redis
import json
import hashlib
from datetime import timedelta

class DeduplicatingConsumer:
    """
    Consumer that deduplicates messages using Redis.
    Messages are identified by a unique ID header or content hash.
    """

    def __init__(self, rabbitmq_url: str, redis_url: str, queue_name: str):
        # Initialize Redis connection for deduplication tracking
        self.redis_client = redis.from_url(redis_url)
        self.queue_name = queue_name

        # Set up RabbitMQ connection with automatic recovery
        params = pika.URLParameters(rabbitmq_url)
        params.connection_attempts = 5
        params.retry_delay = 5
        self.connection = pika.BlockingConnection(params)
        self.channel = self.connection.channel()

        # Deduplication window - messages older than this are considered new
        self.dedup_window = timedelta(hours=24)

    def _get_message_id(self, properties, body: bytes) -> str:
        """
        Extract or generate a unique message identifier.
        Prefers explicit message_id, falls back to content hash.
        """
        # Check for explicit message ID in properties
        if properties.message_id:
            return f"msg:{properties.message_id}"

        # Check for ID in headers (set by shovel forward headers)
        if properties.headers and 'x-message-id' in properties.headers:
            return f"msg:{properties.headers['x-message-id']}"

        # Fall back to content-based deduplication using hash
        content_hash = hashlib.sha256(body).hexdigest()
        return f"hash:{content_hash}"

    def _is_duplicate(self, message_id: str) -> bool:
        """
        Check if message was already processed within the dedup window.
        Returns True if duplicate, False if new message.
        """
        # Use Redis SET NX (set if not exists) with expiration
        # Returns True if key was set (new message), False if exists (duplicate)
        is_new = self.redis_client.set(
            f"dedup:{self.queue_name}:{message_id}",
            "1",
            nx=True,  # Only set if not exists
            ex=int(self.dedup_window.total_seconds())
        )
        return not is_new

    def process_message(self, channel, method, properties, body):
        """
        Process incoming message with deduplication.
        Acknowledges duplicates without processing to prevent redelivery.
        """
        message_id = self._get_message_id(properties, body)

        # Check for duplicate
        if self._is_duplicate(message_id):
            print(f"Duplicate message detected: {message_id}, skipping")
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        try:
            # Process the message (implement your business logic here)
            data = json.loads(body)
            print(f"Processing message: {message_id}")
            self._handle_message(data)

            # Acknowledge successful processing
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            print(f"Error processing message {message_id}: {e}")
            # Requeue message for retry, but remove from dedup cache
            self.redis_client.delete(f"dedup:{self.queue_name}:{message_id}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _handle_message(self, data: dict):
        """
        Implement your message handling logic here.
        Replace with actual business logic.
        """
        print(f"Handled message: {data}")

    def start_consuming(self):
        """Start consuming messages from the queue."""
        self.channel.basic_qos(prefetch_count=10)
        self.channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=self.process_message
        )
        print(f"Starting consumer for queue: {self.queue_name}")
        self.channel.start_consuming()


if __name__ == "__main__":
    consumer = DeduplicatingConsumer(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        redis_url="redis://localhost:6379/0",
        queue_name="orders_replica"
    )
    consumer.start_consuming()
```

## Monitoring Shovel Health and Performance

Effective monitoring ensures quick detection and resolution of replication issues.

### Prometheus Metrics Collection

Configure Prometheus to scrape RabbitMQ shovel metrics:

```yaml
# prometheus.yml - Scrape configuration for RabbitMQ shovel metrics

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape RabbitMQ metrics including shovel status
  - job_name: 'rabbitmq'
    static_configs:
      # DC1 RabbitMQ nodes
      - targets:
          - 'dc1-rabbit-1:15692'
          - 'dc1-rabbit-2:15692'
        labels:
          datacenter: 'dc1'
          role: 'primary'
      # DC2 RabbitMQ nodes
      - targets:
          - 'dc2-rabbit-1:15692'
          - 'dc2-rabbit-2:15692'
        labels:
          datacenter: 'dc2'
          role: 'secondary'

    # Metrics path for RabbitMQ Prometheus plugin
    metrics_path: '/metrics'
```

### Alerting Rules for Shovel Issues

Create Prometheus alerting rules to catch replication problems early:

```yaml
# shovel_alerts.yml - Alerting rules for cross-datacenter shovel monitoring

groups:
  - name: rabbitmq_shovel_alerts
    rules:
      # Alert when a shovel stops running
      - alert: ShovelNotRunning
        expr: rabbitmq_shovel_state{state="running"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ Shovel {{ $labels.name }} is not running"
          description: "Shovel {{ $labels.name }} on {{ $labels.instance }} has been down for more than 2 minutes. Cross-datacenter replication is impacted."

      # Alert on high message lag in source queue
      - alert: ShovelReplicationLag
        expr: rabbitmq_queue_messages{queue=~".*_shovel_source"} > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High message backlog in shovel source queue"
          description: "Queue {{ $labels.queue }} has {{ $value }} messages pending replication. Check network connectivity to destination datacenter."

      # Alert when shovel keeps reconnecting
      - alert: ShovelUnstable
        expr: increase(rabbitmq_shovel_state_transitions_total[5m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "Shovel {{ $labels.name }} is unstable"
          description: "Shovel has experienced {{ $value }} state transitions in the last 5 minutes, indicating connectivity issues."

      # Alert on replication delay
      - alert: ShovelHighLatency
        expr: rabbitmq_shovel_messages_published_total - rabbitmq_shovel_messages_confirmed_total > 1000
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High unconfirmed message count for shovel"
          description: "Shovel {{ $labels.name }} has {{ $value }} messages awaiting confirmation. Destination broker may be overloaded."
```

### Health Check Script

A shell script to verify shovel status across datacenters:

```bash
#!/bin/bash
# check_shovel_health.sh - Verify cross-datacenter shovel replication health

set -e

RABBITMQ_USER="${RABBITMQ_USER:-admin}"
RABBITMQ_PASS="${RABBITMQ_PASS:-admin}"
DC1_HOST="${DC1_HOST:-dc1-rabbit.example.com}"
DC2_HOST="${DC2_HOST:-dc2-rabbit.example.com}"

# Function to check shovel status on a node
check_shovel_status() {
    local host=$1
    local datacenter=$2

    echo "Checking shovels on $datacenter ($host)..."

    # Query the shovel status API endpoint
    response=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        "http://$host:15672/api/shovels")

    # Parse JSON response and check each shovel
    echo "$response" | jq -r '.[] | "\(.name): \(.state)"' | while read line; do
        name=$(echo "$line" | cut -d: -f1)
        state=$(echo "$line" | cut -d: -f2 | tr -d ' ')

        if [ "$state" != "running" ]; then
            echo "WARNING: Shovel $name is in state: $state"
            return 1
        else
            echo "OK: Shovel $name is running"
        fi
    done
}

# Function to check message lag
check_replication_lag() {
    local source_host=$1
    local queue=$2
    local threshold=$3

    # Get queue message count from source
    messages=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        "http://$source_host:15672/api/queues/%2F/$queue" | \
        jq -r '.messages // 0')

    if [ "$messages" -gt "$threshold" ]; then
        echo "WARNING: Queue $queue has $messages messages (threshold: $threshold)"
        return 1
    else
        echo "OK: Queue $queue message count: $messages"
    fi
}

# Main health checks
echo "=== Cross-Datacenter Shovel Health Check ==="
echo ""

# Check shovel status on both datacenters
check_shovel_status "$DC1_HOST" "DC1"
check_shovel_status "$DC2_HOST" "DC2"

echo ""
echo "=== Replication Lag Check ==="

# Check message lag on source queues (threshold: 1000 messages)
check_replication_lag "$DC1_HOST" "orders" 1000
check_replication_lag "$DC1_HOST" "events" 1000

echo ""
echo "Health check completed."
```

## Performance Tuning for High-Throughput Replication

Optimize shovel configuration for scenarios requiring high message throughput.

### Tuning Prefetch and Batching

Adjust prefetch counts based on message size and network latency:

```erlang
%% advanced.config - High-throughput shovel configuration
[
  {rabbitmq_shovel, [
    {shovels, [
      {high_throughput_shovel, [
        {source, [
          {protocol, amqp091},
          {uris, ["amqp://localhost:5672/production"]},
          {queue, <<"high_volume_events">>},
          %% Higher prefetch for better throughput
          %% Adjust based on message size: smaller messages = higher prefetch
          {prefetch_count, 1000}
        ]},
        {destination, [
          {protocol, amqp091},
          {uris, ["amqps://dc2-rabbit.example.com:5671/production"]},
          {publish_fields, [
            {exchange, <<"events">>},
            {routing_key, <<"replicated">>}
          ]},
          %% Batch publishes for network efficiency
          {publish_properties, [
            {delivery_mode, 2}
          ]}
        ]},
        %% Use on-confirm for reliability with high prefetch
        {ack_mode, on_confirm},
        {reconnect_delay, 2}
      ]}
    ]}
  ]},

  %% Increase Erlang VM network buffer sizes
  {kernel, [
    {inet_default_connect_options, [{nodelay, true}]},
    {inet_default_listen_options, [{nodelay, true}]}
  ]}
].
```

### Network Optimization

Configure TCP settings for better WAN performance:

```ini
# rabbitmq.conf - Network optimization for cross-datacenter shovels

# Increase TCP buffer sizes for WAN connections
tcp_listen_options.backlog = 4096
tcp_listen_options.nodelay = true
tcp_listen_options.sndbuf = 196608
tcp_listen_options.recbuf = 196608

# Heartbeat interval - balance between detection speed and overhead
heartbeat = 30

# Frame size - larger frames reduce overhead for big messages
frame_max = 131072

# Channel max - allow more concurrent channels
channel_max = 2048
```

## Disaster Recovery Procedures

Establish clear procedures for handling datacenter failures and performing failover.

```mermaid
flowchart TD
    A[Detect DC1 Failure] --> B{Automated Failover?}
    B -->|Yes| C[Health Check Confirms Failure]
    B -->|No| D[Manual Assessment]

    C --> E[Update DNS/Load Balancer]
    D --> E

    E --> F[Activate DC2 Consumers]
    F --> G[Verify Message Processing]
    G --> H[Monitor for Duplicates]

    H --> I{DC1 Recovered?}
    I -->|Yes| J[Sync Pending Messages]
    I -->|No| K[Continue on DC2]

    J --> L[Resume Normal Operations]
    K --> L
```

### Failover Script

Automate failover procedures with a controlled script:

```bash
#!/bin/bash
# failover_to_dc2.sh - Automated failover procedure for cross-datacenter RabbitMQ

set -e

# Configuration
PRIMARY_DC="dc1"
SECONDARY_DC="dc2"
RABBITMQ_USER="${RABBITMQ_USER:-admin}"
RABBITMQ_PASS="${RABBITMQ_PASS:-admin}"
DC2_HOSTS=("dc2-rabbit-1.example.com" "dc2-rabbit-2.example.com")

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Step 1: Verify DC1 is actually down
verify_dc1_failure() {
    log "Verifying DC1 failure..."

    for host in dc1-rabbit-{1,2,3}.example.com; do
        if curl -s --connect-timeout 5 "http://$host:15672/api/health/checks/alarms" > /dev/null 2>&1; then
            log "ERROR: $host is still responding. Aborting failover."
            exit 1
        fi
    done

    log "DC1 failure confirmed - all nodes unreachable"
}

# Step 2: Pause shovels pointing to DC1 (if any exist on DC2)
pause_dc2_shovels() {
    log "Pausing any shovels on DC2 that point to DC1..."

    for host in "${DC2_HOSTS[@]}"; do
        # Get list of shovels
        shovels=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
            "http://$host:15672/api/shovels" | jq -r '.[].name')

        for shovel in $shovels; do
            log "Checking shovel: $shovel"
            # Delete shovels that reference DC1
            shovel_config=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
                "http://$host:15672/api/parameters/shovel/%2F/$shovel")

            if echo "$shovel_config" | grep -q "dc1"; then
                log "Deleting shovel $shovel (references DC1)"
                curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" -X DELETE \
                    "http://$host:15672/api/parameters/shovel/%2F/$shovel"
            fi
        done
    done
}

# Step 3: Enable consumers on DC2
activate_dc2_consumers() {
    log "Activating consumers on DC2..."

    # Example: Scale up Kubernetes deployments in DC2
    # kubectl --context=dc2 scale deployment/order-processor --replicas=3

    # Or restart systemd services
    # ssh dc2-app-server "sudo systemctl start order-processor"

    log "DC2 consumers activated"
}

# Step 4: Update traffic routing
update_routing() {
    log "Updating traffic routing to DC2..."

    # Example: Update DNS via cloud provider API
    # aws route53 change-resource-record-sets --hosted-zone-id XXXX ...

    # Or update load balancer
    # curl -X POST "https://api.cloudflare.com/client/v4/zones/xxx/dns_records/xxx" ...

    log "Traffic routing updated"
}

# Step 5: Verify DC2 is processing messages
verify_dc2_health() {
    log "Verifying DC2 message processing..."

    sleep 10  # Allow time for consumers to start

    for host in "${DC2_HOSTS[@]}"; do
        # Check queue consumers are active
        consumers=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
            "http://$host:15672/api/queues/%2F/orders_replica" | \
            jq -r '.consumers')

        if [ "$consumers" -gt 0 ]; then
            log "DC2 has $consumers active consumers on orders_replica queue"
            return 0
        fi
    done

    log "WARNING: No consumers detected on DC2"
    return 1
}

# Main failover procedure
main() {
    log "=== Starting Failover to DC2 ==="

    verify_dc1_failure
    pause_dc2_shovels
    activate_dc2_consumers
    update_routing
    verify_dc2_health

    log "=== Failover Complete ==="
    log "DC2 is now the primary datacenter"
    log "Remember to:"
    log "  1. Monitor for duplicate message processing"
    log "  2. Update alerting thresholds"
    log "  3. Plan DC1 recovery procedure"
}

main "$@"
```

## Best Practices Summary

Following these best practices ensures reliable cross-datacenter replication.

### Configuration Best Practices

1. **Always use TLS** for cross-datacenter connections
2. **Configure multiple destination URIs** for automatic failover
3. **Use on-confirm acknowledgment mode** to prevent message loss
4. **Set appropriate prefetch counts** based on message size and network latency
5. **Add forward headers** to track message origin and enable deduplication

### Operational Best Practices

1. **Monitor shovel status** continuously with alerting
2. **Test failover procedures** regularly in staging environments
3. **Document recovery procedures** and keep them updated
4. **Implement message deduplication** at the consumer level
5. **Maintain separate credentials** for shovel connections with minimal permissions

### Network Best Practices

1. **Use dedicated network links** between datacenters when possible
2. **Configure appropriate timeouts** for WAN latency
3. **Implement health checks** that account for network variability
4. **Plan for split-brain scenarios** in active-active configurations

## Conclusion

RabbitMQ Shovel provides a robust solution for cross-datacenter message replication. By following the patterns and configurations outlined in this guide, you can build resilient messaging infrastructure that survives datacenter failures while maintaining message integrity. Start with a simple active-passive setup, implement comprehensive monitoring, and gradually add complexity as your requirements evolve.
