# How to Implement Redis Sentinel Automatic Failover

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Sentinel, High Availability, Failover

Description: Configure Redis Sentinel for automatic failover with master detection, replica promotion, and client notification for high availability.

---

## Introduction

Redis Sentinel provides high availability for Redis deployments. When your master node fails, Sentinel detects the failure, promotes a replica to master, and reconfigures other replicas to use the new master. This happens automatically without human intervention.

This guide walks through setting up a production-ready Sentinel cluster with three Sentinel nodes monitoring one master and two replicas.

## Sentinel Architecture Overview

A typical Sentinel deployment consists of:

- One Redis master handling all write operations
- Two or more Redis replicas receiving data from the master
- Three or more Sentinel processes monitoring the Redis instances

Here is the architecture diagram:

```
                    +-------------------+
                    |   Application     |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
      +-------v------+ +-----v------+ +-----v------+
      | Sentinel 1   | | Sentinel 2 | | Sentinel 3 |
      | Port 26379   | | Port 26380 | | Port 26381 |
      +-------+------+ +-----+------+ +-----+------+
              |              |              |
              +--------------+--------------+
                             |
              +--------------+--------------+
              |              |              |
      +-------v------+ +-----v------+ +-----v------+
      | Redis Master | | Replica 1  | | Replica 2  |
      | Port 6379    | | Port 6380  | | Port 6381  |
      +--------------+ +------------+ +------------+
```

### Why Three Sentinels?

The number three comes from distributed systems consensus requirements. With three Sentinels and a quorum of two, you can tolerate one Sentinel failure while still reaching agreement on failover decisions.

| Sentinel Count | Quorum | Failures Tolerated | Recommended |
|---------------|--------|-------------------|-------------|
| 1             | 1      | 0                 | No          |
| 2             | 2      | 0                 | No          |
| 3             | 2      | 1                 | Yes         |
| 5             | 3      | 2                 | Yes         |
| 7             | 4      | 3                 | Yes         |

## Setting Up Redis Master and Replicas

### Master Configuration (redis-master.conf)

Create the master configuration file with settings optimized for replication:

```conf
# Network binding - bind to all interfaces for cluster communication
bind 0.0.0.0

# Default Redis port for master
port 6379

# Run as background daemon
daemonize yes

# Process ID file location
pidfile /var/run/redis/redis-master.pid

# Log file for debugging and monitoring
logfile /var/log/redis/redis-master.log

# Data directory for persistence
dir /var/lib/redis/master

# Enable AOF persistence for durability
appendonly yes

# fsync policy - everysec balances performance and durability
appendfsync everysec

# RDB snapshot settings - save after 900 seconds if at least 1 key changed
save 900 1
save 300 10
save 60 10000

# Password for client connections
requirepass your_redis_password

# Password for replica authentication
masterauth your_redis_password

# Minimum replicas that must acknowledge writes
min-replicas-to-write 1

# Maximum lag in seconds for replica acknowledgment
min-replicas-max-lag 10

# Memory limit - adjust based on your server capacity
maxmemory 4gb

# Eviction policy when memory limit is reached
maxmemory-policy volatile-lru

# TCP keepalive for connection health
tcp-keepalive 300

# Timeout for idle connections (0 means no timeout)
timeout 0

# Replication backlog size - larger values help replicas recover after disconnects
repl-backlog-size 64mb

# Time to keep backlog after all replicas disconnect
repl-backlog-ttl 3600
```

### Replica Configuration (redis-replica-1.conf)

Configure the first replica to connect to the master:

