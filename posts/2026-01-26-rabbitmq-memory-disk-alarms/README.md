# How to Configure Memory and Disk Alarms in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Memory Management, Disk Alarms, Resource Monitoring, Performance Tuning, DevOps

Description: Learn how to configure and monitor memory and disk alarms in RabbitMQ to prevent broker crashes and maintain stable message flow in production environments.

---

RabbitMQ can consume significant memory when messages pile up. Without proper limits, it can exhaust system memory, crash the broker, or trigger the OOM killer. Memory and disk alarms are your safety net. When triggered, they block publishers to prevent resource exhaustion while consumers catch up.

## Understanding Resource Alarms

RabbitMQ has two types of resource alarms:

1. **Memory alarm**: Triggered when RabbitMQ memory usage exceeds the threshold
2. **Disk alarm**: Triggered when free disk space falls below the threshold

When either alarm triggers, RabbitMQ blocks publishing connections. Existing consumers continue working to drain queues.

```mermaid
flowchart TB
    subgraph Normal["Normal Operation"]
        P1[Publisher] -->|"publish"| RMQ1[RabbitMQ]
        RMQ1 -->|"consume"| C1[Consumer]
    end

    subgraph Alarm["Alarm Triggered"]
        P2[Publisher] -->|"BLOCKED"| RMQ2[RabbitMQ]
        RMQ2 -->|"consume continues"| C2[Consumer]
    end
```

## Configuring Memory Thresholds

### Relative Memory Limit

Set memory limit as a fraction of available RAM:

```ini
# /etc/rabbitmq/rabbitmq.conf

# Trigger alarm at 60% of available RAM (default is 40%)
vm_memory_high_watermark.relative = 0.6
```

### Absolute Memory Limit

Set a specific memory limit:

```ini
# Trigger alarm at 4GB memory usage
vm_memory_high_watermark.absolute = 4GB

# Or in bytes
vm_memory_high_watermark.absolute = 4294967296
```

### Memory Paging Threshold

When memory exceeds the paging threshold, RabbitMQ pages messages to disk:

```ini
# Start paging at 50% of the high watermark (default)
vm_memory_high_watermark_paging_ratio = 0.5

# With high_watermark at 0.6 (60%), paging starts at 30% of RAM
```

## Configuring Disk Alarms

### Absolute Disk Limit

Set minimum free disk space:

```ini
# /etc/rabbitmq/rabbitmq.conf

# Trigger alarm when less than 2GB free
disk_free_limit.absolute = 2GB

# Or use specific units
disk_free_limit.absolute = 2048MB
disk_free_limit.absolute = 2147483648
```

### Relative Disk Limit

Set disk limit relative to RAM:

```ini
# Require free disk equal to 1.5x RAM (default is 1.0x)
disk_free_limit.relative = 1.5
```

This is useful because RabbitMQ might need to write all in-memory data to disk during shutdown.

## Viewing Current Alarm Status

### Using rabbitmqctl

```bash
# Check current alarms
rabbitmqctl status | grep -A 10 "Alarms"

# Or use JSON output
rabbitmqctl status --formatter json | jq '.alarms'

# Check memory specifically
rabbitmqctl status | grep -A 5 "Memory"
```

### Using the Management API

```python
import requests
from requests.auth import HTTPBasicAuth

def check_alarms(host, user, password):
    """Check current alarm status"""

    # Get overview
    url = f"http://{host}:15672/api/overview"
    response = requests.get(url, auth=HTTPBasicAuth(user, password))
    data = response.json()

    # Check for alarms
    if data.get('object_totals', {}).get('queues', 0) == 0:
        print("No queues found")

    # Memory alarm
    mem_alarm = any(
        'memory' in str(a).lower()
        for node in data.get('listeners', [])
        for a in node.get('alarms', [])
    )

    # Get node details
    nodes_url = f"http://{host}:15672/api/nodes"
    nodes_response = requests.get(nodes_url, auth=HTTPBasicAuth(user, password))
    nodes = nodes_response.json()

    for node in nodes:
        name = node.get('name')
        mem_used = node.get('mem_used', 0)
        mem_limit = node.get('mem_limit', 0)
        mem_alarm = node.get('mem_alarm', False)
        disk_free = node.get('disk_free', 0)
        disk_free_limit = node.get('disk_free_limit', 0)
        disk_alarm = node.get('disk_free_alarm', False)

        print(f"Node: {name}")
        print(f"  Memory: {mem_used / 1024**3:.2f} GB / {mem_limit / 1024**3:.2f} GB limit")
        print(f"  Memory alarm: {'TRIGGERED' if mem_alarm else 'OK'}")
        print(f"  Disk free: {disk_free / 1024**3:.2f} GB (limit: {disk_free_limit / 1024**3:.2f} GB)")
        print(f"  Disk alarm: {'TRIGGERED' if disk_alarm else 'OK'}")

check_alarms('localhost', 'admin', 'password')
```

