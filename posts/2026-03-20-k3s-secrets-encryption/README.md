# How to Configure K3s Secrets Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Security, Encryption, Secret, Compliance, DevOps

Description: Learn how to enable and manage secrets encryption at rest in K3s to protect sensitive data stored in the cluster datastore.

## Introduction

By default, Kubernetes stores secrets as base64-encoded data in etcd (or SQLite in K3s) - which is **not** encryption. Anyone with access to the datastore can read all secrets. Enabling secrets encryption at rest ensures that sensitive data like passwords, API keys, and certificates is encrypted by the API server before being stored. In K3s, the managed workflow uses `aescbc` by default, and newer releases can also use `secretbox`. This is an important security control for compliance programs like PCI-DSS, HIPAA, and SOC 2.

## Understanding K3s Secrets Encryption

K3s supports two approaches:
1. **Simple `--secrets-encryption` flag**: K3s manages encryption keys automatically
2. **`--secrets-encryption-provider` flag**: K3s still manages the config, but you choose a supported provider such as `secretbox`

## Step 1: Enable Secrets Encryption (Simple Method)

The simplest approach - let K3s manage everything:

```bash
# Install K3s with secrets encryption enabled

curl -sfL https://get.k3s.io | sh -s - server --secrets-encryption
```

Or via config file:

```yaml
# /etc/rancher/k3s/config.yaml
secrets-encryption: true
```

Restart K3s to apply:

```bash
systemctl restart k3s
```

## Step 2: Verify Encryption is Active

```bash
# Check the generated encryption config
cat /var/lib/rancher/k3s/server/cred/encryption-config.json

# Verify a secret is encrypted in the datastore
# Create a test secret
kubectl create secret generic test-secret \
  --from-literal=password=mysecretpassword \
  -n default

# If using SQLite, check if data is encrypted
# The secret data should be unreadable (encrypted)
sqlite3 /var/lib/rancher/k3s/server/db/state.db \
  "SELECT HEX(value) FROM kine WHERE name = '/registry/secrets/default/test-secret'"
# Should show encrypted bytes, NOT plaintext JSON

# If using embedded etcd, check with etcdctl
ETCDCTL_API=3 etcdctl \
  --endpoints https://127.0.0.1:2379 \
  --cacert /var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert /var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key /var/lib/rancher/k3s/server/tls/etcd/client.key \
  get /registry/secrets/default/test-secret --print-value-only | xxd | head -5
# Should start with "k8s:enc:" followed by the configured provider
```

## Step 3: Choose an Encryption Provider

For newer K3s releases, you can keep K3s managing the encryption config but choose a different provider. `secretbox` is supported starting with the April 2025 releases: v1.30.12+k3s1, v1.31.8+k3s1, v1.32.4+k3s1, and v1.33.0+k3s1.

```yaml
# /etc/rancher/k3s/config.yaml
secrets-encryption: true
secrets-encryption-provider: secretbox
```

```bash
systemctl restart k3s
```

If you change providers on an existing cluster, rotate the encryption keys afterward as shown in Step 4 so K3s rewrites data using the new provider.

## Step 4: Rotate Encryption Keys

On current K3s releases (v1.30.5+k3s1 / v1.31.1+k3s1 and later), rotate keys with the built-in command:

```bash
# Start key rotation
k3s secrets-encrypt rotate-keys

# Check progress
k3s secrets-encrypt status

# Wait until the rotation stage reports "reencrypt_finished"
k3s secrets-encrypt status
```

On HA clusters, restart each server one at a time after reencryption finishes so every server picks up the updated configuration. If you're on an older K3s release train, follow the legacy `prepare` / `rotate` / `reencrypt` procedure from the K3s docs.

## Step 5: Check Encryption Status

```bash
# K3s provides a built-in status command
k3s secrets-encrypt status

# Expected output when encryption is active and healthy:
# Encryption Status: Enabled
# Current Rotation Stage: start
# Server Encryption Hashes: All hashes match
```

## Step 6: Migrate Existing Secrets to Encryption

If you enabled encryption on an existing cluster, existing secrets remain in their previous storage format until they are rewritten. Force a rewrite through the API server:

```bash
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

## Step 7: Verify Specific Secrets Are Encrypted

```bash
# Create a test secret
kubectl create secret generic verify-encryption-test \
  --from-literal=api-key=super-secret-api-key

# Check it's encrypted in the datastore
# For SQLite:
sqlite3 /var/lib/rancher/k3s/server/db/state.db <<'EOF'
SELECT
  name,
  HEX(SUBSTR(value, 1, 20)) as value_start
FROM kine
WHERE name = '/registry/secrets/default/verify-encryption-test';
EOF

# The hex value should NOT start with "7B" (0x7B = '{', start of plaintext JSON)
# It should start with the hex for the "k8s:enc:" prefix instead

# If encrypted, start will be:
# 6B38733A656E633A  ("k8s:enc:")
```

## Step 8: Backup Encryption Keys

Always back up your encryption keys separately from the cluster:

```bash
#!/bin/bash
# backup-encryption-keys.sh

BACKUP_DIR="/secure-backup/k3s-encryption-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup K3s auto-generated encryption config
cp /var/lib/rancher/k3s/server/cred/encryption-config.json "$BACKUP_DIR/"

# Set restrictive permissions
chmod 600 "$BACKUP_DIR/"*
chmod 700 "$BACKUP_DIR"

# Optionally encrypt the backup with GPG
gpg --symmetric --cipher-algo AES256 \
  "$BACKUP_DIR/encryption-config.json"

echo "Encryption keys backed up to: $BACKUP_DIR"
echo "WARNING: Losing these keys means losing access to all encrypted secrets!"
```

## Conclusion

Secrets encryption at rest is a critical security control for any K3s cluster storing sensitive data. K3s's `--secrets-encryption` flag provides a simple, managed approach, while `--secrets-encryption-provider` lets you choose a different supported provider on newer releases. Always backup your encryption keys in a secure, separate location - losing them means permanently losing access to all encrypted secrets. For compliance requirements, combine secrets encryption with RBAC policies, audit logging, and TLS to create a comprehensive security posture.
