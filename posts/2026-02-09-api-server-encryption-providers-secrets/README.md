# How to Configure API Server Encryption Providers for Secrets at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption, API Server

Description: Learn how to configure API server encryption providers to encrypt Kubernetes Secrets at rest using various encryption methods including AES-CBC, AES-GCM, KMS, and external providers.

---

By default, Kubernetes stores Secrets in etcd as base64-encoded data, not encrypted. Anyone with etcd access can read all Secrets. Encryption at rest solves this problem by encrypting Secret data before it reaches etcd. The API server handles encryption and decryption transparently using configured encryption providers.

## Understanding Encryption Provider Types

Kubernetes supports several encryption provider types. The identity provider performs no encryption and serves as a fallback. The aescbc and aesgcm providers use AES encryption with keys you manage. The secretbox provider uses XSalsa20 and Poly1305. The kms provider delegates encryption to external KMS systems like AWS KMS, Azure Key Vault, or HashiCorp Vault.

Providers are tried in order during decryption, but only the first provider encrypts new data. This allows for key rotation by adding a new provider first while keeping old providers for reading existing data.

## Creating an Encryption Configuration File

Create the encryption configuration file at `/etc/kubernetes/enc/encryption-config.yaml`:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # Primary encryption provider (used for new writes)
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      # Fallback to unencrypted (for reading old data)
      - identity: {}
```

Generate a strong encryption key:

```bash
# Generate a random 32-byte key and base64 encode it
head -c 32 /dev/urandom | base64

# Example output: K7VqzJP8YhN9wX2mR5tF3nG8vL1cS6dE4pK9xZ0qW7Y=
```

Update the configuration with your key:

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
              secret: K7VqzJP8YhN9wX2mR5tF3nG8vL1cS6dE4pK9xZ0qW7Y=
      - identity: {}
```

Secure the configuration file:

```bash
# Set restrictive permissions
sudo chmod 600 /etc/kubernetes/enc/encryption-config.yaml
sudo chown root:root /etc/kubernetes/enc/encryption-config.yaml
```

## Configuring the API Server

Mount the encryption configuration into the API server pod and add the encryption provider flag. For kubeadm clusters, edit the API server manifest:

```bash
# Edit the API server manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add these configurations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Add this flag
    - --encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml
    # Other existing flags...
    - --etcd-servers=https://127.0.0.1:2379
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    # ... more flags

    # Add volume mount
    volumeMounts:
    - name: enc
      mountPath: /etc/kubernetes/enc
      readOnly: true
    # ... other volume mounts

  # Add volume
  volumes:
  - name: enc
    hostPath:
      path: /etc/kubernetes/enc
      type: DirectoryOrCreate
  # ... other volumes
```

The API server will automatically restart. Verify it is running:

```bash
# Wait for API server to restart
sleep 30

# Check API server status
kubectl get pods -n kube-system | grep kube-apiserver

# Verify API server is responding
kubectl get nodes
```

## Using AES-GCM Encryption

AES-GCM provides authenticated encryption and is more secure than AES-CBC:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aesgcm:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

AES-GCM includes authentication, so tampered ciphertext will be rejected during decryption.

## Using Secretbox Encryption

Secretbox uses XSalsa20 and Poly1305 for encryption and authentication:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - secretbox:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

Secretbox is faster than AES-GCM on systems without AES hardware acceleration.

## Configuring KMS Encryption Provider

KMS providers delegate encryption to external key management systems. This provides better key management, audit trails, and compliance features.

Example KMS configuration for AWS KMS:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          name: aws-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
          cachesize: 1000
          timeout: 3s
      - identity: {}
```

Deploy the AWS KMS plugin:

```bash
# Create KMS plugin directory
sudo mkdir -p /var/run/kmsplugin

# Deploy KMS plugin as a DaemonSet
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-kms-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: aws-kms-plugin
  template:
    metadata:
      labels:
        app: aws-kms-plugin
    spec:
      hostNetwork: true
      containers:
      - name: aws-kms-plugin
        image: amazon/aws-encryption-provider:latest
        env:
        - name: AWS_REGION
          value: us-west-2
        - name: KEY_ID
          value: arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012
        volumeMounts:
        - name: kmsplugin
          mountPath: /var/run/kmsplugin
      volumes:
      - name: kmsplugin
        hostPath:
          path: /var/run/kmsplugin
          type: DirectoryOrCreate
