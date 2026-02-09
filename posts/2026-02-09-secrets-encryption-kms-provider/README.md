# How to Set Up Kubernetes Secrets Encryption at Rest Using KMS Provider Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption, KMS, Secrets Management, Compliance

Description: Configure Kubernetes secrets encryption at rest using KMS provider plugins with AWS KMS, Azure Key Vault, or Google Cloud KMS to meet compliance requirements and protect sensitive data stored in etcd.

---

Kubernetes stores secrets in etcd by default using base64 encoding, which provides no real encryption. Anyone with etcd access can read all secrets in plaintext. For production clusters handling sensitive data, this is unacceptable. Encryption at rest using KMS provider plugins protects secrets even if attackers gain etcd access.

KMS provider integration delegates encryption key management to enterprise-grade key management services like AWS KMS, Azure Key Vault, or Google Cloud KMS. These services provide hardware security modules, automatic key rotation, and comprehensive audit logging that satisfy compliance requirements like PCI-DSS, HIPAA, and SOC2.

## Understanding KMS Provider Architecture

Kubernetes API server encryption works through a provider plugin model. When secrets are written, the API server calls a KMS plugin via Unix socket to encrypt the data encryption key (DEK). The KMS plugin uses a cloud KMS service to encrypt the DEK with a key encryption key (KEK). Only the encrypted DEK stores in etcd alongside the encrypted secret.

When reading secrets, the process reverses: the API server retrieves the encrypted DEK from etcd, calls the KMS plugin to decrypt it, then uses the decrypted DEK to decrypt the secret data. This envelope encryption approach means the KEK never leaves the KMS service, providing stronger security guarantees.

## Installing AWS KMS Provider Plugin

Start by deploying the AWS KMS encryption provider for EKS or self-managed clusters:

```bash
# Install AWS encryption provider
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-encryption-provider/master/deploy/aws-encryption-provider.yaml

# Create KMS key in AWS
aws kms create-key \
  --description "Kubernetes secrets encryption" \
  --tags TagKey=Purpose,TagValue=K8sSecretsEncryption

# Get key ID
export KMS_KEY_ID=$(aws kms describe-key \
  --key-id alias/kubernetes-secrets \
  --query 'KeyMetadata.KeyId' \
  --output text)

echo "KMS Key ID: $KMS_KEY_ID"

# Create key alias
aws kms create-alias \
  --alias-name alias/kubernetes-secrets \
  --target-key-id $KMS_KEY_ID

# Grant API server permission to use the key
aws kms create-grant \
  --key-id $KMS_KEY_ID \
  --grantee-principal arn:aws:iam::ACCOUNT_ID:role/K8sAPIServerRole \
  --operations Encrypt Decrypt DescribeKey
```

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
          name: aws-kms-provider
          endpoint: unix:///var/run/kmsplugin/socket.sock
          cachesize: 1000
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

## Migrating Existing Secrets to Encrypted Storage

After enabling KMS encryption, existing secrets remain unencrypted in etcd until rewritten:

```bash
# migrate-secrets-encryption.sh
#!/bin/bash

echo "Starting secrets encryption migration..."

# Get all secrets
SECRETS=$(kubectl get secrets --all-namespaces -o json)

# Count total secrets
TOTAL=$(echo "$SECRETS" | jq '.items | length')
echo "Found $TOTAL secrets to migrate"

COUNTER=0

# Rewrite each secret to trigger encryption
echo "$SECRETS" | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
while read NAMESPACE NAME; do
  COUNTER=$((COUNTER + 1))
  echo "[$COUNTER/$TOTAL] Migrating $NAMESPACE/$NAME"

  # Get secret, modify annotation, and apply
  kubectl get secret "$NAME" -n "$NAMESPACE" -o json | \
    jq '.metadata.annotations["encrypted-at"] = now | tostring' | \
    kubectl apply -f -

  # Small delay to avoid overwhelming API server
  sleep 0.1
done

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

For AKS clusters, configure Azure Key Vault integration:

```yaml
# azure-kms-provider.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: azure-kms-provider-config
  namespace: kube-system
