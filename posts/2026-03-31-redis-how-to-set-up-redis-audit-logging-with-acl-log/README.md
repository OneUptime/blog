# How to Set Up Redis Audit Logging with ACL LOG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Audit Logging, Security, Access Control, ACL LOG

Description: Configure Redis ACL LOG to capture denied access attempts, track user activity, and build a security audit trail for compliance and incident investigation.

---

## What Is Redis ACL LOG?

Redis ACL LOG (Access Control List Log) records events when a client is denied access due to ACL rules. It was introduced in Redis 6.0 alongside the full ACL system. The log captures:

- Which user tried to run a command
- What command was denied
- Which key or channel was restricted
- The client's IP address and name
- When the denial occurred

This is essential for security monitoring, compliance audits, and detecting unauthorized access attempts.

## Setting Up Redis ACL Users

First, create users with specific permissions:

```bash
# Create a read-only user
redis-cli ACL SETUSER readonly on >readonlypass ~* &* +@read

# Create an application user with limited command access
redis-cli ACL SETUSER appuser on >apppassword ~app:* +GET +SET +DEL +EXPIRE

# Create an admin user with full access
redis-cli ACL SETUSER admin on >adminpassword ~* &* +@all

# Disable the default user (security best practice)
redis-cli ACL SETUSER default off
```

## Configuring ACL LOG Size

The ACL log is stored in memory. Configure the maximum number of entries to retain:

```bash
# redis.conf
acllog-max-len 256    # default is 128

# Or set at runtime
redis-cli CONFIG SET acllog-max-len 512
```

## Triggering ACL LOG Entries

ACL LOG captures denials automatically. You can test it:

```bash
# Try a write command as read-only user - this will be denied and logged
redis-cli --user readonly --pass readonlypass SET mykey value

# Try accessing a key outside the allowed pattern
redis-cli -u redis://appuser:apppassword@localhost:6379 GET other:key
```

## Reading the ACL LOG

```bash
# Show all recent ACL log entries
redis-cli ACL LOG

# Show only the last N entries
redis-cli ACL LOG 10

# Clear the ACL log
redis-cli ACL LOG RESET
```

Sample output:

```text
1) 1) "count"
   2) (integer) 3
   3) "reason"
   4) "command"
   5) "context"
   6) "toplevel"
   7) "object"
   8) "set"
   9) "username"
   10) "readonly"
   11) "age-seconds"
   12) "12.345"
   13) "client-info"
   14) "id=21 addr=127.0.0.1:54321 laddr=127.0.0.1:6379 fd=12 name= age=0 idle=0 flags=N db=0 sub=0 psub=0 multi=-1 watch=0 qbuf=0 qbuf-free=40954 argv-mem=10 multi-mem=0 tot-mem=61466 rbs=16384 rbp=0 obl=0 oll=0 omem=0 events=r cmd=set|ex user=readonly library-name= library-ver= resp=2"
```

## Parsing ACL LOG Programmatically

```python
import redis
import json
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def parse_acl_log():
    entries = r.acl_log()
    parsed = []
    for entry in entries:
        parsed.append({
            'count': entry.get('count'),
            'reason': entry.get('reason'),       # 'command', 'key', 'channel', or 'auth'
            'context': entry.get('context'),
            'object': entry.get('object'),       # the denied command or key pattern
            'username': entry.get('username'),
            'age_seconds': entry.get('age-seconds'),
            'client_info': entry.get('client-info'),
        })
    return parsed

def monitor_acl_denials():
    """Check for ACL denials and alert if unusual activity detected."""
    log = parse_acl_log()

    users_with_denials = {}
    for entry in log:
        user = entry['username']
        users_with_denials[user] = users_with_denials.get(user, 0) + entry['count']

    for user, count in users_with_denials.items():
        if count > 10:
            print(f"ALERT: User '{user}' has {count} ACL denials - possible intrusion attempt")
        else:
            print(f"INFO: User '{user}' has {count} ACL denial(s)")

monitor_acl_denials()
```

## Exporting ACL Logs to a SIEM

For compliance, forward ACL log entries to a centralized logging system:

```python
import redis
import json
import time
import requests

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

LAST_SENT_COUNT = 0

def export_acl_log_to_siem(siem_endpoint: str):
    global LAST_SENT_COUNT
    entries = r.acl_log()

    # Only send new entries since last export
    new_entries = entries[:len(entries) - LAST_SENT_COUNT] if LAST_SENT_COUNT < len(entries) else []

    for entry in new_entries:
        event = {
            'source': 'redis-acl',
            'timestamp': time.time() - float(entry.get('age-seconds', 0)),
            'user': entry.get('username'),
            'reason': entry.get('reason'),
            'object': entry.get('object'),
            'client': entry.get('client-info', ''),
        }
        requests.post(siem_endpoint, json=event, timeout=5)

    LAST_SENT_COUNT = len(entries)
```

## ACL Log vs. Redis Monitor

| Feature | ACL LOG | MONITOR |
|---------|---------|---------|
| What it captures | Access denials | All commands |
| Performance impact | Minimal | High (50%+ overhead) |
| Persistent | In memory, configurable size | Streaming only |
| Use case | Security audit | Real-time debugging |

## Summary

Redis ACL LOG provides a lightweight audit trail of all access control denials, making it valuable for security monitoring and compliance. Configure `acllog-max-len` to retain enough history, parse the log programmatically to detect suspicious patterns, and forward entries to a SIEM for long-term retention. Combine ACL LOG with strong per-user permissions defined via `ACL SETUSER` to build a comprehensive Redis security posture.
