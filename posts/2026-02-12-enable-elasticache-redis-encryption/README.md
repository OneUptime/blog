# How to Enable ElastiCache Redis Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ElastiCache, Redis, Encryption, Security

Description: Learn how to enable encryption at rest and in transit for ElastiCache Redis, including AUTH token configuration, TLS setup, and client-side encryption patterns.

---

Running an unencrypted cache in production is a security risk that most compliance frameworks won't tolerate. ElastiCache Redis supports two types of encryption: encryption at rest (data stored on disk) and encryption in transit (data moving between clients and Redis). You should enable both.

Here's how to do it, along with the client-side changes you'll need to make.

## Encryption at Rest

Encryption at rest encrypts the data stored on disk, including backups and snapshots. ElastiCache uses AWS KMS keys for this.

**Important:** Encryption at rest can only be enabled when you create the replication group. You cannot add it to an existing unencrypted cluster.

### Creating an Encrypted Replication Group

```bash
# Create a Redis replication group with encryption at rest
aws elasticache create-replication-group \
  --replication-group-id my-encrypted-redis \
  --replication-group-description "Encrypted Redis cluster" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id \
  --cache-subnet-group-name my-cache-subnet-group \
  --security-group-ids sg-cache123
```

If you don't specify `--kms-key-id`, ElastiCache uses the default ElastiCache KMS key. Using a custom key gives you more control over key rotation and access policies.

### Using a Custom KMS Key

Create a KMS key specifically for ElastiCache:

```bash
# Create a KMS key for ElastiCache encryption
aws kms create-key \
  --description "ElastiCache Redis encryption key" \
  --key-usage ENCRYPT_DECRYPT

# Create an alias for easy reference
aws kms create-alias \
  --alias-name alias/elasticache-redis-key \
  --target-key-id <key-id>

# Add a key policy that allows ElastiCache to use it
aws kms put-key-policy \
  --key-id <key-id> \
  --policy-name default \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "Allow ElastiCache",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::123456789012:root"
        },
        "Action": "kms:*",
        "Resource": "*"
      }
    ]
  }'
```

## Encryption in Transit (TLS)

Encryption in transit uses TLS to encrypt all communication between your application and Redis, and between Redis nodes during replication.

### Enabling TLS

Like encryption at rest, TLS must be enabled at creation time:

```bash
# Create a replication group with both encryption types enabled
aws elasticache create-replication-group \
  --replication-group-id my-tls-redis \
  --replication-group-description "Redis with TLS and at-rest encryption" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --cache-subnet-group-name my-cache-subnet-group \
  --security-group-ids sg-cache123
```

### Connecting with TLS from Python

When TLS is enabled, your client must use SSL/TLS connections:

```python
import redis
import ssl

# Create an SSL context
ssl_context = ssl.create_default_context()

# Connect with TLS
redis_client = redis.Redis(
    host='my-tls-redis.abc123.ng.0001.use1.cache.amazonaws.com',
    port=6379,
    ssl=True,
    ssl_ca_certs='/etc/ssl/certs/ca-certificates.crt',
    ssl_cert_reqs='required',
    socket_timeout=5,
    decode_responses=True
)

# Test the connection
redis_client.ping()
print("Connected with TLS")
```

### Connecting with TLS from Node.js

```javascript
const Redis = require('ioredis');

// Connect with TLS enabled
const redis = new Redis({
  host: 'my-tls-redis.abc123.ng.0001.use1.cache.amazonaws.com',
  port: 6379,
  tls: {
    // For ElastiCache, the default CA bundle usually works
    rejectUnauthorized: true
  },
  retryStrategy: (times) => Math.min(times * 200, 3000),
  maxRetriesPerRequest: 3
});

redis.on('connect', () => console.log('Connected to Redis with TLS'));
redis.on('error', (err) => console.error('Redis error:', err));
```

### Connecting with TLS from Go

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"

    "github.com/redis/go-redis/v9"
)

