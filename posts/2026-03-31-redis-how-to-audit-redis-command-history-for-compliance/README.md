# How to Audit Redis Command History for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Compliance, Audit, Monitoring

Description: Learn how to audit Redis command history for compliance using ACL logs, keyspace notifications, and external logging tools to track data access.

---

## Why Redis Auditing Matters

Redis stores sensitive data in many production systems - session tokens, user profiles, financial records, and more. Compliance frameworks like PCI-DSS, HIPAA, and SOC 2 require organizations to demonstrate who accessed what data and when. Redis does not natively persist a full command history, but several mechanisms can help you build a comprehensive audit trail.

## Using the ACL LOG Command

Redis 6.0 introduced Access Control Lists (ACLs) and with them the `ACL LOG` command, which records authentication failures and ACL rule violations.

```bash
# View the last 10 ACL log entries
redis-cli ACL LOG 10

# View all ACL log entries
redis-cli ACL LOG

# Reset the ACL log
redis-cli ACL LOG RESET
```

The ACL log captures events such as:
- Wrong password attempts
- Commands blocked by ACL rules
- Key access denied by key patterns

Sample ACL log output:
```text
1) 1) "count"
   2) (integer) 1
   3) "reason"
   4) "command"
   5) "context"
   6) "toplevel"
   7) "object"
   8) "set"
   9) "username"
  10) "alice"
  11) "age-seconds"
  12) "0.124"
  13) "client-info"
  14) "id=12 addr=127.0.0.1:54321 ..."
```

## Enabling the MONITOR Command for Real-Time Auditing

The `MONITOR` command streams every command processed by Redis in real time. It is useful for short-term auditing sessions but should not be left running in production permanently - it can reduce throughput by more than 50%.

```bash
redis-cli MONITOR
```

Sample output:
```text
1711900800.123456 [0 127.0.0.1:54321] "SET" "user:1001" "{'name':'Alice'}"
1711900800.234567 [0 127.0.0.1:54322] "GET" "user:1001"
1711900800.345678 [0 127.0.0.1:54323] "DEL" "session:abc123"
```

To capture a timed window and save to a file:
```bash
timeout 60 redis-cli MONITOR > /var/log/redis/audit_$(date +%Y%m%d_%H%M%S).log
```

## Using Keyspace Notifications for Persistent Audit Trails

Keyspace notifications publish events to Redis Pub/Sub channels when keys are modified. You can subscribe to these events and forward them to an external log store.

Enable keyspace notifications in `redis.conf`:
```text
notify-keyspace-events KEA
```

Or set it dynamically:
```bash
redis-cli CONFIG SET notify-keyspace-events KEA
```

Subscribe to all key events:
```bash
redis-cli PSUBSCRIBE '__keyevent@0__:*'
```

A Python subscriber that logs to a file:
```python
import redis
import json
import datetime

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@0__:*')

with open('/var/log/redis/keyspace_audit.log', 'a') as f:
    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            entry = {
                'timestamp': datetime.datetime.utcnow().isoformat(),
                'channel': message['channel'],
                'key': message['data'],
                'event': message['channel'].split(':')[-1]
            }
            f.write(json.dumps(entry) + '\n')
```

## Forwarding Logs to a SIEM

For compliance, logs need to be forwarded to a centralized SIEM (Security Information and Event Management) system. Tools like Fluentd, Logstash, or Vector can tail Redis log files and forward them.

Fluentd configuration to forward Redis audit logs:
```text
<source>
  @type tail
  path /var/log/redis/audit_*.log
  pos_file /var/log/fluentd/redis_audit.pos
  tag redis.audit
  format none
</source>

<match redis.audit>
  @type elasticsearch
  host elasticsearch.internal
  port 9200
  index_name redis-audit
  type_name _doc
</match>
```

## Using Redis Enterprise Audit Logging

Redis Enterprise provides a built-in audit logging feature that captures all commands, authentication events, and configuration changes. Enable it from the Redis Enterprise admin console or via the REST API.

```bash
curl -X PUT https://your-cluster:9443/v1/cluster/audit \
  -H "Content-Type: application/json" \
  -d '{"audit_log_file": "/var/opt/redislabs/log/audit.log", "audit_events": "all"}'
```

## Setting Up ACL-Based Audit Controls

Configure ACLs so that each application uses a dedicated user with minimal permissions, making audit trails more meaningful:

```bash
# Create a read-only user for analytics
redis-cli ACL SETUSER analytics_user on >securepass ~* &* +@read

# Create a write user for application
redis-cli ACL SETUSER app_user on >apppass ~session:* ~user:* +SET +GET +DEL +EXPIRE

# View configured users
redis-cli ACL LIST
```

Store ACL rules in a file for persistence:
```text
# /etc/redis/users.acl
user analytics_user on #<hashed_password> ~* &* +@read
user app_user on #<hashed_password> ~session:* ~user:* +SET +GET +DEL +EXPIRE
user default off
```

Reference the file in `redis.conf`:
```text
aclfile /etc/redis/users.acl
```

## Building an Audit Dashboard

Parse the audit log and load it into PostgreSQL or Elasticsearch for querying:

```python
import re
import psycopg2
from datetime import datetime

def parse_monitor_line(line):
    pattern = r'(\d+\.\d+) \[(\d+) ([\d.]+:\d+)\] (.+)'
    match = re.match(pattern, line)
    if match:
        ts, db, addr, cmd = match.groups()
        return {
            'timestamp': datetime.fromtimestamp(float(ts)),
            'db': int(db),
            'client': addr,
            'command': cmd.strip('"').split('" "')[0],
            'full_command': cmd
        }
    return None

conn = psycopg2.connect("dbname=audit user=postgres")
cursor = conn.cursor()

with open('/var/log/redis/audit.log', 'r') as f:
    for line in f:
        entry = parse_monitor_line(line)
        if entry:
            cursor.execute(
                "INSERT INTO redis_audit (timestamp, db, client, command, full_command) VALUES (%s, %s, %s, %s, %s)",
                (entry['timestamp'], entry['db'], entry['client'], entry['command'], entry['full_command'])
            )

conn.commit()
cursor.close()
conn.close()
```

## Summary

Redis does not offer built-in persistent audit logging, but combining ACL LOG, keyspace notifications, and the MONITOR command gives you the tools to build a compliance-grade audit trail. Forward logs to a centralized SIEM, use dedicated ACL users per application, and regularly review access patterns to meet compliance requirements like PCI-DSS and HIPAA.