## Monitoring and Alerting

### Prometheus Metrics

RabbitMQ exports alarm metrics for Prometheus:

```yaml
# prometheus-alerts.yml

groups:
  - name: rabbitmq_alarms
    rules:
      - alert: RabbitMQMemoryAlarm
        expr: rabbitmq_alarms_memory_used_watermark == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ memory alarm triggered"
          description: "Memory usage exceeded threshold on {{ $labels.instance }}"

      - alert: RabbitMQDiskAlarm
        expr: rabbitmq_alarms_free_disk_space_watermark == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ disk alarm triggered"
          description: "Disk space low on {{ $labels.instance }}"

      - alert: RabbitMQMemoryHigh
        expr: rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ memory usage high"
          description: "Memory at {{ $value | humanizePercentage }} on {{ $labels.instance }}"
```

### Custom Monitoring Script

```python
import requests
import time

def monitor_resources(host, user, password, interval=30):
    """Continuously monitor RabbitMQ resource usage"""

    while True:
        try:
            url = f"http://{host}:15672/api/nodes"
            response = requests.get(url, auth=(user, password), timeout=10)
            nodes = response.json()

            for node in nodes:
                name = node.get('name', 'unknown')
                mem_used = node.get('mem_used', 0)
                mem_limit = node.get('mem_limit', 1)
                mem_percent = (mem_used / mem_limit) * 100
                mem_alarm = node.get('mem_alarm', False)

                disk_free = node.get('disk_free', 0)
                disk_limit = node.get('disk_free_limit', 0)
                disk_alarm = node.get('disk_free_alarm', False)

                # Log current status
                print(f"[{time.strftime('%H:%M:%S')}] {name}")
                print(f"  Memory: {mem_percent:.1f}% ({mem_used / 1024**2:.0f} MB)")
                print(f"  Disk free: {disk_free / 1024**3:.2f} GB")

                # Alert conditions
                if mem_alarm:
                    send_alert(f"CRITICAL: Memory alarm on {name}")
                elif mem_percent > 80:
                    send_alert(f"WARNING: Memory at {mem_percent:.1f}% on {name}")

                if disk_alarm:
                    send_alert(f"CRITICAL: Disk alarm on {name}")
                elif disk_free < disk_limit * 2:
                    send_alert(f"WARNING: Disk space low on {name}")

        except Exception as e:
            print(f"Error checking status: {e}")

        time.sleep(interval)

def send_alert(message):
    print(f"ALERT: {message}")
    # Send to Slack, PagerDuty, etc.

# monitor_resources('localhost', 'admin', 'password')
```

## Handling Alarm Situations

### When Memory Alarm Triggers

1. **Consumers continue**: Existing consumers keep draining queues
2. **Publishers blocked**: New publishes wait or timeout
3. **Connections blocked**: Connection.Blocked sent to clients

### Client-Side Handling

Handle blocked connections in your publisher:

```python
import pika

def on_blocked(connection, method):
    """Called when connection is blocked due to resource alarm"""
    print(f"Connection blocked: {method.reason}")
    # Log, alert, slow down publishing, etc.

def on_unblocked(connection, method):
    """Called when connection is unblocked"""
    print("Connection unblocked - resuming normal operation")

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        'localhost',
        blocked_connection_timeout=300  # Timeout after 5 minutes blocked
    )
)

# Register callbacks
connection.add_on_connection_blocked_callback(on_blocked)
connection.add_on_connection_unblocked_callback(on_unblocked)
```

### Node.js Blocked Connection Handling