```conf
# Network binding
bind 0.0.0.0

# Different port for each replica on the same machine
port 6380

# Run as daemon
daemonize yes

# Unique PID file
pidfile /var/run/redis/redis-replica-1.pid

# Separate log file
logfile /var/log/redis/redis-replica-1.log

# Separate data directory
dir /var/lib/redis/replica-1

# Enable AOF persistence
appendonly yes
appendfsync everysec

# RDB snapshots
save 900 1
save 300 10
save 60 10000

# Authentication password
requirepass your_redis_password

# Password to authenticate with master
masterauth your_redis_password

# Define the master server - Sentinel will update this during failover
replicaof 192.168.1.10 6379

# Priority for master election - lower values have higher priority
# Set to 0 to prevent this replica from becoming master
replica-priority 100

# Make replica read-only
replica-read-only yes

# Serve stale data when disconnected from master
replica-serve-stale-data yes

# Memory settings
maxmemory 4gb
maxmemory-policy volatile-lru

# Connection settings
tcp-keepalive 300
timeout 0

# Diskless replication - faster for slow disks
repl-diskless-sync yes
repl-diskless-sync-delay 5
```

### Replica Configuration (redis-replica-2.conf)

Configure the second replica with different port and directories:

```conf
bind 0.0.0.0
port 6381
daemonize yes
pidfile /var/run/redis/redis-replica-2.pid
logfile /var/log/redis/redis-replica-2.log
dir /var/lib/redis/replica-2

appendonly yes
appendfsync everysec

save 900 1
save 300 10
save 60 10000

requirepass your_redis_password
masterauth your_redis_password

# Points to same master - Sentinel manages this
replicaof 192.168.1.10 6379

# Higher priority means lower chance of becoming master
replica-priority 101

replica-read-only yes
replica-serve-stale-data yes

maxmemory 4gb
maxmemory-policy volatile-lru

tcp-keepalive 300
timeout 0

repl-diskless-sync yes
repl-diskless-sync-delay 5
```

## Sentinel Configuration

### Primary Sentinel Configuration (sentinel-1.conf)

Create the main Sentinel configuration with detailed comments:

```conf
# Sentinel default port
port 26379

# Run as daemon in production
daemonize yes

# PID file location
pidfile /var/run/redis/sentinel-1.pid

# Log file for Sentinel operations
logfile /var/log/redis/sentinel-1.log

# Working directory
dir /var/lib/redis/sentinel-1

# Monitor the master named "mymaster" at given IP and port
# The last number (2) is the quorum - minimum Sentinels needed to agree on failover
sentinel monitor mymaster 192.168.1.10 6379 2

# Password to connect to Redis instances
sentinel auth-pass mymaster your_redis_password

# Time in milliseconds after which master is considered down (SDOWN)
# 30 seconds is reasonable for most deployments
sentinel down-after-milliseconds mymaster 30000

# Number of replicas that can sync with new master simultaneously
# Higher values speed up failover but increase network/disk load
sentinel parallel-syncs mymaster 1

# Failover timeout in milliseconds
# This covers the entire failover process including:
# - Time to start failover after previous attempt
# - Time for replica to replicate from new master
# - Time for sentinel to reconfigure
sentinel failover-timeout mymaster 180000

# Notification script - called on sentinel events
# sentinel notification-script mymaster /opt/redis/notify.sh

# Client reconfiguration script - called when master changes
# sentinel client-reconfig-script mymaster /opt/redis/reconfig.sh

# Deny scripts from being changed at runtime
sentinel deny-scripts-reconfig yes

# Announce IP for NAT environments
# sentinel announce-ip 192.168.1.20

# Announce port for NAT environments
# sentinel announce-port 26379

# Minimum time between logging identical messages
sentinel log-level notice

# Resolve hostname support
sentinel resolve-hostnames no

# Use hostname in announcements
sentinel announce-hostnames no
```

### Second Sentinel Configuration (sentinel-2.conf)

```conf
port 26380
daemonize yes
pidfile /var/run/redis/sentinel-2.pid
logfile /var/log/redis/sentinel-2.log
dir /var/lib/redis/sentinel-2

sentinel monitor mymaster 192.168.1.10 6379 2
sentinel auth-pass mymaster your_redis_password
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
sentinel deny-scripts-reconfig yes
```

### Third Sentinel Configuration (sentinel-3.conf)

```conf
port 26381
daemonize yes
pidfile /var/run/redis/sentinel-3.pid
logfile /var/log/redis/sentinel-3.log
dir /var/lib/redis/sentinel-3

sentinel monitor mymaster 192.168.1.10 6379 2
sentinel auth-pass mymaster your_redis_password
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
sentinel deny-scripts-reconfig yes
```

