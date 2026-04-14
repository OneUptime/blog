# How to Encrypt Application State in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Encryption, State Management, Security, AES

Description: Learn how to enable client-side encryption for Dapr application state so that sensitive data is encrypted before being written to the state store backend.

---

## Why Encrypt Application State?

By default, Dapr stores state values in plaintext in the configured backend (Redis, Cosmos DB, etc.). If the backend is compromised, sensitive data like user sessions, PII, or financial records is exposed. Client-side encryption in Dapr encrypts data before it leaves the sidecar.

## Enabling State Encryption

Add the encryption metadata to your state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: primaryEncryptionKey
      secretKeyRef:
        name: state-encryption-key
        key: key
    - name: secondaryEncryptionKey
      secretKeyRef:
        name: state-encryption-key-old
        key: key
```

Create the encryption key secret:

```bash
# Generate a 256-bit AES key
openssl rand -hex 32

# Store in Kubernetes secret
kubectl create secret generic state-encryption-key \
  --from-literal=key="your-32-byte-hex-key-here"
```

## Key Requirements

Dapr state encryption uses AES internally (the specific mode is an implementation detail managed by Dapr). The encryption key must be 16, 24, or 32 bytes, corresponding to AES-128, AES-192, or AES-256.

## Using Encryption in Your Application

Once configured, your application code does not change. Dapr transparently encrypts on write and decrypts on read:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Write - encrypted automatically by the sidecar
await client.state.save('statestore', [
  { key: 'user-profile:alice', value: { ssn: '123-45-6789', dob: '1990-01-01' } }
]);

// Read - decrypted automatically by the sidecar
const profile = await client.state.get('statestore', 'user-profile:alice');
console.log(profile.ssn); // '123-45-6789' - decrypted
```

If you inspect Redis directly, you will see the encrypted ciphertext:

```bash
redis-cli GET "myapp||user-profile:alice"
# Returns: encrypted binary blob
```

## Key Rotation

Use a primary and secondary key to enable zero-downtime key rotation:

1. Move the current primary key to `secondaryEncryptionKey`
2. Set the new key as `primaryEncryptionKey`
3. New writes use the new primary key
4. Old reads still decrypt using the secondary key
5. After re-encrypting all data with the new key, remove the secondary key

```bash
# Trigger re-encryption by reading and re-writing all state
# (Application-level migration script)
```

## Verifying Encryption

```bash
# Read directly from Redis - should be encrypted
redis-cli GET "myapp||user-profile:alice"
# Output: garbled ciphertext

# Read via Dapr - should be decrypted
curl http://localhost:3500/v1.0/state/statestore/user-profile:alice
# Output: {"ssn":"123-45-6789","dob":"1990-01-01"}
```

## Summary

Enable Dapr client-side state encryption by adding `primaryEncryptionKey` metadata to your state store component referencing a Kubernetes secret. Dapr transparently encrypts data before writing to the backend and decrypts on reads - no application code changes are needed. Support key rotation using the `secondaryEncryptionKey` for reading data encrypted with the old key.
