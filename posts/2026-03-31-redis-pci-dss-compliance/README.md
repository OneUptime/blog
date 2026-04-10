# How to Configure Redis for PCI DSS Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PCI DSS, Compliance, Security, Encryption

Description: Configure Redis to meet PCI DSS requirements for protecting cardholder data with encryption, access controls, audit logging, and vulnerability management.

---

If your application processes payment card data and uses Redis for session storage, rate limiting, or caching, Redis falls within your PCI DSS scope. This guide covers the specific configuration requirements across the key PCI DSS v4.0 requirements.

## Relevant PCI DSS Requirements for Redis

- **Requirement 2**: Apply secure configurations (no defaults, rename dangerous commands)
- **Requirement 4**: Encrypt cardholder data in transit (TLS)
- **Requirement 7**: Restrict access to system components
- **Requirement 8**: Identify users and authenticate access
- **Requirement 10**: Log and monitor all access to system components

## Requirement 2: Secure Configuration

Disable or rename dangerous commands that could be exploited:

```bash
# redis.conf
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG "REDIS_CONFIG_e7f3a1b2"
rename-command DEBUG ""
rename-command KEYS ""
rename-command SHUTDOWN "REDIS_SHUTDOWN_9c4d2e1f"
```

Disable the default unauthenticated user:

```bash
ACL SETUSER default off
```

## Requirement 4: Encryption in Transit

Enable TLS and require encrypted client connections:

```bash
# redis.conf
tls-port 6380
port 0
tls-cert-file /etc/ssl/redis/server.crt
tls-key-file /etc/ssl/redis/server.key
tls-ca-cert-file /etc/ssl/redis/ca.crt
tls-auth-clients yes
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
```

Verify TLS is active:

```bash
openssl s_client -connect redis.internal:6380 -CAfile /etc/ssl/redis/ca.crt
```

## Requirement 7: Restrict Access

Use ACLs to grant only necessary permissions per application component:

```bash
# Payment service - can only access payment-related keys
ACL SETUSER payment_service on >StrongPass123! ~payment:* &* +@read +@write +DEL +EXPIRE

# API gateway - rate limiting only
ACL SETUSER api_gateway on >GatewayPass456! ~ratelimit:* &* +INCR +GET +SET +EXPIRE

# Monitoring - read-only
ACL SETUSER monitor on >MonitorPass789! ~* &* +INFO +SLOWLOG +LATENCY
```

## Requirement 8: User Authentication

Enforce strong passwords and rotate credentials regularly:

```bash
# Generate a strong ACL password
openssl rand -base64 32
```

Automate credential rotation with a script:

```bash
#!/bin/bash
NEW_PASSWORD=$(openssl rand -base64 32)
redis-cli ACL SETUSER payment_service resetpass ">$NEW_PASSWORD"
echo "Rotated payment_service password"
# Update application secret store
aws secretsmanager put-secret-value \
  --secret-id redis/payment_service \
  --secret-string "{\"password\":\"$NEW_PASSWORD\"}"
```

## Requirement 10: Audit Logging

Log all access to Redis including failed authentication attempts:

```bash
# redis.conf
logfile /var/log/redis/redis.log
loglevel verbose
slowlog-log-slower-than 0
slowlog-max-len 1024
```

Ship Redis logs to your SIEM:

```bash
# Using filebeat
filebeat.inputs:
- type: log
  paths:
  - /var/log/redis/redis.log
  fields:
    service: redis
    compliance: pci-dss
output.elasticsearch:
  hosts: ["siem.internal:9200"]
```

## Validate Compliance Configuration

```bash
#!/bin/bash
echo "=== PCI DSS Redis Compliance Validation ==="

REDIS_CLI="redis-cli --tls -p 6380 --cert /etc/ssl/redis/client.crt --key /etc/ssl/redis/client.key --cacert /etc/ssl/redis/ca.crt"

# Check TLS
echo -n "TLS port configured: "
$REDIS_CLI config get tls-port | grep -q "[1-9]" && echo "PASS" || echo "FAIL"

# Check default user
echo -n "Default user disabled: "
$REDIS_CLI ACL LIST | grep "default" | grep -q "off" && echo "PASS" || echo "FAIL"

# Check logging
echo -n "Verbose logging enabled: "
$REDIS_CLI config get loglevel | grep -q "verbose\|debug" && echo "PASS" || echo "FAIL"

# Check dangerous commands renamed
echo -n "FLUSHALL disabled: "
$REDIS_CLI FLUSHALL 2>&1 | grep -q "ERR" && echo "PASS" || echo "FAIL"
```

## Summary

PCI DSS compliance for Redis requires disabling dangerous commands, enforcing TLS v1.2+ for all connections, implementing ACL-based least-privilege access with strong passwords, and shipping all logs to a SIEM for retention and analysis. Never store raw cardholder data (PANs) in Redis - use tokens or references and ensure any cached data is encrypted at the application layer before storage.