## Understanding Quorum and Failover Process

### Quorum Explained

The quorum value determines how many Sentinels must agree that the master is unreachable before starting failover. This prevents false positives from network partitions.

| Term | Description |
|------|-------------|
| SDOWN | Subjective Down - A single Sentinel thinks the master is down |
| ODOWN | Objective Down - Quorum number of Sentinels agree master is down |
| Quorum | Minimum Sentinels needed to agree on ODOWN state |
| Majority | Sentinels needed to authorize and execute failover |

### Failover Process Step by Step

```
1. Master fails or becomes unreachable
           |
           v
2. Sentinel detects no response to PING
           |
           v
3. After down-after-milliseconds, Sentinel marks master as SDOWN
           |
           v
4. Sentinel asks other Sentinels to confirm
           |
           v
5. If quorum Sentinels agree, master is marked ODOWN
           |
           v
6. Sentinels vote for a leader to handle failover
           |
           v
7. Leader Sentinel selects best replica based on:
   - replica-priority (lower is better, 0 means never promote)
   - Replication offset (more data is better)
   - Run ID (lexicographically smaller as tiebreaker)
           |
           v
8. Leader promotes selected replica to master
           |
           v
9. Other replicas are reconfigured to replicate from new master
           |
           v
10. Old master is reconfigured as replica when it comes back
```

### Replica Selection Criteria

Sentinels evaluate replicas using these criteria in order:

```python
# Pseudo-code showing replica selection logic
def select_best_replica(replicas):
    # Filter out disconnected replicas
    candidates = [r for r in replicas if r.is_connected]

    # Filter out replicas with priority 0
    candidates = [r for r in candidates if r.priority > 0]

    # Filter out replicas with too much lag
    candidates = [r for r in candidates if r.lag_seconds < 10]

    # Sort by priority (ascending), then by replication offset (descending)
    candidates.sort(key=lambda r: (r.priority, -r.replication_offset))

    return candidates[0] if candidates else None
```

## Starting the Cluster

### Create Required Directories

Set up the directory structure before starting services:

```bash
#!/bin/bash

# Create directories for Redis master
mkdir -p /var/lib/redis/master
mkdir -p /var/run/redis
mkdir -p /var/log/redis

# Create directories for replicas
mkdir -p /var/lib/redis/replica-1
mkdir -p /var/lib/redis/replica-2

# Create directories for Sentinels
mkdir -p /var/lib/redis/sentinel-1
mkdir -p /var/lib/redis/sentinel-2
mkdir -p /var/lib/redis/sentinel-3

# Set proper ownership
chown -R redis:redis /var/lib/redis
chown -R redis:redis /var/run/redis
chown -R redis:redis /var/log/redis
```

### Start Redis Instances

Start the master first, then replicas:

```bash
#!/bin/bash

# Start Redis master
redis-server /etc/redis/redis-master.conf

# Wait for master to be ready
sleep 2

# Verify master is running
redis-cli -p 6379 -a your_redis_password ping

# Start replica 1
redis-server /etc/redis/redis-replica-1.conf

# Start replica 2
redis-server /etc/redis/redis-replica-2.conf

# Wait for replicas to connect
sleep 2

# Verify replication status
redis-cli -p 6379 -a your_redis_password info replication
```

### Start Sentinel Instances

Start Sentinels after Redis instances are running:

```bash
#!/bin/bash

# Start all three Sentinels
redis-sentinel /etc/redis/sentinel-1.conf
redis-sentinel /etc/redis/sentinel-2.conf
redis-sentinel /etc/redis/sentinel-3.conf

# Wait for Sentinels to discover each other
sleep 5

# Check Sentinel status
redis-cli -p 26379 sentinel master mymaster
```

## Client Connection and Discovery

### Sentinel-Aware Connection in Python

Use the redis-py library with Sentinel support for automatic failover handling:

```python
from redis.sentinel import Sentinel
import time

# Define Sentinel nodes
sentinel_nodes = [
    ('192.168.1.20', 26379),
    ('192.168.1.21', 26380),
    ('192.168.1.22', 26381),
]

# Create Sentinel connection
sentinel = Sentinel(
    sentinel_nodes,
    socket_timeout=0.5,
    password='your_redis_password',
    sentinel_kwargs={'password': 'your_redis_password'}
)

# Get master address - Sentinel returns current master
master_address = sentinel.discover_master('mymaster')
print(f"Current master: {master_address}")

# Get replica addresses
replica_addresses = sentinel.discover_slaves('mymaster')
print(f"Current replicas: {replica_addresses}")

# Get a connection to the master for writes
master = sentinel.master_for(
    'mymaster',
    socket_timeout=0.5,
    password='your_redis_password',
    retry_on_timeout=True
)

# Get a connection to replicas for reads
replica = sentinel.slave_for(
    'mymaster',
    socket_timeout=0.5,
    password='your_redis_password'
)

# Write to master
master.set('key1', 'value1')

# Read from replica (eventually consistent)
time.sleep(0.1)  # Allow replication lag
value = replica.get('key1')
print(f"Value from replica: {value}")
```

### Sentinel-Aware Connection in Node.js

Using ioredis for Node.js applications:

```javascript
const Redis = require('ioredis');

// Configure Sentinel connection
const redis = new Redis({
    sentinels: [
        { host: '192.168.1.20', port: 26379 },
        { host: '192.168.1.21', port: 26380 },
        { host: '192.168.1.22', port: 26381 }
    ],
    name: 'mymaster',
    password: 'your_redis_password',
    sentinelPassword: 'your_redis_password',
    // Retry strategy for reconnection
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    // Enable read from replicas
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
});

// Event handlers for failover awareness
redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('ready', () => {
    console.log('Redis connection ready');
});

redis.on('error', (err) => {
    console.error('Redis error:', err.message);
});

redis.on('+switch-master', (name, oldMaster, newMaster) => {
    console.log(`Master switched from ${oldMaster} to ${newMaster}`);
});

// Usage example
async function example() {
    await redis.set('key1', 'value1');
    const value = await redis.get('key1');
    console.log('Retrieved value:', value);
}

example().catch(console.error);
```

### Sentinel-Aware Connection in Go

Using go-redis with Sentinel support:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Create Sentinel client
    rdb := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            "192.168.1.20:26379",
            "192.168.1.21:26380",
            "192.168.1.22:26381",
        },
        Password:         "your_redis_password",
        SentinelPassword: "your_redis_password",

        // Connection pool settings
        PoolSize:     10,
        MinIdleConns: 5,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,

        // Retry settings
        MaxRetries:      3,
        MinRetryBackoff: 8 * time.Millisecond,
        MaxRetryBackoff: 512 * time.Millisecond,
    })
    defer rdb.Close()

    // Test connection
    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Connected:", pong)

    // Write and read
    err = rdb.Set(ctx, "key1", "value1", 0).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "key1").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Value:", val)
}
```

## Monitoring Sentinel

### Command Line Monitoring

Use redis-cli to interact with Sentinel:

```bash
# Connect to Sentinel
redis-cli -p 26379

# Get master information
SENTINEL master mymaster

# Get replica information
SENTINEL replicas mymaster

# Get other Sentinel information
SENTINEL sentinels mymaster

# Get current master address
SENTINEL get-master-addr-by-name mymaster

# Check if master is in ODOWN state
SENTINEL ckquorum mymaster

# Force a failover (for testing)
SENTINEL failover mymaster

# Reset Sentinel state for a master
SENTINEL reset mymaster

# Get pending scripts
SENTINEL pending-scripts
```

### Monitoring Script

Create a monitoring script for production use:

```bash
#!/bin/bash

# Sentinel monitoring script
# Run periodically via cron or systemd timer

SENTINEL_HOST="localhost"
SENTINEL_PORT="26379"
MASTER_NAME="mymaster"
ALERT_EMAIL="ops@example.com"

# Function to query Sentinel
sentinel_cmd() {
    redis-cli -h $SENTINEL_HOST -p $SENTINEL_PORT $@
}

