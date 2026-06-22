# How to Fix 'Memory Alarm' Errors in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Memory Management, Troubleshooting, Performance, Message Queue

Description: Learn how to diagnose, resolve, and prevent memory alarm errors that block publishers in RabbitMQ.

---

Memory alarms in RabbitMQ are protective mechanisms that trigger when the broker consumes too much memory. When activated, RabbitMQ blocks all publishing connections to prevent the system from running out of memory and crashing. While this protection is essential, persistent memory alarms indicate underlying issues that need resolution. This guide explains how to diagnose, fix, and prevent memory alarm conditions.

## Understanding Memory Alarms

RabbitMQ monitors system memory and triggers an alarm when usage exceeds a configurable threshold.

```mermaid
flowchart TD
    A[RabbitMQ Running] --> B{Memory Usage Check}
    B -->|Below Threshold| C[Normal Operation]
    B -->|Above Threshold| D[Memory Alarm Triggered]

    C --> E[Publishers Active]
    C --> F[Consumers Active]

    D --> G[Publishers Blocked]
    D --> H[Consumers Still Active]
    D --> I[Publishers Throttled]

    H --> J{Memory Decreases?}
    J -->|Yes| K[Alarm Cleared]
    J -->|No| L[System Remains Blocked]

    K --> C
```

### Default Memory Threshold

By default, RabbitMQ triggers a memory alarm when it uses more than 60% of available system memory.

```bash
# Check current memory status

rabbitmq-diagnostics status | grep -A 20 "Memory"

# Sample output showing memory alarm
# Memory
# ------
# Total memory used: 2.5 GB
# Memory limit: 3.2 GB
# Memory high watermark: 60%
# Memory alarm: true  <-- ALARM ACTIVE
```

## Immediate Resolution Steps

When a memory alarm is active, follow these steps to restore normal operation.

### Step 1: Verify Memory Alarm Status

```bash
# Check if memory alarm is active
rabbitmq-diagnostics alarms

# Get detailed memory breakdown
rabbitmq-diagnostics memory_breakdown --unit bytes

# Via management API
curl -u admin:password http://localhost:15672/api/nodes | jq '.[0].mem_alarm'
```

### Step 2: Identify Memory Consumers

```bash
# List queues by memory usage
rabbitmqctl -q list_queues name memory messages | sort -k2 -n

# Check connection memory usage
rabbitmqctl list_connections name recv_oct_details send_oct_details

# Get detailed memory breakdown by category
rabbitmq-diagnostics memory_breakdown --unit bytes
```

Sample memory breakdown:
```text
Memory used by category (bytes):
  allocated_unused: 45,678,912
  atom: 1,234,567
  binary: 890,123,456
  code: 23,456,789
  connection_channels: 12,345,678
  connection_other: 8,901,234
  connection_readers: 5,678,901
  connection_writers: 4,567,890
  metrics: 2,345,678
  mgmt_db: 34,567,890
  mnesia: 1,234,567
  msg_index: 23,456,789
  other_ets: 12,345,678
  other_proc: 45,678,901
  other_system: 23,456,789
  plugins: 5,678,901
  queue_procs: 234,567,890
  quorum_queue_procs: 45,678,901
  reserved_unallocated: 0
```

### Step 3: Take Immediate Action

```mermaid
flowchart TD
    A[Memory Alarm Active] --> B{Identify Cause}

    B -->|Large Queues| C[Purge or Consume Messages]
    B -->|Too Many Connections| D[Close Idle Connections]
    B -->|Memory Leak| E[Restart RabbitMQ]
    B -->|Threshold Too Low| F[Increase Memory Limit]

    C --> G[Monitor Memory]
    D --> G
    E --> G
    F --> G

    G --> H{Alarm Cleared?}
    H -->|Yes| I[Investigate Root Cause]
    H -->|No| B
```

#### Option A: Purge Large Queues (If Messages Can Be Lost)

```bash
# List queues sorted by message count
rabbitmqctl -q list_queues name messages | sort -k2 -n

# Purge a specific queue (WARNING: Deletes all messages)
rabbitmqadmin queues purge --name large_queue

# Or via rabbitmqctl
rabbitmqctl purge_queue large_queue
```

#### Option B: Increase Consumer Throughput

```bash
# Check consumer count on queues
rabbitmqctl list_queues name consumers messages

# If consumers are slow, scale them up or increase prefetch
# Example: Increase prefetch count for existing consumers
```

#### Option C: Temporarily Increase Memory Threshold

```bash
# Increase memory threshold to 60% temporarily
rabbitmqctl set_vm_memory_high_watermark 0.6

# Or set an absolute limit (e.g., 4GB)
rabbitmqctl set_vm_memory_high_watermark absolute "4G"
```