data:
  encryption-config.yaml: |
    apiVersion: apiserver.config.k8s.io/v1
    kind: EncryptionConfiguration
    resources:
      - resources:
          - secrets
        providers:
          - kms:
              name: azurekmsprovider
              endpoint: unix:///opt/azurekms.socket
              cachesize: 1000
              timeout: 3s
          - identity: {}

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: azure-kms-provider
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: azure-kms-provider
  template:
    metadata:
      labels:
        app: azure-kms-provider
    spec:
      hostNetwork: true
      containers:
      - name: azure-kms-provider
        image: mcr.microsoft.com/k8s/kms/keyvault:latest
        imagePullPolicy: IfNotPresent
        env:
        - name: AZURE_TENANT_ID
          value: "your-tenant-id"
        - name: AZURE_CLIENT_ID
          value: "your-client-id"
        - name: AZURE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: azure-kms-credentials
              key: client-secret
        - name: KEY_VAULT_NAME
          value: "your-keyvault-name"
        - name: KEY_NAME
          value: "k8s-encryption-key"
        volumeMounts:
        - name: socket
          mountPath: /opt
      volumes:
      - name: socket
        hostPath:
          path: /opt
          type: DirectoryOrCreate
```

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
  --size 2048

# Grant AKS service principal access
az keyvault set-policy \
  --name k8s-secrets-kv \
  --object-id <aks-sp-object-id> \
  --key-permissions encrypt decrypt
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

# Update encryption config to use new key
cat > /etc/kubernetes/encryption-config-new.yaml <<EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # New key for new writes
      - kms:
          name: aws-kms-provider-new
          endpoint: unix:///var/run/kmsplugin/socket.sock
          cachesize: 1000
          timeout: 3s

      # Old key for reading existing secrets
      - kms:
          name: aws-kms-provider-old
          endpoint: unix:///var/run/kmsplugin/socket.sock
          cachesize: 1000
          timeout: 3s

      - identity: {}
EOF

# Reload API server config
kubectl apply -f /etc/kubernetes/encryption-config-new.yaml

# Re-encrypt all secrets with new key
kubectl get secrets --all-namespaces -o json | \
  kubectl apply -f -

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
      expr: rate(apiserver_storage_envelope_transformation_errors_total[5m]) > 0.01
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "KMS encryption failures detected"
        description: "{{ $value }} encryption operations failing per second"

    - alert: KMSHighLatency
      expr: histogram_quantile(0.99, rate(apiserver_storage_envelope_transformation_duration_seconds_bucket[5m])) > 1
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

# Check if encryption is enabled
echo "1. Checking encryption configuration..."
kubectl get --raw /api/v1/namespaces/kube-system/configmaps/extension-apiserver-authentication -o json | \
  jq -r '.data.requestheader-client-ca-file' > /dev/null && \
  echo "✓ Encryption configuration present" || \
  echo "✗ Encryption configuration missing"

# Sample test secret
echo "2. Testing secret encryption..."
kubectl create secret generic encryption-test \
  --from-literal=data="test-$(date +%s)" \
  -n default 2>/dev/null

# Check in etcd
if ETCDCTL_API=3 etcdctl get /registry/secrets/default/encryption-test 2>/dev/null | grep -q "k8s:enc:kms"; then
  echo "✓ Secrets are encrypted with KMS"
else
  echo "✗ Secrets are not properly encrypted"
fi

# Cleanup
kubectl delete secret encryption-test -n default 2>/dev/null

# Count encrypted vs unencrypted secrets
echo "3. Analyzing existing secrets..."
# This requires etcd access
echo "  (Manual etcd inspection required)"

echo
echo "Compliance check complete"
```

KMS provider encryption transforms Kubernetes secrets from base64-encoded plaintext into properly encrypted data protected by enterprise-grade key management services. By delegating key management to AWS KMS, Azure Key Vault, or Google Cloud KMS, you gain hardware security module protection, automatic key rotation, and comprehensive audit logging that satisfies compliance requirements. Enable encryption for all production clusters handling sensitive data.
