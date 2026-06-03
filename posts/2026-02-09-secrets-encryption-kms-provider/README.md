# How to Set Up Kubernetes Secrets Encryption at Rest Using KMS Provider Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption, KMS, Secrets Management, Compliance

Description: Configure Kubernetes secrets encryption at rest using KMS provider plugins with AWS KMS, Azure Key Vault, or Google Cloud KMS to meet compliance requirements and protect sensitive data stored in etcd.

---

Kubernetes stores secrets in etcd by default using base64 encoding, which provides no real encryption. Anyone with etcd access can read all secrets in plaintext. For production clusters handling sensitive data, this is unacceptable. Encryption at rest using KMS provider plugins protects secrets even if attackers gain etcd access.

KMS provider integration delegates encryption key management to enterprise-grade key management services like AWS KMS, Azure Key Vault, or Google Cloud KMS. These services provide hardware security modules, automatic key rotation, and comprehensive audit logging that satisfy compliance requirements like PCI-DSS, HIPAA, and SOC2.

## Understanding KMS Provider Architecture

Kubernetes API server encryption works through a provider plugin model. With the current KMS v2 provider, the API server calls a KMS plugin via Unix socket to encrypt a DEK seed with a key encryption key (KEK). The API server caches the encrypted seed and derives single-use data encryption keys (DEKs) to encrypt individual resources before storing them in etcd.

When reading secrets, the process reverses: the API server decrypts the cached encrypted seed through the KMS plugin when needed, derives the DEK, and decrypts the secret data. This envelope encryption approach means the KEK never leaves the KMS service, providing stronger security guarantees.

## Installing AWS KMS Provider Plugin

Start by deploying the AWS KMS encryption provider on each API server node for self-managed clusters. For EKS clusters, use the managed EKS encryption configuration shown later instead of deploying a provider pod yourself:

```bash
# Create KMS key in AWS
export KMS_KEY_ID=$(aws kms create-key \
  --description "Kubernetes secrets encryption" \
  --tags TagKey=Purpose,TagValue=K8sSecretsEncryption \
  --query 'KeyMetadata.KeyId' \
  --output text)

# Create key alias
aws kms create-alias \
  --alias-name alias/kubernetes-secrets \
  --target-key-id "$KMS_KEY_ID"

echo "KMS Key ID: $KMS_KEY_ID"

# Grant API server permission to use the key
aws kms create-grant \
  --key-id "$KMS_KEY_ID" \
  --grantee-principal arn:aws:iam::ACCOUNT_ID:role/K8sAPIServerRole \
  --operations Encrypt Decrypt DescribeKey
```

Then run the provider as a static pod on every API server node. Use the image you build or publish for the `kubernetes-sigs/aws-encryption-provider` binary, and make sure the `--listen` socket path matches the endpoint in the Kubernetes `EncryptionConfiguration`.

## Configuring API Server Encryption with KMS

Create encryption configuration that uses the KMS provider:

```yaml
# encryption-config-kms.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # KMS provider for new secrets
      - kms:
          apiVersion: v2
          name: aws-kms-provider
          endpoint: unix:///var/run/kmsplugin/socket.sock
          timeout: 3s

      # Identity provider for reading old unencrypted secrets during migration
      - identity: {}
```

For self-managed clusters, update the API server configuration:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
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
    - --encryption-provider-config=/etc/kubernetes/encryption-config.yaml
    - --encryption-provider-config-automatic-reload=true
    volumeMounts:
    - name: encryption-config
      mountPath: /etc/kubernetes/encryption-config.yaml
      readOnly: true
    - name: kms-socket
      mountPath: /var/run/kmsplugin
  volumes:
  - name: encryption-config
    hostPath:
      path: /etc/kubernetes/encryption-config.yaml
      type: File
  - name: kms-socket
    hostPath:
      path: /var/run/kmsplugin
      type: DirectoryOrCreate
