# How to Use Dapr State Encryption with Any Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Encryption, Security, Cryptography, Microservice

Description: Learn how to enable Dapr's built-in state store encryption so all state data is encrypted before writing to any backend, protecting sensitive data at rest.

---

Dapr's state store encryption feature encrypts state values before they reach the backend (Redis, PostgreSQL, Azure Cosmos DB, or any other supported store). The encryption happens inside the Dapr sidecar: your application writes plain text, the sidecar encrypts it, stores the ciphertext, and transparently decrypts it on reads. This works with any state store component without changing application code or the backend configuration.

## How Dapr State Encryption Works

```text
App writes plain value
        |
  Dapr sidecar
        |
  AES-256-GCM encryption using primary key
        |
  Encrypted value stored in Redis/Postgres/etc.

App reads key
        |
  Dapr sidecar reads encrypted value
        |
  Decrypt using primary key (try secondary key on failure)
        |
  Plain value returned to app
```

Dapr uses AES-256-GCM (authenticated encryption) with a random nonce per value. The encryption key is stored separately from the state store, typically in a Dapr secret store.

## Configuring Encryption Keys

First, create an encryption key and store it in a Kubernetes secret:

```bash
# Generate a 256-bit (32-byte) AES key
openssl rand -hex 32

# Store in Kubernetes secret
kubectl create secret generic state-encryption-key \
  --from-literal=primaryEncryptionKey="$(openssl rand -hex 32)" \
  --from-literal=secondaryEncryptionKey="$(openssl rand -hex 32)"
```

Configure the Dapr secret store to access the key:

```yaml
# components/secretstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
spec:
  type: secretstores.kubernetes
  version: v1
```

## Enabling Encryption on the State Store

Add the `primaryEncryptionKey` and `secondaryEncryptionKey` metadata fields to any state store component:

```yaml
# components/statestore-encrypted.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: primaryEncryptionKey
  - name: secondaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: secondaryEncryptionKey
auth:
  secretStore: kubernetes-secrets
```

The same pattern works for PostgreSQL:

```yaml
# components/statestore-postgres-encrypted.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: primaryEncryptionKey
  - name: secondaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: secondaryEncryptionKey
auth:
  secretStore: kubernetes-secrets
```

And for Azure Cosmos DB:

```yaml
# components/statestore-cosmos-encrypted.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://myaccount.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "daprStateStore"
  - name: collection
    value: "daprState"
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: primaryEncryptionKey
auth:
  secretStore: kubernetes-secrets
```

## Writing and Reading Encrypted State

Application code is unchanged - Dapr handles encryption transparently:

```python
# app.py
import os
import requests

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
STATE_URL = f"http://localhost:{DAPR_PORT}/v1.0/state/statestore"

# Write sensitive data - Dapr encrypts before storing
user_profile = {
    "userId": "user-123",
    "email": "alice@example.com",
    "creditCard": "4111-1111-1111-1111",
    "ssn": "123-45-6789"
}

resp = requests.post(STATE_URL, json=[
    {"key": "user-123-profile", "value": user_profile}
])
print(f"Written (encrypted at rest): {resp.status_code}")

# Read - Dapr decrypts transparently
resp = requests.get(f"{STATE_URL}/user-123-profile")
if resp.status_code == 200:
    profile = resp.json()
    print(f"Decrypted: {profile['email']}")

# Verify the raw value in Redis is ciphertext (unreadable without the key)
# redis-cli get "order-service||user-123-profile"
# Output: base64-encoded ciphertext, not JSON
```

## Key Rotation

Use the secondary key to rotate encryption keys without downtime:

```bash
# Step 1: Generate new primary key
NEW_KEY=$(openssl rand -hex 32)

# Step 2: Move current primary to secondary, set new primary
kubectl patch secret state-encryption-key \
  --type=merge \
  -p "{\"stringData\": {
    \"secondaryEncryptionKey\": \"$(kubectl get secret state-encryption-key -o jsonpath='{.data.primaryEncryptionKey}' | base64 -d)\",
    \"primaryEncryptionKey\": \"$NEW_KEY\"
  }}"

# Step 3: Restart Dapr sidecars to pick up new keys
kubectl rollout restart deployment/order-service
```

During the rotation window, Dapr decrypts with the primary key first; if that fails, it falls back to the secondary key. New writes use the primary key.

Re-encrypt all existing state after rotation:

```python
# reencrypt_state.py - re-write all keys to force re-encryption with new primary key
import requests

DAPR_URL = "http://localhost:3500/v1.0"
KEYS_TO_ROTATE = ["user-123-profile", "user-456-profile"]  # iterate your key list

for key in KEYS_TO_ROTATE:
    resp = requests.get(f"{DAPR_URL}/state/statestore/{key}")
    if resp.status_code == 200:
        value = resp.json()
        # Re-write triggers re-encryption with new primary key
        requests.post(f"{DAPR_URL}/state/statestore",
                      json=[{"key": key, "value": value}])
        print(f"Re-encrypted: {key}")
```

## Verifying Encryption

Confirm the backend stores ciphertext, not plaintext:

```bash
# For Redis: check the raw value
redis-cli get "order-service||user-123-profile"
# Returns something like: "enc:v1:aBcDeFgH..." (not JSON)

# For PostgreSQL:
psql -U postgres -d daprstate -c \
  "SELECT value FROM state WHERE key = 'order-service||user-123-profile';"
# Returns: base64-encoded encrypted blob, not plaintext JSON

# Dapr read still works (decrypts transparently):
curl http://localhost:3500/v1.0/state/statestore/user-123-profile
# Returns: {"userId":"user-123","email":"alice@example.com",...}
```

## Summary

Dapr state encryption is enabled by adding `primaryEncryptionKey` and `secondaryEncryptionKey` metadata fields to any state store component, referencing keys stored in a Dapr secret store. The sidecar applies AES-256-GCM encryption before every write and decrypts on every read, so application code requires no changes to benefit from encryption at rest. Key rotation uses the secondary key as a fallback during the transition, allowing a rolling restart to pick up the new primary key without any decryption failures.
