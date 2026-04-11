# How to Harden Redis for Internet-Facing Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Hardening, Production, TLS

Description: A complete hardening checklist for Redis deployments that must accept connections from external networks, covering TLS, authentication, and network controls.

---

Running Redis in a way that accepts connections from external or untrusted networks requires a layered hardening approach. This guide covers every critical configuration needed.

## Step 1: Enable TLS

Never transmit data in plaintext over the internet:

```text
# /etc/redis/redis.conf
port 0
tls-port 6380
tls-cert-file /etc/redis/tls/server.crt
tls-key-file /etc/redis/tls/server.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
tls-ciphersuites "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"
```

## Step 2: Disable the Default Unauthenticated User

```bash
ACL SETUSER default off nopass resetkeys resetchannels nocommands
```

Create named users with strong passwords instead.

## Step 3: Use Strong Passwords

Generate cryptographically secure passwords:

```bash
ACL GENPASS 256
```

Assign to users:

```bash
# First, generate a password in redis-cli:
#   ACL GENPASS 256
# Then use the output as the password:
ACL SETUSER appuser on >GENERATED_PASSWORD_HERE ~app:* &app:* -@all +@read +@write +@string
```

## Step 4: Restrict to Minimal Commands

Application users should only have commands they need:

```bash
ACL SETUSER api-user on >apipass ~api:* &* -@all \
  +GET +SET +DEL +EXPIRE +TTL +EXISTS +HGET +HSET +HDEL
```

## Step 5: Disable Dangerous Commands

```bash
ACL SETUSER default -FLUSHALL -FLUSHDB -CONFIG -DEBUG -SHUTDOWN -REPLICAOF
```

Or rename them in `redis.conf`:

```text
rename-command CONFIG   ""
rename-command DEBUG    ""
rename-command FLUSHALL ""
rename-command SHUTDOWN ""
```

## Step 6: Bind to Specific IPs

```text
bind 203.0.113.5 127.0.0.1
```

Only bind the public interface if you genuinely need external access.

## Step 7: Firewall Rules

Limit the TLS port to known client IP ranges:

```bash
sudo ufw allow from 198.51.100.0/24 to any port 6380
sudo ufw deny 6380
sudo ufw reload
```

## Step 8: Enable ACL Logging

```text
acllog-max-len 512
loglevel notice
logfile /var/log/redis/redis-server.log
```

## Step 9: Set Memory Limits and Eviction

Prevent memory exhaustion attacks:

```text
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## Step 10: Verify Your Hardening

```bash
# Successful connection with full mTLS credentials:
redis-cli -p 6380 --tls --cert client.crt --key client.key --cacert ca.crt INFO server | grep redis_version
redis-cli -p 6380 --tls --cert client.crt --key client.key --cacert ca.crt ACL WHOAMI

# Should fail (no client certificate for mTLS):
redis-cli -p 6380 --tls --cacert ca.crt PING

# Should fail (non-TLS port is disabled):
redis-cli -p 6379 PING
```

## Summary

Hardening Redis for internet-facing deployments requires TLS with mTLS, disabling the default user, creating least-privilege ACL users, disabling dangerous commands, binding to specific IPs, and applying firewall rules. Never expose Redis on a public IP without all these layers in place.
