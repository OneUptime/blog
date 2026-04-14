# How to Configure State Store Encryption at Rest with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Encryption, State Store, Security, Key Management

Description: Learn how to configure Dapr state store encryption at rest using component-level encryption settings, key rotation, and integration with cloud KMS providers.

---

## State Store Encryption Approaches

Dapr supports two complementary encryption strategies for state stores: client-side encryption (Dapr encrypts values before storing them) and server-side encryption (the backing store encrypts data on disk). For maximum security, enable both. This guide focuses on Dapr's built-in client-side encryption configuration, which ensures data is encrypted even if the backing store is compromised.

## Enabling Client-Side Encryption

Dapr's client-side state encryption is configured in the component definition using `primaryEncryptionKey` and optionally `secondaryEncryptionKey` for key rotation:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: encrypted-statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-keys
      key: primary-key
  - name: secondaryEncryptionKey
    secretKeyRef:
      name: state-encryption-keys
      key: secondary-key
```

Dapr uses AES-GCM for encryption, with the key size (128, 192, or 256 bits) determined by the length of the key provided. The key must be a hex-encoded string (e.g., 32 hex characters for a 128-bit key or 64 hex characters for a 256-bit key).

## Generating Encryption Keys

```bash
# Generate a 256-bit (32-byte) hex-encoded key
PRIMARY_KEY=$(openssl rand 32 | hexdump -v -e '/1 "%02x"')
SECONDARY_KEY=$(openssl rand 32 | hexdump -v -e '/1 "%02x"')

# Store in Kubernetes secret
kubectl create secret generic state-encryption-keys \
  --namespace production \
  --from-literal=primary-key="$PRIMARY_KEY" \
  --from-literal=secondary-key="$SECONDARY_KEY"
```

## Integrating with AWS KMS for Key Management

For production environments, store encryption keys in a KMS and rotate them automatically:

```bash
# Create a KMS key
aws kms create-key \
  --description "Dapr state store encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --region us-east-1

# Generate a data key and store it
aws kms generate-data-key \
  --key-id alias/dapr-state-key \
  --key-spec AES_256 \
  --query 'Plaintext' \
  --output text | \
kubectl create secret generic state-encryption-keys \
  --namespace production \
  --from-literal=primary-key=-
```

## Using Dapr Secrets API for Key Retrieval

Reference keys from a secrets store rather than a Kubernetes secret by setting `auth.secretStore` to the name of a Dapr secret store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: encrypted-statestore
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-secret
      key: connectionString
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-keys
      key: primary-key
  auth:
    secretStore: vault-kv-dapr
```

Where `vault-kv-dapr` is a Dapr secret store component backed by HashiCorp Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-kv-dapr
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
```

## Key Rotation Procedure

Rotate the primary key without losing access to existing state:

```bash
# Step 1: Move current primary to secondary
kubectl patch secret state-encryption-keys -n production \
  --type=json \
  -p='[{"op": "replace", "path": "/data/secondary-key", "value": "'$(kubectl get secret state-encryption-keys -n production -o jsonpath='{.data.primary-key}')'"}]'

# Step 2: Generate and set new primary key
NEW_KEY=$(echo -n "$(openssl rand 32 | hexdump -v -e '/1 "%02x"')" | base64)
kubectl patch secret state-encryption-keys -n production \
  --type=json \
  -p='[{"op": "replace", "path": "/data/primary-key", "value": "'$NEW_KEY'"}]'

# Step 3: Restart pods to pick up new keys
kubectl rollout restart deployment -n production -l dapr.io/enabled=true
```

Dapr tracks which encryption key was used for each state item. During rotation, existing data is decrypted with the secondary key and new writes use the primary key, enabling zero-downtime rotation. Old data is re-encrypted with the new primary key when the application writes it again.

## Verifying Encryption

Confirm data is encrypted in the backing store by inspecting values directly:

```bash
# Connect to Redis and check a key - value should be unreadable binary
kubectl exec -n redis redis-master-0 -- redis-cli GET "myapp||mykey"
# Output: binary/encrypted data, not JSON
```

## Summary

Dapr state store encryption is enabled by adding `primaryEncryptionKey` and `secondaryEncryptionKey` to component metadata, with Dapr performing AES-GCM encryption before values leave the sidecar. Key rotation uses the two-key scheme: promote the current primary to secondary, then set a new primary key, and restart pods without downtime. Dapr tracks which key encrypted each item, so existing data is decrypted with the secondary key while new writes use the primary key. Integrating with cloud KMS or HashiCorp Vault centralizes key management and enables automatic rotation policies.
