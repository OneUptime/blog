# How to Encrypt Kubernetes Secrets at Rest with EncryptionConfiguration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption

Description: Learn how to configure Kubernetes encryption at rest using EncryptionConfiguration to protect sensitive data stored in etcd and enhance cluster security.

---

By default, Kubernetes stores secrets in etcd as base64-encoded text, not encrypted. Anyone with direct access to etcd can read all secrets in your cluster. Encryption at rest protects secrets by encrypting them before writing to etcd, ensuring that even if someone gains access to the etcd database, they cannot read the secret data without the encryption key.

This guide demonstrates how to configure encryption at rest using Kubernetes EncryptionConfiguration.

## Understanding Encryption at Rest

Kubernetes supports encryption at rest through the EncryptionConfiguration API. When enabled, the API server encrypts resources before storing them in etcd and decrypts them when reading. The encryption happens transparently to applications using the API.

Key concepts:

- **Encryption providers**: Algorithms used to encrypt data (aescbc, aesgcm, secretbox, kms)
- **Identity provider**: No encryption, stores data as-is (default)
- **Provider order**: The first provider is used for encryption, all providers are tried for decryption
- **Key rotation**: Process of moving to new encryption keys

## Prerequisites

Before implementing encryption at rest, ensure you have:

- Access to control plane nodes
- Ability to restart the API server
- Root or sudo access on control plane machines
- Backup of etcd data
- Understanding of your cluster's high availability setup

## Creating an Encryption Configuration

Create an encryption configuration file on each control plane node:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

Generate a random 32-byte key and base64-encode it:

```bash
# Generate encryption key
head -c 32 /dev/urandom | base64
```

Example output:
```
XJ7f3kR2+9aH5mL1pN8qT0vW3yZ6xC4bA9dE1fG2hI=
```

Use this in your configuration:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: XJ7f3kR2+9aH5mL1pN8qT0vW3yZ6xC4bA9dE1fG2hI=
      - identity: {}  # Allow reading old unencrypted secrets
```

Save this file as `/etc/kubernetes/enc/encryption-config.yaml` on each control plane node.

Set appropriate file permissions:

```bash
chmod 600 /etc/kubernetes/enc/encryption-config.yaml
chown root:root /etc/kubernetes/enc/encryption-config.yaml
```

## Configuring the API Server

Modify the API server to use the encryption configuration. For kubeadm clusters, edit the static pod manifest:

```bash
# Edit the API server manifest
sudo vi /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add the encryption provider configuration flag:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.29.0
    command:
    - kube-apiserver
    - --encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml
    # ... other flags ...
    volumeMounts:
    - name: enc
      mountPath: /etc/kubernetes/enc
      readOnly: true
    # ... other volume mounts ...
  volumes:
  - name: enc
    hostPath:
      path: /etc/kubernetes/enc
      type: DirectoryOrCreate
  # ... other volumes ...
```

The API server will automatically restart after you save the file.

Verify the API server is running:

```bash
kubectl get pods -n kube-system | grep apiserver
```

## Encrypting Existing Secrets

After enabling encryption, existing secrets remain unencrypted. Encrypt them by rewriting:

```bash
# Encrypt all secrets in all namespaces
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

This reads each secret and writes it back, triggering encryption with the new provider.

For large clusters, do this namespace by namespace to avoid overwhelming the API server:

```bash
# Get all namespaces
NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

# Encrypt secrets in each namespace
for ns in $NAMESPACES; do
  echo "Encrypting secrets in namespace: $ns"
  kubectl get secrets -n $ns -o json | kubectl replace -f -
  sleep 5
done
```

Verify encryption is working:

```bash
# Get a secret name
SECRET_NAME=$(kubectl get secrets -n default -o jsonpath='{.items[0].metadata.name}')

# Read directly from etcd (requires etcdctl and proper certificates)
ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/$SECRET_NAME

# Should show encrypted data starting with k8s:enc:aescbc:v1:key1:
```

## Using Different Encryption Providers

Kubernetes supports multiple encryption providers:

**AES-CBC (recommended for most use cases):**

```yaml
providers:
  - aescbc:
      keys:
        - name: key1
          secret: <32-byte-base64-key>
```

**AES-GCM (faster but requires careful key management):**

```yaml
providers:
  - aesgcm:
      keys:
        - name: key1
          secret: <32-byte-base64-key>
```