# Check if Sentinel is responding
if ! sentinel_cmd ping > /dev/null 2>&1; then
    echo "CRITICAL: Sentinel not responding on $SENTINEL_HOST:$SENTINEL_PORT"
    exit 2
fi

# Get master status
MASTER_INFO=$(sentinel_cmd sentinel master $MASTER_NAME)

# Extract flags
FLAGS=$(echo "$MASTER_INFO" | grep -A1 "^flags$" | tail -1)

# Check for ODOWN or SDOWN
if echo "$FLAGS" | grep -q "o_down\|s_down"; then
    echo "CRITICAL: Master $MASTER_NAME is DOWN - Flags: $FLAGS"
    exit 2
fi

# Get number of connected replicas
NUM_REPLICAS=$(echo "$MASTER_INFO" | grep -A1 "^num-slaves$" | tail -1)

if [ "$NUM_REPLICAS" -lt 2 ]; then
    echo "WARNING: Only $NUM_REPLICAS replicas connected to master"
    exit 1
fi

# Get number of Sentinels
NUM_SENTINELS=$(echo "$MASTER_INFO" | grep -A1 "^num-other-sentinels$" | tail -1)

if [ "$NUM_SENTINELS" -lt 2 ]; then
    echo "WARNING: Only $((NUM_SENTINELS + 1)) Sentinels in quorum"
    exit 1
fi

# Check quorum
QUORUM_CHECK=$(sentinel_cmd sentinel ckquorum $MASTER_NAME)

if ! echo "$QUORUM_CHECK" | grep -q "OK"; then
    echo "CRITICAL: Quorum check failed - $QUORUM_CHECK"
    exit 2
fi

echo "OK: Master $MASTER_NAME is healthy with $NUM_REPLICAS replicas and $((NUM_SENTINELS + 1)) Sentinels"
exit 0
```

### Prometheus Metrics

Export Sentinel metrics for Prometheus monitoring:

```yaml
# prometheus.yml - Add this scrape config
scrape_configs:
  - job_name: 'redis-sentinel'
    static_configs:
      - targets:
        - '192.168.1.20:9121'
        - '192.168.1.21:9121'
        - '192.168.1.22:9121'
```

Use the redis_exporter with Sentinel support:

```bash
# Run redis_exporter for Sentinel metrics
redis_exporter \
    --redis.addr=redis://localhost:26379 \
    --redis.password=your_redis_password \
    --is-sentinel
```

## Split-Brain Prevention

Split-brain occurs when network partitions cause multiple masters to exist simultaneously. This leads to data inconsistency and potential data loss.

### Prevention Strategy 1 - Minimum Replicas

Configure the master to reject writes when isolated:

```conf
# In redis-master.conf

# Require at least 1 replica to acknowledge writes
min-replicas-to-write 1

# Replica must respond within 10 seconds
min-replicas-max-lag 10
```

This ensures the master stops accepting writes if it cannot reach any replica, preventing writes to a partitioned master.

### Prevention Strategy 2 - Proper Quorum Configuration

| Sentinels | Minimum Quorum | Recommended Quorum |
|-----------|---------------|-------------------|
| 3         | 2             | 2                 |
| 5         | 3             | 3                 |
| 7         | 4             | 4                 |

Always set quorum to at least (N/2) + 1 where N is the number of Sentinels.

### Prevention Strategy 3 - Network Topology

Deploy Sentinels across different failure domains:

```
Availability Zone A          Availability Zone B          Availability Zone C
+------------------+        +------------------+        +------------------+
| Redis Master     |        | Redis Replica 1  |        | Redis Replica 2  |
| Sentinel 1       |        | Sentinel 2       |        | Sentinel 3       |
+------------------+        +------------------+        +------------------+
```

This topology ensures that a single zone failure cannot cause split-brain because the quorum cannot be reached in the isolated zone.

### Prevention Strategy 4 - Client-Side Validation

Implement client-side checks after writes:

```python
import time
from redis.sentinel import Sentinel

