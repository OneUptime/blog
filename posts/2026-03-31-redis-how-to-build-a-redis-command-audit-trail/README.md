# How to Build a Redis Command Audit Trail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Audit, Security, Logging, Monitoring, ACL

Description: Build a Redis command audit trail using ACL logging, keyspace notifications, and custom middleware to track who ran what commands and when for security and compliance.

---

## Why Audit Redis Commands

An audit trail is important for:
- **Security** - detecting unauthorized access or suspicious command patterns
- **Compliance** - meeting requirements like SOC 2, HIPAA, or PCI-DSS
- **Debugging** - understanding what caused data changes
- **Capacity planning** - analyzing command patterns

Redis provides several built-in mechanisms for auditing, supplemented by application-level logging.

## Method 1 - Redis ACL Log (Redis 6+)

Redis 6 introduced the `ACL LOG` command that records access control violations and authentication events:

### Enable ACL Logging

```text
# redis.conf
acllog-max-len 256
```

Or at runtime:

```bash
redis-cli CONFIG SET acllog-max-len 512
```

### Configure ACL Users with Restrictions

```bash
# Create a user that can only read and only access specific keys
redis-cli ACL SETUSER readonly-user on >password123 ~app:* +@read +@connection

# Create an admin user with full access
redis-cli ACL SETUSER admin-user on >adminpass ~* +@all

# Save ACL to file
redis-cli ACL SAVE
```

### View the ACL Log

```bash
redis-cli ACL LOG
```

Output shows violations:

```text
1) 1) "count"
   2) (integer) 5
   3) "reason"
   4) "command"
   5) "context"
   6) "toplevel"
   7) "object"
   8) "set"
   9) "username"
   10) "readonly-user"
   11) "age-seconds"
   12) "12.567"
   13) "client-info"
   14) "id=123 addr=10.0.0.5:54321 cmd=set"
```

### Clear the ACL Log

```bash
redis-cli ACL LOG RESET
```

### Poll ACL Log in Python

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def poll_acl_log(interval=60):
    while True:
        log_entries = r.execute_command('ACL', 'LOG')
        for entry in log_entries:
            # entry is a list of key-value pairs
            entry_dict = dict(zip(entry[::2], entry[1::2]))
            print(json.dumps({
                'timestamp': time.time(),
                'username': entry_dict.get('username'),
                'command': entry_dict.get('object'),
                'reason': entry_dict.get('reason'),
                'client': entry_dict.get('client-info'),
                'count': entry_dict.get('count')
            }))
        r.execute_command('ACL', 'LOG', 'RESET')
        time.sleep(interval)
```

## Method 2 - Redis MONITOR Command

`MONITOR` streams every command received by Redis in real-time. Use it for short-term auditing and debugging:

```bash
redis-cli MONITOR
```

Output:

```text
1743417600.123456 [0 10.0.0.5:54321] "SET" "user:100" "alice"
1743417600.234567 [0 10.0.0.6:54322] "GET" "user:100"
1743417600.345678 [0 10.0.0.7:54323] "DEL" "session:abc"
```

### Capture MONITOR Output to a File

```bash
redis-cli MONITOR | tee /tmp/redis-audit-$(date +%Y%m%d).log &
```

Or filter by specific command patterns:

```bash
redis-cli MONITOR | grep -E "(SET|DEL|EXPIRE|RENAME)" | tee /tmp/redis-writes.log &
```

**Warning**: MONITOR has a significant performance impact. Avoid using it in production for extended periods. A single MONITOR client can reduce throughput by more than 50%.

## Method 3 - Keyspace Notifications for Change Tracking

Keyspace notifications emit events to Pub/Sub channels when keys change:

```bash
# Enable notifications for key events and generic events
redis-cli CONFIG SET notify-keyspace-events KEA
```

Notification flags:
- `K` - Keyspace events (published in `__keyspace@N__` channel)
- `E` - Keyevent events (published in `__keyevent@N__` channel)
- `A` - All commands alias (`g$lszhxetd`)
- `g` - Generic commands (DEL, EXPIRE, RENAME, etc.)
- `$` - String commands
- `l` - List commands

Subscribe to events:

```bash
redis-cli PSUBSCRIBE "__key*__:*"
```

### Processing Keyspace Events in Python

```python
import redis
import json
import time

r = redis.Redis()

def audit_keyspace_events():
    pubsub = r.pubsub()
    pubsub.psubscribe('__keyevent@0__:*')

    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            channel = message['channel'].decode()
            key = message['data'].decode()
            command = channel.split(':')[1]  # e.g., 'set', 'del', 'expire'

            audit_record = {
                'timestamp': time.time(),
                'command': command,
                'key': key,
                'database': 0
            }
            # Write to audit log
            print(json.dumps(audit_record))
            # Or write to a separate Redis key for audit storage
            r.lpush('audit:log', json.dumps(audit_record))
            r.ltrim('audit:log', 0, 9999)  # Keep last 10000 entries

audit_keyspace_events()
```

## Method 4 - Application-Level Command Logging Middleware

Wrap your Redis client to log all commands at the application level:

```python
import redis
import logging
import functools
import time

logger = logging.getLogger('redis.audit')

class AuditableRedis:
    def __init__(self, *args, username=None, **kwargs):
        self._client = redis.Redis(*args, **kwargs)
        self._username = username
        self._audit_commands = {
            'set', 'del', 'hset', 'hdel', 'expire', 'persist',
            'rename', 'move', 'lpush', 'rpush', 'sadd', 'srem',
            'zadd', 'zrem', 'incr', 'incrby', 'decr', 'decrby'
        }

    def __getattr__(self, name):
        attr = getattr(self._client, name)
        if callable(attr) and name.lower() in self._audit_commands:
            @functools.wraps(attr)
            def audited(*args, **kwargs):
                start = time.time()
                result = attr(*args, **kwargs)
                elapsed = time.time() - start
                logger.info(
                    'redis_audit',
                    extra={
                        'command': name.upper(),
                        'args': str(args[:2]),  # Log first 2 args only
                        'elapsed_ms': round(elapsed * 1000, 2),
                        'username': self._username,
                        'result': str(result)[:100]
                    }
                )
                return result
            return audited
        return attr

# Usage
r = AuditableRedis(host='localhost', port=6379, username='app-service')
r.set('user:100', 'alice')  # Logged automatically
```

## Storing Audit Logs

### Write Audit Logs to a Separate Redis Database

```python
audit_r = redis.Redis(db=15)  # Dedicated audit database

def log_audit(command, key, user, result):
    entry = json.dumps({
        'ts': time.time(),
        'cmd': command,
        'key': key,
        'user': user,
        'result': str(result)[:50]
    })
    audit_r.lpush('audit:commands', entry)
    audit_r.ltrim('audit:commands', 0, 99999)
```

### Ship Logs to Elasticsearch

```bash
# Configure rsyslog or Filebeat to ship /var/log/redis/audit.log to Elasticsearch
# Then query with:
# GET redis-audit-*/_search?q=command:SET AND user:readonly-user
```

## Summary

Build a Redis command audit trail using ACL LOG for access control violations, keyspace notifications for write-change tracking, and application-level middleware to log every command with user context. For comprehensive auditing, combine ACL logging (who was denied), keyspace notifications (what changed), and application middleware (who made the change from the app perspective). Store audit logs in a dedicated Redis database or ship them to an external log management system.
