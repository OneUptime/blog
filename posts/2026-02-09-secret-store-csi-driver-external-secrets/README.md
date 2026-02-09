# How to Set Up Secret Store CSI Driver for External Secrets in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Secrets-Management

Description: Learn how to use the Secrets Store CSI Driver to mount secrets from external vaults like AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault directly into Kubernetes pods.

---

Storing sensitive data like passwords, API keys, and certificates in Kubernetes Secrets creates security risks. These secrets are only base64-encoded by default and accessible to anyone with sufficient RBAC permissions. The Secrets Store CSI Driver solves this by allowing pods to mount secrets directly from external secret management systems, keeping sensitive data out of Kubernetes entirely while making it available to applications.

This guide will show you how to install and configure the Secrets Store CSI Driver to integrate with popular secret backends and mount external secrets as volumes in your pods.

## Understanding Secrets Store CSI Driver

The Secrets Store CSI Driver is a Container Storage Interface (CSI) volume driver that connects Kubernetes to external secret stores. Instead of creating Kubernetes Secret objects, secrets remain in external vaults and get mounted into pods as files. The driver supports multiple providers including AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, and HashiCorp Vault.

This approach provides several benefits: secrets never exist in etcd, access is audited in the external system, secret rotation happens automatically, and you leverage enterprise secret management features like encryption and compliance controls.

## Installing the Secrets Store CSI Driver

Install the driver using Helm:

```bash
# Add Secrets Store CSI Driver Helm repository
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

# Install the driver
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --set rotationPollInterval=120s
```

The `syncSecret.enabled` option allows creating Kubernetes Secret objects from external secrets, useful for environment variables. The `enableSecretRotation` setting enables automatic updates when secrets change.

Verify installation:

```bash
# Check driver pods are running
kubectl get pods -n kube-system -l app=secrets-store-csi-driver

# Verify CSI driver is registered
kubectl get csidriver
# Should see secrets-store.csi.k8s.io
```

## Installing Provider for AWS Secrets Manager

Each secret backend requires a provider plugin. For AWS Secrets Manager:

```bash
# Install AWS provider
kubectl apply -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml

# Verify provider pods
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-aws
```

Ensure your pods have IRSA configured to access Secrets Manager:

```bash
# Create IAM policy for Secrets Manager access
cat > secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-west-2:123456789012:secret:my-app-secrets-*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name SecretsManagerReadPolicy \
  --policy-document file://secrets-policy.json
```

Create service account with IRSA (see earlier post on IRSA for details).

## Configuring SecretProviderClass for AWS

Define what secrets to mount using SecretProviderClass:

```yaml
# aws-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "my-app-db-password"
        objectType: "secretsmanager"
        objectAlias: "db-password"
      - objectName: "my-app-api-key"
        objectType: "secretsmanager"
        objectAlias: "api-key"
    region: "us-west-2"
  # Optional: sync to Kubernetes Secret
  secretObjects:
  - secretName: app-secrets
    type: Opaque
    data:
    - objectName: db-password
      key: password
    - objectName: api-key
      key: api-key
```

Apply the provider class:

```bash
kubectl apply -f aws-secret-provider.yaml

# Verify creation
kubectl get secretproviderclass -n production
```

## Mounting AWS Secrets in Pods

Configure pods to mount secrets using the CSI driver:

```yaml
# deployment-with-secrets.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-secrets
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: app-service-account  # Must have IRSA configured
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
          readOnly: true
        env:
        # Reference mounted secret files
        - name: DB_PASSWORD_FILE
          value: /mnt/secrets/db-password
        # Or use synced Kubernetes Secret
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api-key
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "aws-secrets"
```

Deploy and verify:

```bash
kubectl apply -f deployment-with-secrets.yaml

# Check that secrets are mounted
kubectl exec -it deployment/app-with-secrets -n production -- ls -la /mnt/secrets/

# Verify file contents (be careful - this exposes secrets)
kubectl exec -it deployment/app-with-secrets -n production -- cat /mnt/secrets/db-password
```

## Installing Provider for Azure Key Vault

For Azure environments, install the Azure provider:

```bash
# Install Azure provider
helm install csi-secrets-store-provider-azure \
  csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --namespace kube-system

# Verify installation
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-azure
```

Configure SecretProviderClass for Azure:

```yaml
# azure-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "false"
    clientID: ""  # Will use workload identity
    keyvaultName: "mykeyvault"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: db-password
          objectType: secret
          objectVersion: ""
        - |
          objectName: tls-cert
          objectType: cert
        - |
          objectName: signing-key
          objectType: key
    tenantId: "your-tenant-id"
```

The pods need Azure AD Workload Identity configured (see earlier post on Azure AD Workload Identity).

## Installing Provider for HashiCorp Vault

For HashiCorp Vault, install the provider:

```bash
# Install Vault provider
helm install vault-csi-provider hashicorp/vault-csi-provider \
  --namespace kube-system \
  --set vault.address="http://vault.vault.svc:8200"
```

Configure SecretProviderClass for Vault:

```yaml
# vault-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-secrets
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: "http://vault.vault.svc:8200"
    roleName: "app-role"
    objects: |
      - objectName: "db-password"
        secretPath: "secret/data/myapp/database"
        secretKey: "password"
      - objectName: "api-token"
        secretPath: "secret/data/myapp/api"
        secretKey: "token"
```

Set up Vault Kubernetes authentication:

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Vault to talk to Kubernetes
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# Create role for pods
vault write auth/kubernetes/role/app-role \
  bound_service_account_names=app-service-account \
  bound_service_account_namespaces=production \
  policies=app-policy \
  ttl=24h
```

## Automatic Secret Rotation

Enable automatic rotation to pick up updated secrets without restarting pods:

```bash
# Secret rotation is enabled by default when installing with the flag
# Verify rotation is enabled
kubectl get deployment csi-secrets-store -n kube-system -o yaml | grep rotation

# Rotation period is controlled by rotationPollInterval
# Default is 120 seconds
```

When a secret changes in the external vault, the driver automatically updates the mounted files. Applications need to watch the files and reload configuration when they change:

```python
# example-app.py
import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SecretChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('/db-password'):
            print("Database password changed, reloading...")
            reload_db_connection()

def reload_db_connection():
    with open('/mnt/secrets/db-password', 'r') as f:
        new_password = f.read().strip()
    # Reconnect to database with new password
    global db_connection
    db_connection = connect_to_db(password=new_password)

# Watch secrets directory for changes
observer = Observer()
observer.schedule(SecretChangeHandler(), path='/mnt/secrets', recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

## Using GCP Secret Manager

Install the GCP provider:

```bash
# Install GCP provider
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp/main/deploy/provider-gcp-plugin.yaml

# Verify installation
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-gcp
```

Configure SecretProviderClass:

```yaml
# gcp-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: gcp-secrets
  namespace: production
spec:
  provider: gcp
  parameters:
    secrets: |
      - resourceName: "projects/123456789/secrets/db-password/versions/latest"
        path: "db-password"
      - resourceName: "projects/123456789/secrets/api-key/versions/latest"
        path: "api-key"
```

Pods need Workload Identity configured to access Secret Manager (see earlier post on GCP Workload Identity).

## Syncing Secrets to Kubernetes Secrets

For applications that require environment variables, sync external secrets to Kubernetes Secrets:

```yaml
# provider-with-sync.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets-with-sync
  namespace: production
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "database-creds"
        objectType: "secretsmanager"
  secretObjects:
  - secretName: database-credentials
    type: Opaque
    data:
    - objectName: database-creds
      key: credentials
```

Use the synced secret in deployments:

```yaml
containers:
- name: app
  image: myapp:latest
  env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: database-credentials
        key: credentials
  volumeMounts:
  - name: secrets-store
    mountPath: "/mnt/secrets"
    readOnly: true
volumes:
- name: secrets-store
  csi:
    driver: secrets-store.csi.k8s.io
    readOnly: true
    volumeAttributes:
      secretProviderClass: "aws-secrets-with-sync"
```

The volume mount is required even when using synced secrets, as the sync only happens when the volume is mounted.

## Troubleshooting Common Issues

Debug secret mounting problems:

```bash
# Check driver logs
kubectl logs -n kube-system -l app=secrets-store-csi-driver

# Check provider logs
kubectl logs -n kube-system -l app=csi-secrets-store-provider-aws

# Describe pod to see volume mount issues
kubectl describe pod POD_NAME -n production

# Check SecretProviderClass events
kubectl describe secretproviderclass aws-secrets -n production

# Verify IRSA/Workload Identity is configured
kubectl get sa app-service-account -n production -o yaml
```

Common issues:
- Missing IRSA/Workload Identity configuration
- Incorrect secret names or regions in SecretProviderClass
- Missing permissions in IAM policy
- Provider plugin not installed

## Security Best Practices

Use separate SecretProviderClasses for different applications to limit blast radius. Configure fine-grained IAM policies that allow access only to specific secrets. Enable audit logging in your secret backend to track access.

Rotate secrets regularly and test that applications handle rotation correctly. Use version pinning in production to prevent unexpected changes. Monitor secret access patterns to detect anomalies.

Never log secret values or expose them in error messages. Use file-based secrets over environment variables when possible, as environment variables can leak in various ways.

## Conclusion

The Secrets Store CSI Driver provides a secure way to use external secret management systems with Kubernetes. By keeping secrets in dedicated vaults like AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault, you leverage enterprise-grade security features while maintaining Kubernetes-native workflows.

Start by installing the driver and appropriate provider for your secret backend. Create SecretProviderClasses that define which secrets to mount. Configure pods to use CSI volumes and ensure they have proper cloud provider authentication. Enable automatic rotation to keep secrets current without manual intervention.

Combined with proper RBAC, network policies, and pod security standards, external secret management significantly improves your security posture by eliminating secrets from Kubernetes and centralizing secret lifecycle management in purpose-built systems.
