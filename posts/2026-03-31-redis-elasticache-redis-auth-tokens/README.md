# How to Configure ElastiCache Redis Auth Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, AWS, Auth Token, Security

Description: Learn how to enable and rotate ElastiCache Redis auth tokens (passwords) to secure your cache clusters and meet compliance requirements for in-transit authentication.

---

ElastiCache Redis AUTH tokens add a password requirement on top of TLS encryption. Clients must provide the token on every connection, preventing unauthorized access even within your VPC.

## Enabling AUTH on a New Cluster

Auth tokens require in-transit encryption (`transit-encryption-enabled`) to be active:

```bash
aws elasticache create-replication-group \
  --replication-group-id secure-redis \
  --replication-group-description "Auth-enabled Redis" \
  --engine redis \
  --engine-version "7.1" \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 2 \
  --transit-encryption-enabled \
  --auth-token "MyStr0ngP@ssword2024!" \
  --cache-subnet-group-name my-subnet-group
```

## Enabling AUTH on an Existing Cluster

Existing clusters must already have `transit-encryption-enabled`. You can add an auth token by modifying:

```bash
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --auth-token "MyStr0ngP@ssword2024!" \
  --auth-token-update-strategy SET \
  --apply-immediately
```

## Rotating the Auth Token

Use the `ROTATE` strategy, which accepts both old and new tokens for a transition period:

```bash
# Step 1: Add the new token (both tokens work during rotation)
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --auth-token "NewStr0ngP@ssword2025!" \
  --auth-token-update-strategy ROTATE \
  --apply-immediately

# Step 2: After updating all clients, finalize the rotation
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --auth-token "NewStr0ngP@ssword2025!" \
  --auth-token-update-strategy SET \
  --apply-immediately
```

## Terraform Configuration

```hcl
resource "aws_elasticache_replication_group" "secure" {
  replication_group_id       = "secure-redis"
  description                = "Auth-enabled cluster"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  engine_version             = "7.1"
  subnet_group_name          = aws_elasticache_subnet_group.main.name
}
```

Store the token in AWS Secrets Manager:

```hcl
resource "aws_secretsmanager_secret" "redis_token" {
  name = "elasticache/redis-auth-token"
}

resource "aws_secretsmanager_secret_version" "redis_token" {
  secret_id     = aws_secretsmanager_secret.redis_token.id
  secret_string = var.redis_auth_token
}
```

## Connecting with the Auth Token

```python
import redis
import boto3

def get_redis_client():
    sm = boto3.client("secretsmanager")
    secret = sm.get_secret_value(SecretId="elasticache/redis-auth-token")
    token = secret["SecretString"]
    return redis.Redis(
        host="secure-redis.abc.cache.amazonaws.com",
        port=6379,
        ssl=True,
        password=token,
    )

client = get_redis_client()
client.set("key", "value")
```

## Summary

ElastiCache Redis auth tokens require TLS to be enabled and add password-based authentication for every connection. Use the `ROTATE` strategy for zero-downtime token rotation - add the new token, roll out clients with the new password, then finalize with `SET`. Store tokens in AWS Secrets Manager rather than environment variables or code.
