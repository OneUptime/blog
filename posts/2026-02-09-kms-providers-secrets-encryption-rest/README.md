# How to Use KMS Providers for Kubernetes Secrets Encryption at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, KMS

Description: Learn how to integrate external Key Management Systems (KMS) with Kubernetes for enhanced secrets encryption at rest using AWS KMS, Azure Key Vault, or Google Cloud KMS.

---

While Kubernetes supports built-in encryption providers like AES-CBC, using an external Key Management System (KMS) provides enhanced security through centralized key management, automatic key rotation, audit logging, and hardware security module (HSM) backed encryption. KMS providers separate key management from the Kubernetes cluster, ensuring that encryption keys are never stored alongside the encrypted data.

This guide demonstrates how to configure Kubernetes to use external KMS providers for secrets encryption.

## Understanding KMS Integration

Kubernetes KMS integration works through a plugin architecture:

1. API server sends encryption requests to a KMS plugin socket
2. The KMS plugin communicates with the external KMS service
3. KMS service performs encryption/decryption using keys it manages
4. Encrypted data is stored in etcd

This architecture ensures that encryption keys never exist on the Kubernetes cluster nodes, significantly improving security posture.

## Prerequisites

Before implementing KMS encryption, ensure you have:

- Kubernetes 1.29 or later (for KMS v2 API)
- Access to a KMS service (AWS KMS, Azure Key Vault, or Google Cloud KMS)
- IAM permissions to use KMS keys
- Access to control plane nodes
- Ability to restart the API server

## Configuring AWS KMS Provider

Install the AWS KMS plugin on each control plane node:

```bash
# Download AWS KMS plugin
curl -LO https://github.com/kubernetes-sigs/aws-encryption-provider/releases/download/v0.0.7/aws-encryption-provider_linux_amd64

# Install to standard location
sudo mv aws-encryption-provider_linux_amd64 /usr/local/bin/aws-encryption-provider
sudo chmod +x /usr/local/bin/aws-encryption-provider
```

Create AWS KMS key:

```bash
# Create KMS key
aws kms create-key \
  --description "Kubernetes secrets encryption" \
  --region us-east-1

# Create alias for easier reference
aws kms create-alias \
  --alias-name alias/k8s-secrets \
  --target-key-id <key-id-from-previous-command>
```

Create the encryption configuration:

```yaml
# /etc/kubernetes/enc/encryption-config.yaml
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
      - identity: {}
```

Create systemd service for KMS plugin:

```bash
sudo cat <<EOF > /etc/systemd/system/aws-kms-plugin.service
[Unit]
Description=AWS KMS Plugin for Kubernetes
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/aws-encryption-provider \
  --key=arn:aws:kms:us-east-1:123456789012:key/<key-id> \
  --region=us-east-1 \
  --listen=/var/run/kmsplugin/socket.sock
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create socket directory
sudo mkdir -p /var/run/kmsplugin

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable aws-kms-plugin
sudo systemctl start aws-kms-plugin
```

Configure the API server:

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
    image: registry.k8s.io/kube-apiserver:v1.29.0
    command:
    - kube-apiserver
    - --encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml
    volumeMounts:
    - name: enc
      mountPath: /etc/kubernetes/enc
      readOnly: true
    - name: kmsplugin
      mountPath: /var/run/kmsplugin
  volumes:
  - name: enc
    hostPath:
      path: /etc/kubernetes/enc
      type: DirectoryOrCreate
  - name: kmsplugin
    hostPath:
      path: /var/run/kmsplugin
      type: DirectoryOrCreate
```

## Configuring Azure Key Vault Provider

For Azure, use the Azure Key Vault provider:

```bash
# Install Azure KMS plugin
curl -LO https://github.com/Azure/kubernetes-kms/releases/download/v0.6.0/kubernetes-kms_linux_amd64

sudo mv kubernetes-kms_linux_amd64 /usr/local/bin/azure-kms
sudo chmod +x /usr/local/bin/azure-kms
```

Create Azure Key Vault and key:

```bash
# Create resource group
az group create --name k8s-kms --location eastus

# Create Key Vault
az keyvault create \
  --name k8s-secrets-kv \
  --resource-group k8s-kms \
  --location eastus

# Create encryption key
az keyvault key create \
  --vault-name k8s-secrets-kv \
  --name k8s-secrets-key \
  --kty RSA \
  --size 2048
```

Configure managed identity or service principal for authentication:

```bash
# Create managed identity
az identity create \
  --name k8s-kms-identity \
  --resource-group k8s-kms

# Grant permissions to Key Vault
az keyvault set-policy \
  --name k8s-secrets-kv \
  --object-id <identity-principal-id> \
  --key-permissions encrypt decrypt
```

Create encryption configuration:

```yaml
# /etc/kubernetes/enc/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: azure-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
      - identity: {}
```

Create systemd service:

```bash
sudo cat <<EOF > /etc/systemd/system/azure-kms-plugin.service
[Unit]
Description=Azure KMS Plugin for Kubernetes
After=network.target

[Service]
Type=simple
Environment="AZURE_TENANT_ID=<tenant-id>"
Environment="AZURE_CLIENT_ID=<client-id>"
Environment="AZURE_CLIENT_SECRET=<client-secret>"
ExecStart=/usr/local/bin/azure-kms \
  --keyvault-name=k8s-secrets-kv \
  --key-name=k8s-secrets-key \
  --listen=/var/run/kmsplugin/socket.sock
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable azure-kms-plugin
sudo systemctl start azure-kms-plugin
```

## Configuring Google Cloud KMS Provider

For Google Cloud, use the Google KMS plugin:

```bash
# Install gcloud SDK if not already installed
curl https://sdk.cloud.google.com | bash