def safe_write(sentinel, master_name, key, value, password):
    """
    Write with split-brain protection.
    Verifies the master is still authoritative after write.
    """
    master = sentinel.master_for(
        master_name,
        password=password,
        socket_timeout=1.0
    )

    # Perform write
    master.set(key, value)

    # Small delay for replication
    time.sleep(0.05)

    # Verify master has not changed
    current_master = sentinel.discover_master(master_name)
    master_info = master.info('replication')

    if master_info['role'] != 'master':
        raise Exception("Write may have gone to a demoted master")

    if master_info['connected_slaves'] < 1:
        raise Exception("Master is isolated - write may be lost")

    return True
```

## Failover Notification Scripts

### Email Notification Script

Create a script that Sentinel calls during state changes:

```bash
#!/bin/bash
# /opt/redis/notify.sh
# Sentinel notification script

EVENT_TYPE=$1
EVENT_DESCRIPTION=$2

LOG_FILE="/var/log/redis/sentinel-events.log"
ALERT_EMAIL="ops@example.com"

# Log the event
echo "$(date '+%Y-%m-%d %H:%M:%S') - $EVENT_TYPE - $EVENT_DESCRIPTION" >> $LOG_FILE

# Send email for critical events
case $EVENT_TYPE in
    "+odown"|"-odown"|"+switch-master"|"+sdown"|"-sdown")
        echo "Redis Sentinel Event: $EVENT_TYPE

Description: $EVENT_DESCRIPTION

Time: $(date)

Please check the Redis cluster status." | mail -s "Redis Alert: $EVENT_TYPE" $ALERT_EMAIL
        ;;
esac

exit 0
```

### Slack Notification Script

Send alerts to Slack for team visibility:

```bash
#!/bin/bash
# /opt/redis/slack-notify.sh

EVENT_TYPE=$1
EVENT_DESCRIPTION=$2

SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Color based on event type
case $EVENT_TYPE in
    "+odown"|"+sdown")
        COLOR="danger"
        ;;
    "-odown"|"-sdown")
        COLOR="good"
        ;;
    "+switch-master")
        COLOR="warning"
        ;;
    *)
        COLOR="#439FE0"
        ;;
esac

# Send to Slack
curl -s -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-type: application/json' \
    --data "{
        \"attachments\": [{
            \"color\": \"$COLOR\",
            \"title\": \"Redis Sentinel Alert\",
            \"fields\": [
                {\"title\": \"Event\", \"value\": \"$EVENT_TYPE\", \"short\": true},
                {\"title\": \"Description\", \"value\": \"$EVENT_DESCRIPTION\", \"short\": false}
            ],
            \"footer\": \"Sentinel Notification\",
            \"ts\": $(date +%s)
        }]
    }"

exit 0
```

## Testing Failover

### Manual Failover Test

Test failover without killing the master:

```bash
#!/bin/bash

echo "=== Starting Failover Test ==="

# Get current master
echo "Current master:"
redis-cli -p 26379 sentinel get-master-addr-by-name mymaster

# Trigger failover
echo "Triggering failover..."
redis-cli -p 26379 sentinel failover mymaster

# Wait for failover to complete
sleep 10

# Get new master
echo "New master:"
redis-cli -p 26379 sentinel get-master-addr-by-name mymaster

echo "=== Failover Test Complete ==="
```

### Chaos Testing Script

Simulate real failures for thorough testing:

```bash
#!/bin/bash

# Chaos testing script for Redis Sentinel
# WARNING: Run only in test environments

MASTER_PID=$(cat /var/run/redis/redis-master.pid)
TEST_DURATION=300  # 5 minutes

echo "Starting chaos test for $TEST_DURATION seconds"

END_TIME=$(($(date +%s) + TEST_DURATION))

