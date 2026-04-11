# How to Use ACL LOG in Redis to Track Access Violations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Monitoring, Access Control

Description: Learn how to use ACL LOG in Redis to view and manage access control violation logs, helping you audit unauthorized command attempts and debug ACL rules.

---

## What Is ACL LOG

`ACL LOG` provides access to a log of ACL security violations - events where a client tried to execute a command, access a key, or subscribe to a channel that their ACL rules do not permit. This is invaluable for security auditing, debugging ACL configurations, and detecting unauthorized access attempts.

```text
ACL LOG [count | RESET]
```

- No arguments: return the full log (up to `acllog-max-len` entries)
- `count` - return the last N entries
- `RESET` - clear the ACL log

## Enabling ACL Logging

ACL logging is enabled by default in Redis 6.0+. Configure the maximum log size:

```bash
CONFIG SET acllog-max-len 128
```

Or in `redis.conf`:

```text
acllog-max-len 128
```

## Triggering a Violation (for Testing)

```bash
# Create a restricted user
ACL SETUSER restricted_user on >password ~data:* +@read

# Authenticate as restricted_user
AUTH restricted_user password

# Try to access a forbidden key
GET admin:secret
# NOPERM this user has no permissions to access one of the keys used as arguments

# Try a forbidden command
FLUSHALL
# NOPERM this user has no permissions to run the 'flushall' command
```

## Reading the ACL Log

```bash
ACL LOG
```

Each log entry contains:

```text
1) 1) "count"
   2) (integer) 1
   3) "reason"
   4) "command"
   5) "context"
   6) "toplevel"
   7) "object"
   8) "flushall"
   9) "username"
   10) "restricted_user"
   11) "age-seconds"
   12) "3.14"
   13) "client-info"
   14) "id=5 addr=127.0.0.1:54321 ..."
   15) "entry-id"
   16) (integer) 1
   17) "timestamp-created"
   18) (integer) 1711900000
   19) "timestamp-last-updated"
   20) (integer) 1711900003
```

## Log Entry Fields

| Field | Description |
|-------|-------------|
| `count` | How many times this violation was triggered |
| `reason` | `auth`, `command`, `key`, or `channel` |
| `context` | `toplevel`, `multi`, `lua`, or `module` |
| `object` | The specific command/key/channel denied |
| `username` | The ACL username that triggered the violation |
| `age-seconds` | How long ago this was first logged |
| `client-info` | Client connection details |
| `entry-id` | Unique entry identifier (Redis 7.2+) |
| `timestamp-created` | When the entry was first created (Redis 7.2+) |
| `timestamp-last-updated` | When the entry was last updated (Redis 7.2+) |

## Reading Last N Entries

```bash
# Get last 5 violations
ACL LOG 5
```

## Clearing the Log

```bash
ACL LOG RESET
# OK
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set up a test user with restricted permissions
client.acl_setuser('test_user',
    enabled=True,
    passwords=['+mypassword'],
    keys=['data:*'],
    categories=['+@read']
)

# Create a restricted connection
restricted = redis.Redis(
    host='localhost',
    port=6379,
    username='test_user',
    password='mypassword',
    decode_responses=True
)

# Trigger violations
try:
    restricted.flushall()
except redis.ResponseError as e:
    print(f"Expected violation: {e}")

try:
    restricted.get('admin:secret')
except redis.ResponseError as e:
    print(f"Key violation: {e}")

# Read the ACL log as admin
log = client.acl_log()
print(f"\nACL violations ({len(log)} entries):")
for entry in log:
    print(f"  User: {entry['username']}")
    print(f"  Reason: {entry['reason']}")
    print(f"  Object: {entry['object']}")
    print(f"  Count: {entry['count']}")
    print(f"  Age: {entry['age-seconds']:.1f}s ago")
    print()

# Clear the log
client.acl_log_reset()
print("ACL log cleared")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const adminClient = createClient();
await adminClient.connect();

// Set up a restricted user
await adminClient.aclSetUser('limited_user', [
  'on',
  '>secretpass',
  '~cache:*',
  '+@read'
]);

// Create restricted connection
const limitedClient = createClient({
  username: 'limited_user',
  password: 'secretpass'
});
await limitedClient.connect();

// Trigger violations
try {
  await limitedClient.set('admin:key', 'value');
} catch (e) {
  console.log('Violation triggered:', e.message);
}

// Read the log
const log = await adminClient.aclLog();
console.log(`\n${log.length} violation(s) logged:`);
for (const entry of log) {
  console.log(`  [${entry.reason}] ${entry.username} tried ${entry.object}`);
}

// Reset log
await adminClient.aclLogReset();
console.log('Log cleared');
```

## Monitoring ACL Violations in Production

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def monitor_acl_violations(interval_seconds=60, alert_threshold=10):
    """Monitor ACL violations and alert on spikes."""
    while True:
        log = client.acl_log()

        if len(log) >= alert_threshold:
            print(f"ALERT: {len(log)} ACL violations detected!")

            # Group by user
            by_user = {}
            for entry in log:
                username = entry['username']
                by_user[username] = by_user.get(username, 0) + entry['count']

            for user, count in sorted(by_user.items(), key=lambda x: -x[1]):
                print(f"  {user}: {count} violation(s)")

        # Reset after reading
        client.acl_log_reset()

        time.sleep(interval_seconds)

# Run monitor
# monitor_acl_violations()
```

## Configuring Log Size

```bash
# Check current setting
CONFIG GET acllog-max-len

# Increase for more retention
CONFIG SET acllog-max-len 256
```

When the log is full, older entries are evicted automatically.

## Summary

`ACL LOG` records and exposes Redis ACL violation events - unauthorized command, key, and channel access attempts. Use it to audit user behavior, debug ACL rule configurations, and detect potential security threats. Combine regular log monitoring with `ACL LOG RESET` to maintain a rolling window of recent violations in production.