**Secretbox (based on XSalsa20 and Poly1305):**

```yaml
providers:
  - secretbox:
      keys:
        - name: key1
          secret: <32-byte-base64-key>
```

## Encrypting Multiple Resource Types

Extend encryption to other sensitive resources:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: secret-key1
              secret: XJ7f3kR2+9aH5mL1pN8qT0vW3yZ6xC4bA9dE1fG2hI=
      - identity: {}

  - resources:
      - configmaps
    providers:
      - aescbc:
          keys:
            - name: configmap-key1
              secret: Y8KgTN2p9X5qR3wL6mH1fC4bA9dE1fG2hI7j3kZ0vW=
      - identity: {}

  - resources:
      - persistentvolumes
    providers:
      - aescbc:
          keys:
            - name: pv-key1
              secret: Z9LhUN3q0Y6rS4xM7nI2gD5cB0eF2gH3iJ8k4lA1wX=
      - identity: {}
```

## Key Rotation

Rotate encryption keys periodically for enhanced security:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key2  # New key for encryption
              secret: <new-32-byte-base64-key>
            - name: key1  # Old key for decryption
              secret: <old-32-byte-base64-key>
      - identity: {}
```

Key rotation process:

1. Add new key as first in the list
2. Restart API servers
3. Rewrite all secrets to encrypt with new key
4. Remove old key from configuration
5. Restart API servers again

```bash
# Step 3: Rewrite all secrets
kubectl get secrets --all-namespaces -o json | kubectl replace -f -

# Verify new key is used
ETCDCTL_API=3 etcdctl get /registry/secrets/default/test-secret
# Should show k8s:enc:aescbc:v1:key2:
```

After verification, remove the old key from the configuration.

## High Availability Considerations

For multi-master clusters, ensure consistency:

1. Apply the same encryption configuration to all control plane nodes
2. Use the same encryption keys on all API servers
3. Update API servers one at a time
4. Verify each API server works before updating the next

```bash
# On each control plane node
scp encryption-config.yaml root@control-plane-2:/etc/kubernetes/enc/
scp encryption-config.yaml root@control-plane-3:/etc/kubernetes/enc/

# Update API server manifests on each node
# Wait for each to become healthy before proceeding
```

## Monitoring Encryption Status

Create a script to verify encryption:

```bash
#!/bin/bash
# Check if secrets are encrypted

ENCRYPTED=0
UNENCRYPTED=0

# Get all secret keys from etcd
SECRETS=$(ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets --prefix --keys-only)

for secret in $SECRETS; do
  DATA=$(ETCDCTL_API=3 etcdctl \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt \
    --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key \
    get $secret)

  if echo "$DATA" | grep -q "k8s:enc:aescbc:v1:"; then
    ((ENCRYPTED++))
  else
    ((UNENCRYPTED++))
  fi
done

echo "Encrypted secrets: $ENCRYPTED"
echo "Unencrypted secrets: $UNENCRYPTED"
```

## Disaster Recovery

Backup both the encryption configuration and keys securely:

```bash
# Backup encryption config
sudo cp /etc/kubernetes/enc/encryption-config.yaml \
  /backup/encryption-config-$(date +%Y%m%d).yaml

# Store encryption keys in a secure vault
# Never commit keys to version control!
```

When restoring from backup, ensure:

1. Encryption configuration is restored to all control plane nodes
2. API server configuration references the correct file
3. All historical encryption keys are available for decryption

## Troubleshooting

**Problem**: API server fails to start after enabling encryption

**Solution**: Check API server logs:

```bash
sudo journalctl -u kubelet -f | grep apiserver
```

Common issues:
- Invalid base64 in key
- File permissions too permissive
- File path incorrect

**Problem**: Cannot read existing secrets

**Solution**: Ensure identity provider is included:

```yaml
providers:
  - aescbc:
      keys:
        - name: key1
          secret: ...
  - identity: {}  # Required for old unencrypted secrets
```

## Conclusion

Encrypting Kubernetes secrets at rest is essential for protecting sensitive data from unauthorized access to etcd. By configuring EncryptionConfiguration with strong encryption providers and implementing regular key rotation, you ensure that secrets remain secure even if the underlying storage is compromised.

Start with AES-CBC encryption for secrets, gradually extend to other sensitive resources, implement a key rotation schedule, and maintain secure backups of encryption configurations. Monitor encryption status with OneUptime to ensure all secrets remain properly protected over time.