func main() {
    client := redis.NewClient(&redis.Options{
        Addr: "my-tls-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379",
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    })

    ctx := context.Background()
    pong, err := client.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Connected:", pong)
}
```

## Redis AUTH Token

Beyond TLS, you can require clients to provide an AUTH token (password) to connect. This adds another layer of security.

### Creating a Cluster with AUTH

```bash
# Create a Redis cluster with AUTH token
aws elasticache create-replication-group \
  --replication-group-id my-auth-redis \
  --replication-group-description "Redis with AUTH" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --transit-encryption-enabled \
  --auth-token "MyStrongAuthToken123!@#" \
  --cache-subnet-group-name my-cache-subnet-group \
  --security-group-ids sg-cache123
```

The AUTH token requirements:
- Must be at least 16 characters
- Must contain printable ASCII characters
- Cannot contain these characters: `/`, `"`, `@`
- Transit encryption must be enabled to use AUTH

### Connecting with AUTH from Python

```python
import redis

# Connect with TLS and AUTH token
redis_client = redis.Redis(
    host='my-auth-redis.abc123.ng.0001.use1.cache.amazonaws.com',
    port=6379,
    password='MyStrongAuthToken123!@#',
    ssl=True,
    ssl_cert_reqs='required',
    socket_timeout=5,
    decode_responses=True
)

redis_client.ping()
print("Authenticated and connected")
```

### Rotating the AUTH Token

You can rotate the AUTH token without downtime. ElastiCache supports a two-phase rotation where both the old and new tokens work during the transition:

```bash
# Step 1: Set the new AUTH token while keeping the old one active
aws elasticache modify-replication-group \
  --replication-group-id my-auth-redis \
  --auth-token "NewStrongAuthToken456!@#" \
  --auth-token-update-strategy SET \
  --apply-immediately

# Step 2: Update your application to use the new token

# Step 3: Remove the old token once all clients are updated
aws elasticache modify-replication-group \
  --replication-group-id my-auth-redis \
  --auth-token "NewStrongAuthToken456!@#" \
  --auth-token-update-strategy ROTATE \
  --apply-immediately
```

## Terraform Configuration - Full Encryption

Here's the complete Terraform configuration with all encryption options:

```hcl
# KMS key for at-rest encryption
resource "aws_kms_key" "redis" {
  description             = "ElastiCache Redis encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# Redis replication group with full encryption
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "my-encrypted-redis"
  description          = "Fully encrypted Redis cluster"

  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.r6g.large"
  num_cache_clusters = 3

  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Encryption at rest
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.redis.arn

  # Encryption in transit
  transit_encryption_enabled = true

  # AUTH token
  auth_token = var.redis_auth_token

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}
```

## Performance Impact

Encryption does add overhead, but for most workloads it's minimal:

- **Encryption at rest**: Negligible impact. The encryption/decryption happens at the storage layer and is hardware-accelerated.
- **Encryption in transit**: Adds about 5-10% latency overhead due to TLS handshakes and encryption processing. The impact is more noticeable for workloads with many small operations.

If TLS overhead is a concern, benchmark your specific workload with and without TLS to quantify the impact.

## Migrating an Unencrypted Cluster to Encrypted

Since you can't add encryption to an existing cluster, you need to create a new encrypted cluster and migrate data. The safest approach:

1. Create the new encrypted replication group
2. Use the Redis `MIGRATE` command or a tool like `redis-shake` to copy data
3. Update your application to point to the new cluster
4. Delete the old unencrypted cluster

For more on managing your ElastiCache Redis configuration, check out the guide on [configuring replication](https://oneuptime.com/blog/post/configure-elasticache-redis-replication/view) and [setting up backups](https://oneuptime.com/blog/post/set-up-elasticache-redis-backups/view).

## Wrapping Up

Enable both encryption at rest and encryption in transit on every ElastiCache Redis cluster. There's no good reason not to - the performance impact is small and the security benefit is significant. Add an AUTH token for defense in depth, and make sure you have a token rotation process in place. Your compliance team will thank you.
