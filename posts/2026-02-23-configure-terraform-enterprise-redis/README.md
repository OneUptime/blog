# How to Configure Terraform Enterprise with Redis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Redis, Caching, Infrastructure, DevOps

Description: A practical guide to configuring Terraform Enterprise with an external Redis instance for improved performance, session management, and high availability deployments.

---

Terraform Enterprise uses Redis for caching, session storage, and as a coordination layer for background job processing. While TFE can run with an embedded Redis instance, production deployments should use an external Redis service. This is especially true if you plan to run TFE in high availability mode, where a shared Redis instance is mandatory.

This guide covers setting up external Redis for TFE with AWS ElastiCache, Azure Cache for Redis, and self-hosted Redis, along with security best practices.

## Why External Redis Matters

The embedded Redis bundled with TFE works fine for small deployments and testing. But it introduces several limitations:

- **No persistence guarantees**: If the TFE container restarts, in-memory data is lost.
- **Single point of failure**: Embedded Redis goes down with the TFE application.
- **No clustering**: You cannot run multiple TFE nodes against an embedded Redis.
- **No monitoring**: You lose visibility into Redis-specific metrics.

External Redis solves all of these problems and is a requirement for any TFE deployment that needs to be reliable.

## Prerequisites

- A running or planned Terraform Enterprise deployment
- Network access between TFE and your Redis instance
- Redis 6.x or 7.x (TFE supports both)
- TLS certificates if encrypting the Redis connection (recommended)

## Setting Up AWS ElastiCache for Redis

### Step 1: Create a Subnet Group

```bash
# Create a subnet group using your private subnets
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name tfe-redis-subnet-group \
  --cache-subnet-group-description "Subnets for TFE Redis" \
  --subnet-ids subnet-abc123 subnet-def456
```

### Step 2: Create the ElastiCache Cluster

```bash
# Create a Redis replication group with encryption
aws elasticache create-replication-group \
  --replication-group-id tfe-redis \
  --replication-group-description "Redis for Terraform Enterprise" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 2 \
  --cache-subnet-group-name tfe-redis-subnet-group \
  --security-group-ids sg-redis123 \
  --transit-encryption-enabled \
  --auth-token "your-strong-auth-token" \
  --at-rest-encryption-enabled \
  --automatic-failover-enabled \
  --multi-az-enabled
```

### Step 3: Get the Connection Endpoint

```bash
# Retrieve the primary endpoint
aws elasticache describe-replication-groups \
  --replication-group-id tfe-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint' \
  --output json
```

This gives you something like `tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379`.

## Setting Up Azure Cache for Redis

```bash
# Create Azure Cache for Redis with TLS
az redis create \
  --name tfe-redis-cache \
  --resource-group tfe-rg \
  --location eastus \
  --sku Premium \
  --vm-size P1 \
  --enable-non-ssl-port false \
  --minimum-tls-version 1.2 \
  --redis-version 6

# Get the connection details
az redis show \
  --name tfe-redis-cache \
  --resource-group tfe-rg \
  --query '{hostname:hostName, port:sslPort}'

# Get the access key
az redis list-keys \
  --name tfe-redis-cache \
  --resource-group tfe-rg \
  --query primaryKey \
  --output tsv
```

## Setting Up Self-Hosted Redis

If you prefer to run Redis yourself, here is a production-ready configuration:

```conf
# /etc/redis/redis.conf - Production configuration for TFE

# Bind to a specific interface, not 0.0.0.0
bind 10.0.1.50

# Require a password
requirepass your-strong-redis-password

# Enable TLS
tls-port 6380
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients optional

# Memory management
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence - use both RDB and AOF for durability
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Security hardening
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
```

Start Redis with this configuration:

```bash
# Start Redis with the custom configuration
redis-server /etc/redis/redis.conf

# Verify it is running and accepting TLS connections
redis-cli --tls \
  --cert /etc/redis/tls/redis.crt \
  --key /etc/redis/tls/redis.key \
  --cacert /etc/redis/tls/ca.crt \
  -h 10.0.1.50 \
  -p 6380 \
  -a your-strong-redis-password \
  ping
```

## Configuring Terraform Enterprise

With your Redis instance ready, configure TFE to use it. The configuration is done through environment variables.

