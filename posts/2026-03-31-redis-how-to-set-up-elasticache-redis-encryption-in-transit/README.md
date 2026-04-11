# How to Set Up ElastiCache Redis Encryption in Transit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, TLS, Encryption, AWS Security

Description: Learn how to enable and configure TLS encryption in transit for Amazon ElastiCache Redis to protect data moving between your application and Redis.

---

## Why Encryption in Transit Matters

Without TLS, data flowing between your application and ElastiCache Redis travels as plaintext across the AWS network. While AWS's internal network is isolated, enabling encryption in transit protects against:

- Accidental exposure through misconfigured network access
- Compliance requirements (PCI-DSS, HIPAA, SOC2)
- Defense-in-depth security posture

ElastiCache supports TLS 1.2 and 1.3 with certificates managed by AWS.

## Enabling Encryption in Transit

Encryption in transit is typically enabled when creating a cluster. For Redis 7.0 and later, you can also enable it on an existing cluster using the `--transit-encryption-mode` parameter (see the migration section below).

### Via AWS CLI

```bash
aws elasticache create-replication-group \
  --replication-group-id my-secure-cluster \
  --replication-group-description "TLS-enabled Redis cluster" \
  --num-cache-clusters 2 \
  --cache-node-type cache.r7g.large \
  --engine redis \
  --engine-version 7.1 \
  --transit-encryption-enabled \
  --auth-token "YourStrongAuthToken123!" \
  --region us-east-1
```

Note: When `--transit-encryption-enabled` is set, you should also set `--auth-token` to require authentication. Without it, anyone with network access could connect over TLS without credentials.

### Via Terraform

```hcl
resource "aws_elasticache_replication_group" "secure" {
  replication_group_id       = "secure-redis"
  description                = "Redis with TLS"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true

  # Enable TLS
  transit_encryption_enabled = true

  # Optional: require auth token
  auth_token = var.redis_auth_token  # Store in AWS Secrets Manager

  # Recommended: also enable at-rest encryption
  at_rest_encryption_enabled = true

  tags = {
    Environment = "production"
  }
}

# Store auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name = "redis/auth-token"
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = var.redis_auth_token
}
```

## Connecting with TLS in Application Code

### Python (redis-py)

```python
import redis
import boto3
import json

def get_redis_auth_token():
    """Retrieve auth token from Secrets Manager"""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId='redis/auth-token')
    return response['SecretString']

# Connect with TLS enabled
r = redis.Redis(
    host='my-secure-cluster.abc123.0001.use1.cache.amazonaws.com',
    port=6379,
    ssl=True,
    ssl_cert_reqs='required',  # Verify server certificate
    password=get_redis_auth_token(),
    decode_responses=True
)

# Test connection
r.ping()
print("Connected to ElastiCache with TLS")
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function getAuthToken() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(new GetSecretValueCommand({
    SecretId: 'redis/auth-token'
  }));
  return response.SecretString;
}

async function createRedisClient() {
  const authToken = await getAuthToken();

  const redis = new Redis({
    host: 'my-secure-cluster.abc123.0001.use1.cache.amazonaws.com',
    port: 6379,
    password: authToken,
    tls: {
      rejectUnauthorized: true  // Verify AWS certificate
    },
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  redis.on('connect', () => console.log('Connected with TLS'));
  redis.on('error', (err) => console.error('Redis error:', err));

  return redis;
}
```

### Java (Lettuce)

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
public class ElastiCacheTLSExample {
    public static StatefulRedisConnection<String, String> connect(
            String host, String password) {

        RedisURI uri = RedisURI.builder()
            .withHost(host)
            .withPort(6379)
            .withSsl(true)
            .withVerifyPeer(true)
            .withPassword(password.toCharArray())
            .build();

        RedisClient client = RedisClient.create(uri);
        return client.connect();
    }
}
```

## Verifying TLS Is Active

```bash
# Connect using redis-cli with TLS
redis-cli -h my-secure-cluster.abc123.0001.use1.cache.amazonaws.com \
  -p 6379 \
  --tls \
  --no-auth-warning \
  -a "YourStrongAuthToken123!" \
  ping

# Verify TLS version and cipher in use (ElastiCache uses direct TLS, not STARTTLS)
openssl s_client -connect my-secure-cluster.abc123.0001.use1.cache.amazonaws.com:6379 \
  2>/dev/null | grep "Protocol\|Cipher"
```

Expected output:

```text
Protocol  : TLSv1.3
Cipher    : TLS_AES_256_GCM_SHA384
```

## Rotating the AUTH Token

ElastiCache supports rotating auth tokens without downtime using a two-step process.

```bash
# Step 1: Add the new token while keeping the old one (ROTATE mode)
aws elasticache modify-replication-group \
  --replication-group-id my-secure-cluster \
  --auth-token "NewStrongToken456!" \
  --auth-token-update-strategy ROTATE \
  --apply-immediately

# Both old and new tokens work during transition
# Update your application to use the new token

# Step 2: After updating application, delete the old token (SET mode)
aws elasticache modify-replication-group \
  --replication-group-id my-secure-cluster \
  --auth-token "NewStrongToken456!" \
  --auth-token-update-strategy SET \
  --apply-immediately
```

## Migrating an Existing Cluster to TLS

### In-Place Migration (Redis 7.0+)

For clusters running Redis 7.0 or later, you can enable TLS on an existing replication group without creating a new cluster:

```bash
# Step 1: Enable TLS in "preferred" mode (accepts both TLS and non-TLS connections)
aws elasticache modify-replication-group \
  --replication-group-id my-secure-cluster \
  --transit-encryption-enabled \
  --transit-encryption-mode preferred \
  --apply-immediately

# Step 2: Update all application clients to connect using TLS

# Step 3: Once all clients use TLS, enforce TLS-only connections
aws elasticache modify-replication-group \
  --replication-group-id my-secure-cluster \
  --transit-encryption-mode required \
  --apply-immediately
```

### Create-and-Migrate (Redis 6.x and Earlier)

For clusters running Redis versions before 7.0, you must create a new TLS-enabled cluster and migrate:

```bash
# Step 1: Create a new TLS-enabled cluster
aws elasticache create-replication-group \
  --replication-group-id my-secure-cluster-v2 \
  --transit-encryption-enabled \
  --auth-token "NewToken123!"

# Step 2: Sync data using redis-dump or application-level migration
# For caches, you can often just update the endpoint and let the cache warm up

# Step 3: Update application configuration to use new endpoint
# Step 4: Delete old non-TLS cluster after validating the new one
```

## Troubleshooting TLS Connection Issues

```text
Error: SSL: CERTIFICATE_VERIFY_FAILED
Fix: Use ssl_cert_reqs='required' and ensure your CA bundle is up to date.
     AWS uses Amazon Root CA certificates.

Error: WRONGPASS invalid username-password pair
Fix: Auth token may have special characters - URL-encode or quote properly.
     Auth tokens must be 16-128 characters.

Error: Connection timeout
Fix: Verify security group allows port 6379 from your application.
     TLS on ElastiCache still uses port 6379, not 6380.
```

## Summary

ElastiCache Redis encryption in transit is enabled using the `transit_encryption_enabled` flag and should always be paired with an auth token for authentication. Connect using standard Redis clients with TLS enabled and server certificate verification. For auth token rotation, use the two-phase ROTATE then SET strategy to achieve zero-downtime credential updates. For Redis 7.0+, you can enable TLS on existing clusters in place using the preferred-then-required migration mode. For older versions, migrating requires creating a new cluster.
