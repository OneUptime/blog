# How to Configure Redis for SOC 2 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SOC 2, Compliance, Security, Encryption

Description: Learn how to configure Redis to meet SOC 2 security requirements, covering encryption, access controls, audit logging, and network isolation.

---

SOC 2 compliance requires demonstrating that your systems protect data through security, availability, confidentiality, and privacy controls. Redis, as a data store for session data, caching, and queues, needs specific configuration to satisfy these controls.

## SOC 2 Controls Relevant to Redis

The key SOC 2 Trust Services Criteria that apply to Redis:
- **CC6.1**: Logical access controls (authentication, ACLs)
- **CC6.6**: Data in transit encryption (TLS)
- **CC6.7**: Data at rest encryption
- **CC7.2**: Monitoring and alerting
- **A1.1**: Availability and uptime

## 1. Enable TLS for Data in Transit

Redis 6+ supports native TLS. For AWS ElastiCache, enable `transit_encryption_enabled`:

```bash
# redis.conf
tls-port 6380
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
```

Connect with TLS verification:

```bash
redis-cli --tls \
  --cert /etc/redis/tls/client.crt \
  --key /etc/redis/tls/client.key \
  --cacert /etc/redis/tls/ca.crt \
  -p 6380 ping
```

## 2. Enforce Authentication with ACLs

Replace the single `requirepass` with user-level ACLs (Redis 6.2+):

```bash
# Create application user with minimal permissions
ACL SETUSER app_user on >strongpassword ~app:* &* +@read +@write +DEL +EXPIRE

# Create read-only monitoring user
ACL SETUSER monitor_user on >monitorpass ~* &* +INFO +MONITOR +SLOWLOG

# Disable the default user
ACL SETUSER default off
```

Persist ACL rules to file:

```bash
# redis.conf
aclfile /etc/redis/acl.rules
```

## 3. Enable Slow Log and Command Logging

SOC 2 auditors want evidence that you monitor for anomalous activity:

```bash
# redis.conf
slowlog-log-slower-than 10000  # Log commands taking > 10ms
slowlog-max-len 128
```

Review slow log entries:

```bash
redis-cli slowlog get 10
redis-cli slowlog len
```

## 4. Network Isolation

Bind Redis to private interfaces only:

```bash
# redis.conf
bind 10.0.1.50 127.0.0.1
protected-mode yes
```

Verify Redis is not listening on public interfaces:

```bash
ss -tlnp | grep 6380
```

Expected output:

```text
LISTEN  0  128  10.0.1.50:6380  0.0.0.0:*  users:(("redis-server",pid=1234))
```

## 5. Enable Redis Keyspace Notifications for Audit Trail

Track key access patterns for audit evidence:

```bash
redis-cli config set notify-keyspace-events "KEA"
```

Subscribe to events in your audit service:

```python
import redis

r = redis.Redis(host='localhost', decode_responses=True)
pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@0__:*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        print(f"Audit: Key event - {message['channel']} - {message['data']}")
```

## 6. Automated Compliance Checklist

Create a script to verify Redis compliance posture:

```bash
#!/bin/bash
echo "=== Redis SOC 2 Compliance Check ==="

echo -n "TLS enabled: "
redis-cli config get tls-port | grep -q "6380" && echo "PASS" || echo "FAIL"

echo -n "Default user disabled: "
redis-cli ACL WHOAMI | grep -q "default" && echo "FAIL" || echo "PASS"

echo -n "Protected mode: "
redis-cli config get protected-mode | grep -q "yes" && echo "PASS" || echo "FAIL"

echo -n "Slowlog configured: "
redis-cli config get slowlog-log-slower-than | tail -1 | grep -qv "^0$" && echo "PASS" || echo "FAIL"
```

## Summary

SOC 2 compliance for Redis centers on four areas: encrypting data in transit with TLS, enforcing least-privilege access via ACLs, monitoring through slow logs and keyspace notifications, and network isolation via bind addresses and security groups. Document each control with evidence of configuration and monitoring - auditors need proof, not just configuration.