### Basic Configuration

```bash
# Tell TFE to use an external Redis
TFE_REDIS_HOST=tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com
TFE_REDIS_PORT=6379
TFE_REDIS_PASSWORD=your-strong-auth-token

# Enable TLS for the Redis connection
TFE_REDIS_USE_TLS=true

# If using a Redis URL format instead
# TFE_REDIS_URL=rediss://:your-strong-auth-token@tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379
```

### Docker Compose Configuration

```yaml
# docker-compose.yml snippet for TFE with external Redis
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      TFE_REDIS_HOST: tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com
      TFE_REDIS_PORT: "6379"
      TFE_REDIS_PASSWORD: "${TFE_REDIS_PASSWORD}"
      TFE_REDIS_USE_TLS: "true"
      # If your Redis uses a custom CA certificate
      TFE_REDIS_CA_CERT_FILE: /etc/tfe/redis-ca.crt
      # ... other TFE variables
    volumes:
      - ./certs/redis-ca.crt:/etc/tfe/redis-ca.crt:ro
    ports:
      - "443:443"
```

### Helm Chart Configuration (Kubernetes)

If you deploy TFE on Kubernetes, the Helm values look like this:

```yaml
# values.yaml for TFE Helm chart
tfe:
  redis:
    host: tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com
    port: 6379
    password: your-strong-auth-token
    useTLS: true
    caCertFile: /etc/tfe/redis-ca.crt
```

## Verifying the Redis Connection

After deploying TFE with the new configuration, verify the connection is working:

```bash
# Check the TFE health endpoint
curl -s https://tfe.example.com/_health_check | jq .

# Look for Redis-related log entries
docker logs tfe 2>&1 | grep -i redis

# Connect to Redis directly and check for TFE keys
redis-cli --tls \
  -h tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com \
  -p 6379 \
  -a your-strong-auth-token \
  --no-auth-warning \
  info clients
```

You should see connected clients from your TFE instance in the output.

## Performance Tuning

For larger TFE deployments, consider these Redis performance adjustments:

```bash
# Check current Redis memory usage
redis-cli info memory | grep used_memory_human

# Monitor slow queries
redis-cli slowlog get 10

# Check connected client count
redis-cli info clients | grep connected_clients
```

Key recommendations:

- **Memory**: Allocate at least 2 GB for small deployments, 4-8 GB for larger ones. TFE uses Redis primarily for caching and job coordination, so memory usage is moderate.
- **Network latency**: Keep Redis in the same region and ideally the same availability zone as your TFE instance. Sub-millisecond latency is ideal.
- **Connection limits**: The default `maxclients` of 10000 is fine for most deployments. If running TFE in HA mode with many nodes, verify you have enough headroom.

## Monitoring Redis

Set up monitoring to catch problems early. Track these metrics:

- **Memory utilization**: Should stay below 80% of max memory.
- **Cache hit rate**: A low hit rate might indicate sizing issues.
- **Connected clients**: Sudden drops suggest connectivity problems.
- **Eviction count**: If keys are being evicted, you need more memory.

Tools like [OneUptime](https://oneuptime.com) can alert you when these metrics drift outside healthy ranges, giving you time to act before TFE users notice any impact.

## Common Issues

**Connection refused**: Check security group rules. Redis must allow inbound traffic from the TFE instance on the configured port.

**AUTH failed**: Verify the password matches exactly. Special characters in passwords sometimes need escaping depending on how you pass them (environment variable, Docker secret, etc.).

**TLS handshake failures**: Make sure TFE trusts the CA that signed the Redis TLS certificate. If using a self-signed or private CA, provide the CA cert via `TFE_REDIS_CA_CERT_FILE`.

**High latency**: Redis should be in the same network segment as TFE. Cross-region Redis connections add latency that degrades TFE performance noticeably.

## Summary

Configuring external Redis for Terraform Enterprise is straightforward but important for production readiness. Whether you go with a managed service like ElastiCache or Azure Cache, or run your own Redis instance, the key points are the same: enable TLS, use strong authentication, keep Redis close to TFE on the network, and monitor it actively. With external Redis in place, you unlock the ability to run TFE in high availability mode and gain the resilience that production workloads require.