```

For EKS, enable encryption through the AWS Console or CLI:

```bash
# Enable secrets encryption on existing EKS cluster
aws eks associate-encryption-config \
  --cluster-name my-cluster \
  --encryption-config '[{
    "resources": ["secrets"],
    "provider": {
      "keyArn": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    }
  }]'

# Wait for encryption to be active
aws eks describe-cluster \
  --name my-cluster \
  --query 'cluster.encryptionConfig'
```

EKS clusters running Kubernetes 1.28 or later already use default KMS v2 envelope encryption for all Kubernetes API data with an AWS-owned key. Use `associate-encryption-config` when you need to associate a customer managed AWS KMS key for secrets encryption.

## Migrating Existing Secrets to Encrypted Storage

After enabling KMS encryption on a self-managed cluster, existing secrets remain unencrypted in etcd until rewritten:

```bash
# migrate-secrets-encryption.sh
#!/bin/bash

echo "Starting secrets encryption migration..."

# Rewrite all secrets to trigger encryption. Retry if a conflicting write occurs.
kubectl get secrets --all-namespaces -o json | kubectl replace -f -

echo "Migration complete!"
```

Run the migration:

```bash
chmod +x migrate-secrets-encryption.sh
./migrate-secrets-encryption.sh
```

Verify secrets are encrypted in etcd:

```bash
# Check etcd directly (requires etcd access)
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/default/mysecret

# Should see encrypted data, not base64 plaintext
```

## Implementing Azure Key Vault Provider

For AKS clusters, configure Azure Key Vault integration through the AKS control plane. On Kubernetes 1.33 and later, the newer AKS KMS data encryption experience uses `--kms-infrastructure-encryption Enabled`; the legacy provider configuration below is still used for older supported AKS clusters.

Create the Azure Key Vault key:

```bash
# Create Key Vault
az keyvault create \
  --name k8s-secrets-kv \
  --resource-group k8s-rg \
  --location eastus

# Create encryption key
az keyvault key create \
  --vault-name k8s-secrets-kv \
  --name k8s-encryption-key \
  --protection hsm \
  --kty RSA-HSM \
  --size 2048

# Get the key ID for the AKS command
KEY_ID=$(az keyvault key show \
  --vault-name k8s-secrets-kv \
  --name k8s-encryption-key \
  --query key.kid \
  --output tsv)
KEY_ID_NO_VERSION=$(echo "$KEY_ID" | sed 's|/[^/]*$||')

# Grant the AKS identity access
az keyvault set-policy \
  --name k8s-secrets-kv \
  --object-id <aks-identity-object-id> \
  --key-permissions encrypt decrypt
```

Enable KMS etcd encryption on an existing AKS cluster:

```bash
az aks update \
  --name my-aks-cluster \
  --resource-group k8s-rg \
  --enable-azure-keyvault-kms \
  --azure-keyvault-kms-key-id "$KEY_ID_NO_VERSION" \
  --azure-keyvault-kms-key-vault-network-access Public
```

## Implementing Google Cloud KMS Provider

For GKE clusters, enable KMS integration:

```bash
# Create KMS keyring and key
gcloud kms keyrings create k8s-secrets \
  --location us-central1

gcloud kms keys create k8s-encryption-key \
  --location us-central1 \
  --keyring k8s-secrets \
  --purpose encryption

# Get key resource name
KEY_RESOURCE=$(gcloud kms keys describe k8s-encryption-key \
  --location us-central1 \
  --keyring k8s-secrets \
  --format='value(name)')

echo "KMS Key: $KEY_RESOURCE"

# Grant GKE service account access
gcloud kms keys add-iam-policy-binding k8s-encryption-key \
  --location us-central1 \
  --keyring k8s-secrets \
  --member serviceAccount:service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter
```

Create GKE cluster with application-layer secrets encryption:

```bash
# New cluster with encryption
gcloud container clusters create secure-cluster \
  --region us-central1 \
  --database-encryption-key $KEY_RESOURCE \
  --enable-autorepair \
  --enable-autoupgrade

