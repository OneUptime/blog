# How to Configure Kubernetes Secrets Encryption at Rest on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Encryption, Secrets, etcd Security

Description: Step-by-step guide to configuring encryption at rest for Kubernetes secrets stored in etcd on Talos Linux clusters with key rotation procedures.

---

By default, Kubernetes secrets are stored as base64-encoded plaintext in etcd. Anyone with access to the etcd database can read every secret in your cluster. This includes database passwords, API keys, TLS certificates, and any other sensitive data your applications store. Encrypting secrets at rest ensures that even if someone gains access to the etcd data files, the secrets remain unreadable without the encryption key.

Talos Linux makes it straightforward to enable secrets encryption through its machine configuration. This guide covers the setup, verification, and key rotation process.

## Understanding the Risk

To understand why encryption at rest matters, consider what happens without it:

```bash
# Without encryption, etcd stores secrets as base64-encoded plaintext
# If an attacker accesses the etcd data directory or a backup,
# they can decode every secret:

# Example: a secret stored in etcd without encryption
# Key: /registry/secrets/production/database-credentials
# Value: {"apiVersion":"v1","data":{"password":"cGFzc3dvcmQxMjM="},...}
#
# base64 decode: password123
```

With encryption at rest, the same secret stored in etcd is encrypted and unreadable without the encryption key.

## Encryption Providers in Kubernetes

Kubernetes supports several encryption providers:

- **secretbox** (recommended): Uses XSalsa20 and Poly1305. Fast and secure.
- **aesgcm**: Uses AES-GCM. Good but requires careful key management to avoid nonce reuse.
- **aescbc**: Uses AES-CBC. Older, still widely used.
- **identity**: No encryption (the default). Secrets stored as plaintext.

Talos Linux supports configuring the secretbox provider directly through the machine configuration.

## Enabling Encryption at Rest

### Method 1: Using Talos Machine Configuration (Recommended)

The simplest approach is to use the built-in `secretboxEncryptionSecret` field.

```bash
# Generate a 32-byte encryption key
ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)
echo "Encryption key: $ENCRYPTION_KEY"
# Save this key securely - you need it for recovery
```

Add the key to your machine configuration:

```yaml
# Machine configuration for control plane nodes
cluster:
  secretboxEncryptionSecret: "your-base64-encoded-32-byte-key-here"
```

Apply the configuration to all control plane nodes:

```bash
# Apply to each control plane node
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Configuring encryption on $cp..."
  talosctl -n $cp apply-config --file cp-config-with-encryption.yaml
  sleep 30
  talosctl -n $cp health
done
```

### Method 2: Using a Custom Encryption Configuration

For more control over the encryption configuration, use the API server's encryption provider config.

```yaml
# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
      - configmaps  # Optional: encrypt configmaps too
    providers:
      - secretbox:
          keys:
            - name: key1
              secret: "your-base64-encoded-32-byte-key"
      - identity: {}  # Fallback to read unencrypted data
```

Configure Talos to use this encryption config:

```yaml
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption/encryption-config.yaml
    extraVolumes:
      - hostPath: /etc/kubernetes/encryption
        mountPath: /etc/kubernetes/encryption
        name: encryption-config
        readOnly: true
  # Provide the encryption config file
  files:
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: EncryptionConfiguration
        resources:
          - resources:
              - secrets
            providers:
              - secretbox:
                  keys:
                    - name: key1
                      secret: "your-base64-encoded-32-byte-key"
              - identity: {}
      permissions: 0o600
      path: /etc/kubernetes/encryption/encryption-config.yaml
```

## Verifying Encryption is Active

After applying the configuration, verify that encryption is working.

### Check API Server Configuration

```bash
# Verify the API server has the encryption config
talosctl -n 10.0.1.10 read /etc/kubernetes/manifests/kube-apiserver.yaml | \
  grep encryption
```

### Create a Test Secret and Verify It Is Encrypted

```bash
# Create a test secret
kubectl create secret generic encryption-test \
  --from-literal=testkey=testvalue \
  -n default

# Read the secret directly from etcd to verify it is encrypted
talosctl -n 10.0.1.10 etcd get /registry/secrets/default/encryption-test

# The output should be encrypted (not readable plaintext)
# You should see binary data or encrypted content starting with "k8s:enc:secretbox:v1:"
```

If the output shows the `k8s:enc:secretbox:v1:` prefix followed by encrypted data, encryption is working correctly.

### Verify Using etcd Directly

```bash
# Use etcdctl to read the raw data
# This requires etcd client certificates
talosctl -n 10.0.1.10 etcd get /registry/secrets/default/encryption-test -o hex

# Encrypted output will be binary/hex data
# Unencrypted output would show readable JSON
```

## Encrypting Existing Secrets

Enabling encryption only affects newly created or updated secrets. Existing secrets remain unencrypted until they are rewritten.

```bash
# Re-encrypt all existing secrets
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -

# This reads each secret and writes it back,
# triggering encryption with the new key
```

