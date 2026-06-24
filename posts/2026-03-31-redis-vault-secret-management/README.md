# How to Use Redis with Vault for Secret Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vault, Secret Management, Security, HashiCorp

Description: Integrate HashiCorp Vault with Redis to securely manage Redis passwords, TLS certificates, and application encryption keys using dynamic secrets and lease renewal.

---

Hardcoding Redis passwords in config files or environment variables creates security risks. HashiCorp Vault provides dynamic secret generation, automatic rotation, and centralized access control for Redis credentials and encryption keys.

## Setting Up Vault for Redis

First, enable the KV secrets engine for static credentials:

```bash
vault secrets enable -path=redis kv-v2
```

Store your Redis password in Vault:

```bash
vault kv put redis/config/app \
  password="your-redis-password" \
  host="redis.internal" \
  port="6379"
```

## Reading Secrets at Application Startup

```python
import os
import redis
import hvac  # pip install hvac

def get_redis_credentials() -> dict:
    vault_client = hvac.Client(
        url=os.environ["VAULT_ADDR"],
        token=os.environ["VAULT_TOKEN"]
    )

    if not vault_client.is_authenticated():
        raise RuntimeError("Vault authentication failed")

    secret = vault_client.secrets.kv.v2.read_secret_version(
        path="config/app",
        mount_point="redis"
    )
    return secret["data"]["data"]

creds = get_redis_credentials()
client = redis.Redis(
    host=creds["host"],
    port=int(creds["port"]),
    password=creds["password"],
    decode_responses=True,
    ssl=True
)
client.ping()
print("Connected to Redis via Vault-managed credentials")
```

## Using Vault AppRole Authentication

In production, use AppRole instead of token-based auth:

```bash
# Enable AppRole auth method
vault auth enable approle

# Create a policy for Redis access
vault policy write redis-app - <<EOF
path "redis/data/config/app" {
  capabilities = ["read"]
}
EOF

# Create an AppRole
vault write auth/approle/role/redis-app \
  token_policies="redis-app" \
  token_ttl=1h \
  token_max_ttl=4h
```

```python
import hvac

def vault_login_approle(role_id: str, secret_id: str) -> hvac.Client:
    client = hvac.Client(url=os.environ["VAULT_ADDR"])
    client.auth.approle.login(role_id=role_id, secret_id=secret_id)
    return client
```

## Storing Redis Encryption Keys in Vault

For application-side encryption keys (AES-256), store them as Vault secrets:

```bash
vault kv put redis/encryption/key \
  aes_key="$(python3 -c 'import secrets; print(secrets.token_bytes(32).hex())')"
```

```python
def get_encryption_key() -> bytes:
    vault_client = get_vault_client()
    secret = vault_client.secrets.kv.v2.read_secret_version(
        path="encryption/key",
        mount_point="redis"
    )
    return bytes.fromhex(secret["data"]["data"]["aes_key"])
```

## Using Vault Transit for Encryption as a Service

Vault Transit engine encrypts your Redis values server-side without exposing the key to your app:

```bash
# Enable transit
vault secrets enable transit
vault write -f transit/keys/redis-data
```

```python
import base64

def encrypt_for_redis(plaintext: str, vault_client: hvac.Client) -> str:
    encoded = base64.b64encode(plaintext.encode()).decode()
    result = vault_client.secrets.transit.encrypt_data(
        name="redis-data",
        plaintext=encoded
    )
    return result["data"]["ciphertext"]

def decrypt_from_redis(ciphertext: str, vault_client: hvac.Client) -> str:
    result = vault_client.secrets.transit.decrypt_data(
        name="redis-data",
        ciphertext=ciphertext
    )
    return base64.b64decode(result["data"]["plaintext"]).decode()
```

## Rotating Redis Credentials

```bash
# Update the password in Redis
redis-cli CONFIG SET requirepass "new-password-here"

# Update Vault
vault kv put redis/config/app \
  password="new-password-here" \
  host="redis.internal" \
  port="6379"

# Applications re-read from Vault on next restart or credential refresh
```

## Summary

HashiCorp Vault centralizes Redis secret management by storing credentials in a versioned KV store, authenticating applications via AppRole, and providing Transit encryption for sensitive values. This eliminates hardcoded passwords, enables credential rotation without application redeployment, and creates a full audit trail of secret access through Vault's audit log.