# Enable encryption on existing cluster
gcloud container clusters update existing-cluster \
  --region us-central1 \
  --database-encryption-key $KEY_RESOURCE
```

## Implementing Key Rotation

Rotate KMS keys periodically to limit exposure:

```bash
# rotate-kms-key.sh
#!/bin/bash

echo "Starting KMS key rotation..."

# Create new KMS key version (AWS example)
NEW_KEY_ID=$(aws kms create-key \
  --description "Kubernetes secrets encryption - rotated $(date +%Y-%m-%d)" \
  --query 'KeyMetadata.KeyId' \
  --output text)

echo "New key created: $NEW_KEY_ID"

# Run a second AWS encryption provider instance with the new key on a different socket.
# Then update /etc/kubernetes/encryption-config.yaml on every API server node so the
# new provider is first and the old provider remains below it for reads:
#
# providers:
#   - kms:
#       apiVersion: v2
#       name: aws-kms-provider-new
#       endpoint: unix:///var/run/kmsplugin/socket2.sock
#       timeout: 3s
#   - kms:
#       apiVersion: v2
#       name: aws-kms-provider-old
#       endpoint: unix:///var/run/kmsplugin/socket.sock
#       timeout: 3s
#   - identity: {}
#
# With --encryption-provider-config-automatic-reload=true, the API server polls
# the file for changes. Otherwise, restart each API server after updating it.

# Re-encrypt all secrets with new key
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -

echo "Key rotation complete"
```

## Monitoring KMS Provider Health

Create monitoring for KMS encryption operations:

```yaml
# prometheus-kms-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kms-encryption-alerts
  namespace: monitoring
spec:
  groups:
  - name: kms_health
    interval: 1m
    rules:
    - alert: KMSProviderDown
      expr: up{job="kms-provider"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "KMS encryption provider is down"
        description: "Secrets cannot be encrypted/decrypted"

    - alert: KMSEncryptionFailures
      expr: sum(rate(apiserver_storage_transformation_operations_total{transformation_type="to_storage",status!="OK"}[5m])) > 0.01
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "KMS encryption failures detected"
        description: "{{ $value }} encryption operations failing per second"

    - alert: KMSHighLatency
      expr: histogram_quantile(0.99, sum by (le) (rate(apiserver_envelope_encryption_kms_operations_latency_seconds_bucket[5m]))) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "KMS encryption latency high"
        description: "P99 encryption latency is {{ $value }}s"
```

## Verifying Encryption Compliance

Create compliance verification script:

```bash
# verify-encryption-compliance.sh
#!/bin/bash

echo "=== Secrets Encryption Compliance Check ==="
echo "Date: $(date)"
echo

# Sample test secret
echo "1. Testing secret encryption..."
kubectl create secret generic encryption-test \
  --from-literal=data="test-$(date +%s)" \
  -n default 2>/dev/null

# Check in etcd
if ETCDCTL_API=3 etcdctl get /registry/secrets/default/encryption-test 2>/dev/null | grep -q "k8s:enc:kms:v2"; then
  echo "✓ Secrets are encrypted with KMS"
else
  echo "✗ Secrets are not properly encrypted"
fi

# Cleanup
kubectl delete secret encryption-test -n default 2>/dev/null

# Count encrypted vs unencrypted secrets
echo "2. Analyzing existing secrets..."
# This requires etcd access
echo "  (Manual etcd inspection required)"

echo
echo "Compliance check complete"
```

KMS provider encryption transforms Kubernetes secrets from base64-encoded plaintext into properly encrypted data protected by enterprise-grade key management services. By delegating key management to AWS KMS, Azure Key Vault, or Google Cloud KMS, you gain hardware security module protection, automatic key rotation, and comprehensive audit logging that satisfies compliance requirements. Enable encryption for all production clusters handling sensitive data.