For a more controlled approach:

```bash
#!/bin/bash
# reencrypt-secrets.sh
# Re-encrypts all secrets in the cluster

NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  SECRETS=$(kubectl get secrets -n $ns -o jsonpath='{.items[*].metadata.name}')
  for secret in $SECRETS; do
    echo "Re-encrypting: $ns/$secret"
    kubectl get secret $secret -n $ns -o yaml | kubectl replace -f - 2>/dev/null || \
      echo "  Skipped (immutable or system secret)"
  done
done

echo "Re-encryption complete"
```

## Key Rotation

Periodically rotating the encryption key is a security best practice. The process involves adding a new key, re-encrypting all secrets, and then removing the old key.

### Step 1: Generate a New Key

```bash
NEW_KEY=$(head -c 32 /dev/urandom | base64)
echo "New encryption key: $NEW_KEY"
```

### Step 2: Add the New Key to the Configuration

The new key goes first in the list (making it the primary key for new writes), and the old key stays as a secondary key (so existing secrets can still be decrypted).

```yaml
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption/encryption-config.yaml
  files:
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: EncryptionConfiguration
        resources:
          - resources:
              - secrets
            providers:
              - secretbox:
                  keys:
                    - name: key2
                      secret: "new-base64-encoded-key"
                    - name: key1
                      secret: "old-base64-encoded-key"
              - identity: {}
      permissions: 0o600
      path: /etc/kubernetes/encryption/encryption-config.yaml
```

### Step 3: Apply and Restart

```bash
# Apply to all control plane nodes
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  talosctl -n $cp apply-config --file cp-config-new-key.yaml
  sleep 60
  talosctl -n $cp health
done
```

### Step 4: Re-encrypt All Secrets with the New Key

```bash
# This rewrites all secrets, encrypting them with the new primary key
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

### Step 5: Remove the Old Key

Once all secrets are re-encrypted with the new key, remove the old key from the configuration.

```yaml
# Final config with only the new key
providers:
  - secretbox:
      keys:
        - name: key2
          secret: "new-base64-encoded-key"
  - identity: {}
```

```bash
# Apply final configuration
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  talosctl -n $cp apply-config --file cp-config-final-key.yaml
  sleep 30
done
```

### Step 6: Verify

```bash
# Create a new secret and verify it uses the new key
kubectl create secret generic rotation-test \
  --from-literal=key=value -n default

# Check etcd to verify encryption
talosctl -n 10.0.1.10 etcd get /registry/secrets/default/rotation-test
# Should show encrypted data with the new key

# Clean up
kubectl delete secret rotation-test -n default
```

## Monitoring Encryption Status

Create a periodic check to verify encryption is still active.

```bash
#!/bin/bash
# check-encryption.sh

echo "=== Secrets Encryption Audit ==="

# Check API server configuration
echo "Checking API server encryption config..."
CONFIG=$(talosctl -n 10.0.1.10 read /etc/kubernetes/manifests/kube-apiserver.yaml 2>/dev/null)
if echo "$CONFIG" | grep -q "encryption-provider-config"; then
  echo "  Encryption provider config: PRESENT"
else
  echo "  Encryption provider config: MISSING [CRITICAL]"
fi

# Create and verify a test secret
echo "Testing secret encryption..."
kubectl create secret generic encryption-check-$(date +%s) \
  --from-literal=test=value -n default > /dev/null 2>&1

LATEST_SECRET=$(kubectl get secrets -n default --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')

RAW_DATA=$(talosctl -n 10.0.1.10 etcd get /registry/secrets/default/$LATEST_SECRET 2>/dev/null)
if echo "$RAW_DATA" | grep -q "k8s:enc:"; then
  echo "  Secret encryption: ACTIVE"
else
  echo "  Secret encryption: INACTIVE [CRITICAL]"
fi

# Clean up test secret
kubectl delete secret $LATEST_SECRET -n default > /dev/null 2>&1

echo "=== Audit Complete ==="
```

## Backup Considerations

When you enable encryption at rest, your backups need special attention.

```bash
# The encryption key MUST be backed up alongside etcd snapshots
# Without the key, you cannot read the encrypted data from backups

# Back up the encryption key
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.secretboxEncryptionSecret' > encryption-key-backup.txt

# Store this backup in a separate, secure location
# NOT in the same backup as the etcd snapshot
# Use a secrets manager like Vault
vault kv put secret/talos/encryption-key \
  key="$(cat encryption-key-backup.txt)"
```

## Conclusion

Encrypting Kubernetes secrets at rest on Talos Linux protects sensitive data from being read directly from etcd storage or backups. Enable it through the machine configuration, verify it is working by checking raw etcd data, re-encrypt existing secrets, and establish a key rotation schedule. Always back up your encryption keys separately and securely - losing the key means losing access to your encrypted secrets. This is a fundamental security control that every production Talos Linux cluster should have enabled.