#### Option D: Force Memory Release

```bash
# Force garbage collection on all processes
rabbitmqctl eval '[erlang:garbage_collect(P) || P <- erlang:processes()].'

# Clear management database statistics (if using management plugin)
rabbitmqctl eval 'rabbit_mgmt_storage:reset_all().'
```

## Configuration for Prevention

### Memory Threshold Settings

Edit `/etc/rabbitmq/rabbitmq.conf`:

```ini
# Set memory high watermark as percentage of total RAM
# Default is 0.6 (60%)
vm_memory_high_watermark.relative = 0.6

# Or set absolute memory limit
# vm_memory_high_watermark.absolute = 4GB

# Configure paging threshold (when to start paging messages to disk)
# This is a fraction of the high watermark
# At 50% of high watermark, start paging
vm_memory_high_watermark_paging_ratio = 0.5

# Memory calculation strategy
# Options: rss (resident set), allocated, legacy, erlang
vm_memory_calculation_strategy = rss
```

### Memory Calculation Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `rss` | Resident Set Size | Most accurate for bare metal |
| `allocated` | Memory allocated by Erlang VM | Alternative strategy |
| `legacy` | Legacy runtime memory reporting | Backward-compatible fallback |
| `erlang` | Same as `legacy`, preserved for compatibility | Backward-compatible fallback |

### Container-Specific Configuration

When running RabbitMQ in containers, memory limits need special handling.

```yaml
# docker-compose.yml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:4.3-management
    volumes:
      - ./rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

`rabbitmq.conf`:
```ini
vm_memory_high_watermark.absolute = 1600MiB
```

For Kubernetes:

```yaml
# rabbitmq-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-config
data:
  rabbitmq.conf: |
    vm_memory_high_watermark.absolute = 1600MiB
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
spec:
  template:
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:4.3-management
        resources:
          limits:
            memory: "2Gi"
          requests:
            memory: "1Gi"
        volumeMounts:
        - name: rabbitmq-config
          mountPath: /etc/rabbitmq/rabbitmq.conf
          subPath: rabbitmq.conf
      volumes:
      - name: rabbitmq-config
        configMap:
          name: rabbitmq-config
```

## Diagnosing Root Causes

### Cause 1: Message Backlog

Messages accumulating faster than they are consumed.

```bash
# Identify queues with large backlogs
rabbitmqctl -q list_queues name messages consumers message_bytes | \
  sort -k2 -n | tail -20

# Check ready and unacknowledged messages
rabbitmqctl list_queues name messages_ready messages_unacknowledged \
  consumers
```

Solution:
```bash
# Add more consumers or increase prefetch
# Configure TTL to expire old messages
rabbitmqctl set_policy ttl-policy "^queue\." \
  '{"message-ttl": 86400000}' \
  --apply-to queues

# Set maximum queue length
rabbitmqctl set_policy max-length "^queue\." \
  '{"max-length": 100000, "overflow": "drop-head"}' \
  --apply-to queues
```

### Cause 2: Large Messages

Individual messages consuming significant memory.

```bash
# Check average message size per queue
rabbitmqctl -q list_queues name messages message_bytes | \
  awk '$2 > 0 {printf "%s %.0f bytes/message\n", $1, $3/$2}'
```

Solution:
```bash
# Limit maximum message size
# In rabbitmq.conf:
# max_message_size = 134217728  # 128MB max

# Or use message compression in your application
# Example policy to reject large messages
rabbitmqctl set_policy max-length ".*" \
  '{"max-length-bytes": 1073741824}' \
  --apply-to queues
```

### Cause 3: Too Many Connections/Channels

Each connection and channel consumes memory.

```bash
# Count connections
rabbitmqctl list_connections | wc -l

# Count channels
rabbitmqctl list_channels | wc -l

# Find connections with many channels
rabbitmqctl -q list_connections name channels | sort -k2 -n
```

Solution:
```ini
# rabbitmq.conf - Limit connections and channels

# Maximum connections/channels can also be limited per user:
# rabbitmqctl set_user_limits app_user '{"max-connections": 1000, "max-channels": 128}'

# Maximum channels per connection
channel_max = 128

# Heartbeat timeout (detects dead connections)
heartbeat = 60
```

### Cause 4: Management Plugin Statistics

The management plugin stores statistics in memory.

```bash
# Check management database size
rabbitmq-diagnostics memory_breakdown --unit bytes | grep -i "Management stats database"