EOF
```

For HashiCorp Vault KMS:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          name: vault-kms
          endpoint: unix:///var/run/kmsplugin/vault.sock
          cachesize: 1000
          timeout: 3s
      - identity: {}
```

## Encrypting Existing Secrets

After enabling encryption, existing Secrets remain unencrypted until rewritten. Force re-encryption of all Secrets:

```bash
# Re-encrypt all secrets in all namespaces
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -

# Verify encryption status (secrets should be prefixed with k8s:enc:aescbc:v1:key1)
sudo ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/test-secret | hexdump -C
```

The output should show encrypted data, not plaintext.

## Implementing Key Rotation

Rotate encryption keys by adding a new key as the first provider:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # New key (encrypts new writes)
      - aescbc:
          keys:
            - name: key2
              secret: <new-base64-encoded-32-byte-key>
            # Old key (decrypts existing data)
            - name: key1
              secret: <old-base64-encoded-32-byte-key>
      - identity: {}
```

Update the API server configuration and restart it. Then re-encrypt all Secrets:

```bash
# Re-encrypt all secrets with the new key
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

After confirming all Secrets are re-encrypted, remove the old key from the configuration.

## Encrypting Multiple Resource Types

Extend encryption to other resource types beyond Secrets:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  # Encrypt Secrets
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}

  # Encrypt ConfigMaps
  - resources:
      - configmaps
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}

  # Encrypt Custom Resources
  - resources:
      - customresource.example.com
    providers:
      - aesgcm:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

## Using Multiple Encryption Providers

Configure different encryption methods for different scenarios:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # Try KMS first
      - kms:
          name: vault-kms
          endpoint: unix:///var/run/kmsplugin/vault.sock
          cachesize: 1000
          timeout: 3s
      # Fall back to AES-GCM
      - aesgcm:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      # Fall back to AES-CBC
      - aescbc:
          keys:
            - name: old-key
              secret: <old-base64-encoded-32-byte-key>
      # Allow reading old unencrypted data
      - identity: {}
```

This configuration allows reading Secrets encrypted with any provider while writing new Secrets with KMS.

## Verifying Encryption

Test that encryption is working correctly:

```bash
# Create a test secret
kubectl create secret generic test-secret \
  --from-literal=password=supersecret

# Read the secret from etcd
sudo ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/test-secret

# Output should show encrypted data like:
# k8s:enc:aescbc:v1:key1:<encrypted-data>

# Verify you cannot see "supersecret" in the output
sudo ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/test-secret | grep supersecret
# Should return no results
```

## Monitoring Encryption Status

Track encryption operations:

```bash
# Check API server logs for encryption errors
kubectl logs -n kube-system kube-apiserver-<node-name> | grep -i encrypt

# Monitor KMS plugin health
kubectl get pods -n kube-system -l app=aws-kms-plugin
kubectl logs -n kube-system -l app=aws-kms-plugin

# Verify all secrets are encrypted
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "Namespace: $ns"
  kubectl get secrets -n $ns -o name
done
```

## Troubleshooting Encryption Issues

Common problems and solutions:

```bash
# API server won't start after enabling encryption
# Check the configuration file syntax
cat /etc/kubernetes/enc/encryption-config.yaml

# Check API server logs
sudo journalctl -u kubelet -f | grep apiserver

# KMS plugin not responding
kubectl logs -n kube-system -l app=aws-kms-plugin
kubectl describe pod -n kube-system -l app=aws-kms-plugin

# Decrypt a secret manually (for debugging)
sudo ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/test-secret -w json
```

Encryption at rest is a critical security control for Kubernetes clusters. Configure it during initial cluster setup and implement key rotation processes to maintain strong encryption over time. Use KMS providers for production environments to leverage enterprise key management capabilities and compliance features.
