# How to Configure Flux CD with Kubernetes Secrets Encryption at Rest

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Encryption, Secrets, Etcd

Description: Learn how to configure Kubernetes secrets encryption at rest to protect sensitive data used by Flux CD controllers stored in etcd.

---

Flux CD stores sensitive data such as Git credentials, deploy keys, and webhook tokens in Kubernetes Secrets. By default, Kubernetes stores Secrets in etcd as base64-encoded plaintext. Enabling encryption at rest ensures that Secret data is encrypted in etcd, protecting it from unauthorized access to the etcd datastore.

## Why Encrypt Secrets at Rest

- **etcd compromise**: If an attacker gains access to etcd data, plaintext secrets are immediately exposed.
- **Backup security**: etcd backups contain all secrets. Encryption protects secrets even if backups are stolen.
- **Compliance**: Many regulatory frameworks (SOC2, PCI-DSS, HIPAA) require encryption of sensitive data at rest.
- **Defense in depth**: Even with RBAC and network policies, encrypting the storage layer adds another security boundary.

## Step 1: Create an Encryption Configuration

Create an EncryptionConfiguration that tells the API server how to encrypt Secrets:

```yaml
# encryption-config.yaml
# Kubernetes API server encryption configuration for Secrets
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # AES-CBC encryption (recommended for most use cases)
      - aescbc:
          keys:
            - name: flux-key-1
              # Generate with: head -c 32 /dev/urandom | base64
              secret: <BASE64_ENCODED_32_BYTE_KEY>
      # Identity provider as fallback for reading unencrypted secrets
      - identity: {}
```

Generate the encryption key:

```bash
# Generate a 32-byte encryption key
ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)
echo "Encryption key: $ENCRYPTION_KEY"

# Create the encryption configuration file
cat > /etc/kubernetes/encryption-config.yaml << EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: flux-key-1
              secret: ${ENCRYPTION_KEY}
      - identity: {}
EOF
```

## Step 2: Configure the API Server

Add the encryption configuration to the kube-apiserver:

```yaml
# kube-apiserver configuration snippet
# Add the encryption provider config flag
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
    - name: kube-apiserver
      command:
        - kube-apiserver
        # Add this flag to enable encryption at rest
        - --encryption-provider-config=/etc/kubernetes/encryption-config.yaml
        # Other existing flags...
      volumeMounts:
        - name: encryption-config
          mountPath: /etc/kubernetes/encryption-config.yaml
          readOnly: true
  volumes:
    - name: encryption-config
      hostPath:
        path: /etc/kubernetes/encryption-config.yaml
        type: File
```

## Step 3: Encrypt Existing Flux Secrets

After enabling encryption, existing Secrets are still stored unencrypted. Re-encrypt them:

```bash
# Re-encrypt all secrets in the flux-system namespace
kubectl get secrets -n flux-system -o json | \
  kubectl replace -f -

# Re-encrypt specific Flux secrets
kubectl get secret flux-system -n flux-system -o json | kubectl replace -f -
kubectl get secret github-webhook-token -n flux-system -o json | kubectl replace -f -

# Re-encrypt all secrets across the cluster
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

## Step 4: Verify Encryption is Working

Confirm that secrets are encrypted in etcd:

```bash
# Read a secret directly from etcd (requires etcd access)
# The data should be encrypted, not base64-encoded plaintext
ETCDCTL_API=3 etcdctl get /registry/secrets/flux-system/flux-system \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key | hexdump -C | head -20

# You should see the encryption prefix (e.g., "k8s:enc:aescbc:v1:flux-key-1")
# instead of readable JSON data

# Verify through the API that secrets are still readable
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity\.pub}' | base64 -d
```

## Step 5: Use KMS Provider for Production

For production environments, use a Key Management Service (KMS) instead of locally stored keys:

```yaml
# encryption-config-kms.yaml
# Use AWS KMS for secret encryption (production recommended)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: aws-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
          timeout: 3s
      - identity: {}
```

## Step 6: Configure Managed Kubernetes Encryption

For managed Kubernetes services, encryption at rest is typically a configuration option:

```bash
# AWS EKS: Enable envelope encryption
aws eks create-cluster \
  --name flux-cluster \
  --encryption-config '[{
    "resources": ["secrets"],
    "provider": {
      "keyArn": "arn:aws:kms:us-east-1:123456789:key/your-kms-key-id"
    }
  }]'

# Or enable on an existing cluster
aws eks associate-encryption-config \
  --cluster-name flux-cluster \
  --encryption-config '[{
    "resources": ["secrets"],
    "provider": {
      "keyArn": "arn:aws:kms:us-east-1:123456789:key/your-kms-key-id"
    }
  }]'

# GKE: Enable application-layer secret encryption
gcloud container clusters create flux-cluster \
  --database-encryption-key=projects/myproject/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key

# AKS: Enable encryption at rest (enabled by default with platform-managed keys)
az aks create \
  --name flux-cluster \
  --enable-encryption-at-host
```

## Step 7: Key Rotation

Periodically rotate the encryption key:

```bash
# Generate a new encryption key
NEW_KEY=$(head -c 32 /dev/urandom | base64)

# Update the encryption config with the new key as the first provider
# and keep the old key for decrypting existing secrets
cat > /etc/kubernetes/encryption-config.yaml << EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: flux-key-2
              secret: ${NEW_KEY}
            - name: flux-key-1
              secret: ${OLD_KEY}
      - identity: {}
EOF

# Restart the API server to pick up the new configuration
# Then re-encrypt all secrets with the new key
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

## Best Practices

1. **Enable encryption before deploying Flux**: Set up encryption at rest before storing any sensitive data.
2. **Use KMS in production**: Local key files are suitable for testing. Use KMS providers for production clusters.
3. **Rotate encryption keys**: Rotate keys periodically and re-encrypt all secrets after rotation.
4. **Protect the encryption config**: The encryption configuration file contains the master key. Secure it with filesystem permissions.
5. **Combine with SOPS**: Use Flux's SOPS integration to encrypt secrets in Git, providing encryption both at rest and in transit.
6. **Audit secret access**: Use Kubernetes audit logs to monitor who accesses encrypted secrets.

Encrypting Kubernetes secrets at rest is a critical security measure for Flux CD deployments. It protects sensitive credentials stored in etcd from unauthorized access, even if the underlying storage is compromised.