# Reset management statistics
rabbitmqctl eval 'rabbit_mgmt_storage:reset_all().'
```

Solution:
```ini
# rabbitmq.conf - Limit management statistics retention

# Reduce statistics retention (default is 5 minutes)
management.rates_mode = basic
management.sample_retention_policies.global.minute = 5
management.sample_retention_policies.global.hour = 60
management.sample_retention_policies.global.day = 1200

# Reduce statistics event frequency
collect_statistics_interval = 10000
```

### Cause 5: Binary Memory Fragmentation

Erlang binary memory can become fragmented over time.

```bash
# Check binary memory
rabbitmq-diagnostics memory_breakdown --unit bytes | grep -i binary

# Force binary garbage collection
rabbitmqctl eval '[erlang:garbage_collect(P) || P <- erlang:processes()].'
```

## Queue Type Considerations

Different queue types have different memory characteristics.

```mermaid
flowchart LR
    subgraph Classic["Classic Queue"]
        CM[Messages in Memory]
        CP[Paged to Disk on Pressure]
    end

    subgraph Quorum["Quorum Queue"]
        QM[In-Memory Index]
        QD[Raft Log on Disk]
    end

    subgraph Stream["Stream Queue"]
        SM[Small Cache]
        SD[Append-Only Log]
    end
```

### Classic Queue Storage

RabbitMQ no longer supports the old classic queue `lazy` mode. Current classic queues already keep a small, consumption-dependent subset of messages in memory and store most message data on disk.

### Using Quorum Queues

```bash
# Quorum queues have better memory efficiency for large queues
rabbitmqadmin queues declare --name efficient_queue --type quorum --durable true
```

## Monitoring and Alerting

### Prometheus Metrics

```yaml
# prometheus-alerts.yml
groups:
  - name: rabbitmq_memory
    rules:
      - alert: RabbitMQMemoryAlarm
        expr: rabbitmq_alarms_memory_used_watermark == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ memory alarm on {{ $labels.instance }}"
          description: "Publishers are blocked due to memory alarm"

      - alert: RabbitMQHighMemoryUsage
        expr: rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes > 0.7
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ memory usage above 70%"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: RabbitMQQueueMemoryHigh
        expr: rabbitmq_queue_messages_bytes > 500000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue }} using high memory"
          description: "Queue has {{ $value | humanize1024 }}B of messages"
```

### Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/rabbitmq-memory-check.sh

if ! rabbitmq-diagnostics check_local_alarms >/dev/null 2>&1; then
    echo "CRITICAL: Memory alarm active"

    # Get top queues by memory
    echo "Top queues by memory:"
    rabbitmqctl -q list_queues name messages memory 2>/dev/null | sort -k3 -n | tail -10

    # Get memory breakdown
    echo "Memory breakdown:"
    rabbitmq-diagnostics memory_breakdown --unit bytes 2>/dev/null

    exit 2
fi

echo "OK: Memory usage normal"
exit 0
```

## Automated Recovery

### Systemd Memory Limit

```ini
# /etc/systemd/system/rabbitmq-server.service.d/override.conf
[Service]
# Restart if memory exceeds 80% of limit
MemoryHigh=80%
MemoryMax=90%

# Restart on failure
Restart=on-failure
RestartSec=30
```

### Cron Job for Queue Cleanup

```bash
# /etc/cron.d/rabbitmq-cleanup
# Delete empty queues with no consumers

0 * * * * rabbitmq /usr/local/bin/rabbitmq-cleanup.sh

# /usr/local/bin/rabbitmq-cleanup.sh
#!/bin/bash
for queue in $(rabbitmqctl list_queues name consumers messages --quiet | awk '$2 == 0 && $3 == 0 {print $1}'); do
    rabbitmqctl delete_queue "$queue" --if-unused --if-empty 2>/dev/null
    echo "Deleted empty queue with no consumers: $queue"
done
```

## Summary

To fix and prevent memory alarm errors in RabbitMQ:

1. **Immediate Actions**
   - Identify and purge large queues if data loss is acceptable
   - Temporarily increase memory threshold
   - Scale up consumers to drain queues

2. **Configuration Tuning**
   - Set appropriate memory thresholds for your environment
   - Configure container memory limits properly
   - Enable paging at appropriate thresholds

3. **Architectural Improvements**
   - Use current classic queues, quorum queues, or streams for large backlogs
   - Implement message TTLs and queue size limits
   - Use backpressure mechanisms in producers

4. **Monitoring**
   - Set up alerts before memory alarm triggers
   - Monitor queue depth and message rates
   - Track memory usage by category

By implementing these practices, you can maintain stable RabbitMQ operations and prevent memory-related service disruptions.