```javascript
const amqp = require('amqplib');

async function createConnection() {
    const connection = await amqp.connect('amqp://localhost');

    connection.on('blocked', (reason) => {
        console.warn(`Connection blocked: ${reason}`);
        // Pause publishing, alert operators
    });

    connection.on('unblocked', () => {
        console.info('Connection unblocked');
        // Resume normal operation
    });

    return connection;
}
```

## Tuning Memory Usage

### Lazy Queues

Store messages on disk instead of memory:

```python
channel.queue_declare(
    queue='large_queue',
    durable=True,
    arguments={
        'x-queue-mode': 'lazy'  # Messages go directly to disk
    }
)
```

### Quorum Queues with Memory Limits

```python
channel.queue_declare(
    queue='bounded_queue',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-max-in-memory-length': 10000,  # Max 10k messages in memory
        'x-max-in-memory-bytes': 104857600  # Max 100MB in memory
    }
)
```

### Message TTL

Prevent unbounded queue growth:

```python
# Queue-level TTL
channel.queue_declare(
    queue='expiring_queue',
    arguments={
        'x-message-ttl': 3600000  # Messages expire after 1 hour
    }
)

# Per-message TTL
channel.basic_publish(
    exchange='',
    routing_key='queue',
    body=message,
    properties=pika.BasicProperties(
        expiration='60000'  # This message expires in 60 seconds
    )
)
```

### Queue Length Limits

```python
channel.queue_declare(
    queue='bounded_queue',
    arguments={
        'x-max-length': 100000,  # Max 100k messages
        'x-overflow': 'reject-publish'  # Reject new messages when full
    }
)
```

## Configuration Best Practices

### Development Environment

```ini
# /etc/rabbitmq/rabbitmq.conf

# Lower thresholds for testing
vm_memory_high_watermark.relative = 0.4
disk_free_limit.absolute = 500MB
```

### Production Environment

```ini
# /etc/rabbitmq/rabbitmq.conf

# Higher memory threshold for production
vm_memory_high_watermark.relative = 0.6

# Ensure enough disk for persistence
disk_free_limit.absolute = 5GB

# Or relative to RAM
disk_free_limit.relative = 2.0
```

### Container Environment

```ini
# Account for container memory limits
vm_memory_high_watermark.absolute = 3GB

# Kubernetes/Docker specific
vm_memory_calculation_strategy = allocated

# Disk limit
disk_free_limit.absolute = 2GB
```

## Troubleshooting

### Identify Memory Hogs

```bash
# Check queue memory usage
rabbitmqctl list_queues name messages memory --formatter json | \
    jq -r 'sort_by(.memory) | reverse | .[:10] | .[] | "\(.name): \(.memory / 1048576 | floor) MB (\(.messages) msgs)"'
```

### Check Connection Count

Too many connections consume memory:

```bash
rabbitmqctl list_connections name state recv_oct send_oct | head -20
```

### Memory Breakdown

```bash
# Detailed memory usage
rabbitmqctl status | grep -A 30 "Memory"

# Or via API
curl -u admin:password http://localhost:15672/api/nodes | jq '.[].memory'
```

### Clear Memory Quickly

In emergency situations:

```bash
# Purge specific queue (WARNING: loses messages)
rabbitmqctl purge_queue queue_name

# Or delete and recreate queue
rabbitmqctl delete_queue queue_name
```

## Summary Checklist

- [ ] Set `vm_memory_high_watermark` appropriate for your environment
- [ ] Configure `disk_free_limit` with enough headroom
- [ ] Enable Prometheus metrics for monitoring
- [ ] Set up alerts for both memory and disk alarms
- [ ] Handle `Connection.Blocked` in your clients
- [ ] Use lazy queues or quorum queues for large message volumes
- [ ] Set queue length limits and TTLs to prevent unbounded growth
- [ ] Monitor queue depths and consumer lag

## Conclusion

Memory and disk alarms are critical safety mechanisms in RabbitMQ. Configure them appropriately for your environment, monitor them actively, and handle blocked connections gracefully in your clients. When alarms trigger, focus on why messages are accumulating faster than consumers can process them. The alarm is a symptom, but the root cause is usually insufficient consumer capacity or a processing bottleneck.
