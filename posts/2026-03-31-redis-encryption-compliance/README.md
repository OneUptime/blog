# How to Implement Redis Encryption for Compliance Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Encryption, Compliance, TLS, Security

Description: Learn how to implement Redis encryption at rest and in transit to meet compliance requirements for SOC 2, PCI DSS, HIPAA, and GDPR using TLS and application-level encryption.

---

Compliance frameworks require encrypting sensitive data both in transit (between clients and Redis) and at rest (on disk). This guide covers TLS configuration for in-transit encryption and application-level encryption for data at rest.

## Encryption in Transit: Native Redis TLS

Redis 6+ supports TLS natively. Generate self-signed certificates for development or use certificates from your PKI for production:

```bash
# Generate CA and server certificates
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt \
  -subj "/CN=Redis CA"

openssl genrsa -out redis.key 2048
openssl req -new -key redis.key -out redis.csr \
  -subj "/CN=redis.internal"
openssl x509 -req -in redis.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out redis.crt -days 365
```

Configure Redis to use TLS:

```bash
# redis.conf
tls-port 6380
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
tls-protocols "TLSv1.2 TLSv1.3"
```

Connect clients with TLS:

```python
import redis
import ssl

r = redis.Redis(
    host='redis.internal',
    port=6380,
    ssl=True,
    ssl_certfile='/etc/redis/tls/client.crt',
    ssl_keyfile='/etc/redis/tls/client.key',
    ssl_ca_certs='/etc/redis/tls/ca.crt',
    ssl_cert_reqs=ssl.CERT_REQUIRED,
    decode_responses=True
)
r.ping()
```

## Encryption at Rest: AWS ElastiCache

Enable encryption at rest when creating ElastiCache via Terraform:

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "secure-redis"
  description                = "Encrypted Redis replication group"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = aws_kms_key.redis.arn
}

resource "aws_kms_key" "redis" {
  description             = "Redis encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = {
    Compliance = "SOC2,PCI-DSS"
  }
}
```

## Application-Level Encryption

For compliance requirements beyond what Redis provides natively, encrypt sensitive fields at the application layer:

```python
from cryptography.fernet import Fernet
import os
import json
import redis

class EncryptedRedis:
    def __init__(self, redis_client: redis.Redis, encryption_key: bytes):
        self.r = redis_client
        self.fernet = Fernet(encryption_key)

    def set_encrypted(self, key: str, value: dict, ex: int = None) -> bool:
        """Encrypt value before storing in Redis."""
        plaintext = json.dumps(value).encode()
        ciphertext = self.fernet.encrypt(plaintext).decode()
        return self.r.set(key, ciphertext, ex=ex)

    def get_decrypted(self, key: str) -> dict | None:
        """Retrieve and decrypt value from Redis."""
        ciphertext = self.r.get(key)
        if ciphertext is None:
            return None
        plaintext = self.fernet.decrypt(ciphertext.encode())
        return json.loads(plaintext)

# Usage
key = os.environ["REDIS_ENCRYPTION_KEY"].encode()
enc_redis = EncryptedRedis(
    redis_client=redis.Redis(host='localhost', decode_responses=True),
    encryption_key=key
)

# Store encrypted user session
enc_redis.set_encrypted("session:abc123", {
    "user_id": 456,
    "email": "user@example.com",
    "role": "admin"
}, ex=3600)

# Retrieve and decrypt
session = enc_redis.get_decrypted("session:abc123")
print(session["email"])  # user@example.com
```

## Key Rotation

Rotate encryption keys without service downtime:

```python
def rotate_encryption_key(old_key: bytes, new_key: bytes, r: redis.Redis, pattern: str = "session:*"):
    """Re-encrypt keys with a new encryption key."""
    old_fernet = Fernet(old_key)
    new_fernet = Fernet(new_key)
    rotated = 0
    for key in r.scan_iter(pattern):
        ciphertext = r.get(key)
        if ciphertext:
            plaintext = old_fernet.decrypt(ciphertext.encode())
            new_ciphertext = new_fernet.encrypt(plaintext).decode()
            ttl = r.ttl(key)
            r.set(key, new_ciphertext, ex=ttl if ttl > 0 else None)
            rotated += 1
    print(f"Rotated encryption for {rotated} keys")
```

## Summary

Redis encryption compliance requires two layers: TLS for in-transit encryption (native in Redis 6+) and either cloud-provider at-rest encryption (ElastiCache KMS) or application-level encryption using Fernet or AES-GCM for fields that need strong compliance coverage. Store encryption keys in a secrets manager, not in code, and implement key rotation procedures as part of your compliance program.