while [ $(date +%s) -lt $END_TIME ]; do
    # Random delay between 30-60 seconds
    DELAY=$((30 + RANDOM % 30))
    sleep $DELAY

    # Get current master
    CURRENT_MASTER=$(redis-cli -p 26379 sentinel get-master-addr-by-name mymaster)
    echo "Current master: $CURRENT_MASTER"

    # Simulate random failure
    FAILURE_TYPE=$((RANDOM % 3))

    case $FAILURE_TYPE in
        0)
            echo "Simulating network partition (5 seconds)..."
            iptables -A INPUT -p tcp --dport 6379 -j DROP
            sleep 5
            iptables -D INPUT -p tcp --dport 6379 -j DROP
            ;;
        1)
            echo "Simulating process pause (5 seconds)..."
            kill -STOP $MASTER_PID
            sleep 5
            kill -CONT $MASTER_PID
            ;;
        2)
            echo "Simulating high latency..."
            tc qdisc add dev eth0 root netem delay 500ms
            sleep 5
            tc qdisc del dev eth0 root netem
            ;;
    esac

    # Wait and check status
    sleep 15

    NEW_MASTER=$(redis-cli -p 26379 sentinel get-master-addr-by-name mymaster)
    echo "Master after test: $NEW_MASTER"

    if [ "$CURRENT_MASTER" != "$NEW_MASTER" ]; then
        echo "Failover occurred!"
    fi
done

echo "Chaos test complete"
```

## Production Checklist

Before deploying Sentinel to production, verify these items:

### Configuration Checklist

| Item | Status | Notes |
|------|--------|-------|
| Quorum set to (N/2)+1 | [ ] | Prevents split-brain |
| min-replicas-to-write configured | [ ] | Master isolation protection |
| Passwords set on all instances | [ ] | Security requirement |
| Separate data directories | [ ] | Prevents data corruption |
| AOF persistence enabled | [ ] | Durability requirement |
| Notification scripts configured | [ ] | Alerting requirement |
| Logs configured and rotating | [ ] | Operational requirement |

### Network Checklist

| Item | Status | Notes |
|------|--------|-------|
| Sentinels in different AZs | [ ] | Fault tolerance |
| Firewall allows Sentinel ports | [ ] | 26379-26381 |
| Firewall allows Redis ports | [ ] | 6379-6381 |
| Low latency between nodes | [ ] | Under 10ms recommended |
| DNS or static IPs configured | [ ] | Stable addressing |

### Monitoring Checklist

| Item | Status | Notes |
|------|--------|-------|
| Sentinel process monitoring | [ ] | Restart on failure |
| Master status monitoring | [ ] | Alert on ODOWN |
| Replica lag monitoring | [ ] | Alert on high lag |
| Memory usage monitoring | [ ] | Alert before OOM |
| Disk space monitoring | [ ] | AOF file growth |

## Troubleshooting Common Issues

### Sentinel Cannot Reach Master

```bash
# Check network connectivity
redis-cli -h 192.168.1.10 -p 6379 -a your_redis_password ping

# Check Sentinel logs
tail -f /var/log/redis/sentinel-1.log

# Verify password configuration
redis-cli -p 26379 sentinel master mymaster | grep -A1 "auth-pass"
```

### Failover Not Triggering

```bash
# Check if quorum can be reached
redis-cli -p 26379 sentinel ckquorum mymaster

# Check how many Sentinels see the master as down
redis-cli -p 26379 sentinel master mymaster | grep -A1 "num-other-sentinels"

# Check down-after-milliseconds value
redis-cli -p 26379 sentinel master mymaster | grep -A1 "down-after"
```

### Replica Not Syncing After Failover

```bash
# Check replica status
redis-cli -p 6380 -a your_redis_password info replication

# Check if replica can reach new master
redis-cli -p 6380 -a your_redis_password debug sleep 0

# Force re-sync
redis-cli -p 6380 -a your_redis_password replicaof 192.168.1.11 6379
```

## Conclusion

Redis Sentinel provides a robust solution for automatic failover in Redis deployments. The key points to remember are:

1. Deploy at least three Sentinels across different failure domains
2. Set quorum to majority value to prevent split-brain
3. Configure min-replicas-to-write on the master for isolation protection
4. Use Sentinel-aware clients that can handle master address changes
5. Monitor Sentinel health and set up alerting for critical events
6. Test failover regularly in non-production environments

With proper configuration and monitoring, Sentinel can maintain Redis availability through hardware failures, network issues, and planned maintenance windows.
