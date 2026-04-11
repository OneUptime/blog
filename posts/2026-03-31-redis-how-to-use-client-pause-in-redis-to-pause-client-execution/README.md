# How to Use CLIENT PAUSE in Redis to Pause Client Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Administration, Replication, Command

Description: Learn how to use CLIENT PAUSE in Redis to temporarily halt client command processing, useful for maintenance windows, replica promotion, and coordinated failovers.

---

## What Is CLIENT PAUSE

`CLIENT PAUSE` suspends processing of commands from all clients for a specified number of milliseconds. During the pause, the server stops accepting and processing client commands while continuing internal operations like replication and persistence. This is useful for controlled maintenance operations.

```text
CLIENT PAUSE timeout [WRITE | ALL]
```

- `timeout` - pause duration in milliseconds
- `WRITE` - pause only write commands; reads still work (available since Redis 6.2)
- `ALL` (default) - pause all client commands including reads

Returns `OK` immediately, then pauses command processing.

## Basic Usage

```bash
# Pause all clients for 5 seconds
CLIENT PAUSE 5000

# Pause only write commands for 3 seconds
CLIENT PAUSE 3000 WRITE

# Pause all commands for 10 seconds
CLIENT PAUSE 10000 ALL
```

## WRITE vs ALL Mode

**WRITE mode** (recommended for most cases):
- Read commands (`GET`, `HGET`, etc.) continue to work
- Write commands (`SET`, `DEL`, `LPUSH`, etc.) are blocked
- Useful for replica promotion where you want reads to continue

**ALL mode**:
- All client commands are blocked
- The server still processes replication traffic
- Useful for cluster reconfiguration or deep maintenance

## Unpause Early

Use `CLIENT UNPAUSE` to resume command processing before the timeout expires:

```bash
CLIENT UNPAUSE
# OK - clients resume immediately
```

## Practical Use Cases

### Replica Promotion (Zero-Write Window)

```bash
# Pause writes to let replica catch up
CLIENT PAUSE 5000 WRITE

# During this window:
# 1. Replica applies all pending replication
# 2. Replica is promoted to primary
# 3. Application reconnects to new primary
```

### Backup Window

```bash
# Start background save, then pause writes to ensure consistency
BGSAVE
CLIENT PAUSE 30000 WRITE
# Writes are blocked while the snapshot completes
# After maintenance, unpause early if needed
CLIENT UNPAUSE
```

## Practical Example in Python

```python
import redis
import threading
import time

admin_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
app_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def simulate_app_writes():
    """Simulate application writing data."""
    for i in range(10):
        try:
            app_client.set(f'key:{i}', f'value:{i}')
            print(f"Write {i}: success")
        except Exception as e:
            print(f"Write {i}: blocked ({e})")
        time.sleep(0.5)

def perform_maintenance():
    """Pause writes during maintenance."""
    print("Starting maintenance - pausing writes for 3 seconds")
    admin_client.client_pause(3000, all=False)  # WRITE mode
    print("Writes paused - performing maintenance...")
    time.sleep(2)
    admin_client.client_unpause()
    print("Maintenance complete - writes resumed")

# Start app writes in background
app_thread = threading.Thread(target=simulate_app_writes, daemon=True)
app_thread.start()

# Pause during maintenance
time.sleep(1)
perform_maintenance()
app_thread.join(timeout=10)
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const adminClient = createClient();
const appClient = createClient();

await adminClient.connect();
await appClient.connect();

async function pauseForMaintenance(durationMs) {
  console.log(`Pausing write clients for ${durationMs}ms`);

  // Pause write commands
  await adminClient.clientPause(durationMs, { mode: 'WRITE' });

  console.log('Performing maintenance...');
  // Do maintenance work here
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Unpause early if done before timeout
  await adminClient.clientUnpause();
  console.log('Clients unpaused');
}

// Test that reads still work during pause
async function testDuringPause() {
  await appClient.set('test', 'value');

  // Pause writes
  await adminClient.clientPause(5000, { mode: 'WRITE' });

  // Read still works
  const val = await appClient.get('test');
  console.log(`Read during pause: ${val}`); // Works!

  // Write is blocked until timeout or UNPAUSE
  // await appClient.set('new', 'data'); // This would block

  await adminClient.clientUnpause();
}

await pauseForMaintenance(3000);
```

## Monitoring Client State

```bash
# List all connected clients and their states
CLIENT LIST
# Shows id, addr, fd, name, flags, and other fields for each client

# Check server client statistics
INFO CLIENTS
# Shows connected_clients, blocked_clients, and other metrics
```

## Coordinated Failover Script

```bash
#!/bin/bash
# coordinated_failover.sh

PRIMARY="localhost:6379"
REPLICA="localhost:6380"

echo "Step 1: Pause writes on primary"
redis-cli -h localhost -p 6379 CLIENT PAUSE 10000 WRITE

echo "Step 2: Wait for replica to catch up"
sleep 2

echo "Step 3: Verify replica is up to date"
redis-cli -h localhost -p 6380 INFO replication | grep master_last_io_seconds_ago

echo "Step 4: Promote replica"
redis-cli -h localhost -p 6380 REPLICAOF NO ONE

echo "Step 5: Update application to point to new primary"
# ... update DNS/config ...

echo "Step 6: Unpause original primary (now demoted)"
redis-cli -h localhost -p 6379 CLIENT UNPAUSE

echo "Failover complete"
```

## CLIENT PAUSE in Sentinel Mode

When using Redis Sentinel, `CLIENT PAUSE` is also used internally during failovers. You can still use it manually for controlled maintenance:

```python
import redis.sentinel

sentinel = redis.sentinel.Sentinel([('sentinel-host', 26379)], socket_timeout=0.1)
master = sentinel.master_for('mymaster', decode_responses=True)

# Pause before maintenance
master.execute_command('CLIENT', 'PAUSE', '5000', 'WRITE')
print("Writes paused on primary")
```

## Summary

`CLIENT PAUSE` suspends Redis command processing for a specified duration, with `WRITE` mode blocking only write operations while allowing reads, and `ALL` mode blocking everything. Use it for coordinated failovers, maintenance windows, and backup consistency. Combine with `CLIENT UNPAUSE` to resume early when operations complete before the timeout.