# Initialize gcloud
gcloud init
```

Create KMS key ring and key:

```bash
# Create key ring
gcloud kms keyrings create k8s-secrets \
  --location us-east1

# Create encryption key
gcloud kms keys create k8s-secrets-key \
  --location us-east1 \
  --keyring k8s-secrets \
  --purpose encryption
```

Install KMS plugin:

```bash
# Download Google KMS plugin
curl -LO https://github.com/GoogleCloudPlatform/k8s-cloudkms-plugin/releases/download/v0.3.0/k8s-cloud-kms-plugin

sudo mv k8s-cloud-kms-plugin /usr/local/bin/
sudo chmod +x /usr/local/bin/k8s-cloud-kms-plugin
```

Create encryption configuration:

```yaml
# /etc/kubernetes/enc/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: gcp-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
      - identity: {}
```

Create service account for authentication:

```bash
# Create service account
gcloud iam service-accounts create k8s-kms-plugin

# Grant KMS permissions
gcloud kms keys add-iam-policy-binding k8s-secrets-key \
  --location us-east1 \
  --keyring k8s-secrets \
  --member serviceAccount:k8s-kms-plugin@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter

# Download key file
gcloud iam service-accounts keys create /etc/kubernetes/gcp-kms-key.json \
  --iam-account k8s-kms-plugin@PROJECT_ID.iam.gserviceaccount.com
```

Create systemd service:

```bash
sudo cat <<EOF > /etc/systemd/system/gcp-kms-plugin.service
[Unit]
Description=Google Cloud KMS Plugin for Kubernetes
After=network.target

[Service]
Type=simple
Environment="GOOGLE_APPLICATION_CREDENTIALS=/etc/kubernetes/gcp-kms-key.json"
ExecStart=/usr/local/bin/k8s-cloud-kms-plugin \
  --key-uri=projects/PROJECT_ID/locations/us-east1/keyRings/k8s-secrets/cryptoKeys/k8s-secrets-key \
  --listen=/var/run/kmsplugin/socket.sock
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable gcp-kms-plugin
sudo systemctl start gcp-kms-plugin
```

## Encrypting Existing Secrets

After configuring KMS, encrypt existing secrets:

```bash
# Encrypt all secrets
kubectl get secrets --all-namespaces -o json | kubectl replace -f -

# Verify encryption
ETCDCTL_API=3 etcdctl get /registry/secrets/default/test-secret \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Should show k8s:enc:kms:v2:
```

## Health Monitoring

Monitor KMS plugin health:

```bash
# Check plugin service status
sudo systemctl status aws-kms-plugin

# Monitor plugin logs
sudo journalctl -u aws-kms-plugin -f

# Test encryption/decryption
kubectl create secret generic test-kms --from-literal=key=value
kubectl get secret test-kms -o yaml
kubectl delete secret test-kms
```

Create a monitoring script:

```bash
#!/bin/bash
# Monitor KMS plugin health

SOCKET=/var/run/kmsplugin/socket.sock

if [ ! -S "$SOCKET" ]; then
  echo "ERROR: KMS plugin socket not found"
  exit 1
fi

# Test secret creation
kubectl create secret generic kms-health-check --from-literal=test=data &>/dev/null

if [ $? -eq 0 ]; then
  echo "OK: KMS encryption working"
  kubectl delete secret kms-health-check &>/dev/null
  exit 0
else
  echo "ERROR: KMS encryption failed"
  exit 1
fi
```

## High Availability Setup

For HA clusters, run KMS plugin on each control plane:

```bash
# On each control plane node
sudo systemctl enable aws-kms-plugin
sudo systemctl start aws-kms-plugin

# Verify socket exists
ls -l /var/run/kmsplugin/socket.sock
```

Configure load balancer health checks for KMS plugins:

```yaml
# Health check endpoint configuration
apiVersion: v1
kind: Service
metadata:
  name: kms-health
spec:
  selector:
    component: kms-plugin
  ports:
  - port: 8080
    targetPort: health
```

## Key Rotation

KMS providers typically support automatic key rotation:

**AWS KMS:**

```bash
# Enable automatic rotation (rotates annually)
aws kms enable-key-rotation --key-id <key-id>

# Check rotation status
aws kms get-key-rotation-status --key-id <key-id>
```

**Azure Key Vault:**

```bash
# Set rotation policy
az keyvault key rotation-policy update \
  --vault-name k8s-secrets-kv \
  --name k8s-secrets-key \
  --value '{
    "lifetimeActions": [{
      "trigger": {"timeAfterCreate": "P90D"},
      "action": {"type": "Rotate"}
    }],
    "attributes": {"expiryTime": "P1Y"}
  }'
```

**Google Cloud KMS:**

```bash
# Set rotation period
gcloud kms keys update k8s-secrets-key \
  --location us-east1 \
  --keyring k8s-secrets \
  --rotation-period 90d \
  --next-rotation-time 2026-05-01T00:00:00Z
```

After rotation, re-encrypt secrets:

```bash
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

## Conclusion

Using external KMS providers for Kubernetes secrets encryption provides enterprise-grade security through centralized key management, audit logging, and hardware-backed encryption. By integrating with AWS KMS, Azure Key Vault, or Google Cloud KMS, you separate encryption key management from the cluster, ensuring that compromising the cluster does not expose encryption keys.

Implement KMS encryption for production clusters, enable automatic key rotation, monitor plugin health continuously, and maintain redundant KMS plugins across control plane nodes for high availability. Use OneUptime to track KMS plugin health and encryption operations for comprehensive security monitoring.
