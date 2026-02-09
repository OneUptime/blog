# How to Use CSI Inline Volumes for Short-Lived Secret Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Secrets, Security

Description: Learn how to use CSI inline volumes to inject secrets directly into pods without creating PersistentVolumeClaims, enabling dynamic secret management from external providers like HashiCorp Vault, AWS Secrets Manager, and Azure Key Vault.

---

CSI inline volumes allow you to mount volumes directly in pod specifications without creating separate PersistentVolumeClaim resources. This is particularly useful for injecting secrets from external secret stores, providing short-lived credentials that are automatically rotated.

## Understanding CSI Inline Volumes

Traditional secret management in Kubernetes uses:

1. **Kubernetes Secrets** - Stored in etcd, base64 encoded
2. **PersistentVolumeClaims** - Require separate resource creation

CSI inline volumes offer a better approach for secrets:

1. **No PVC needed** - Volume defined directly in pod spec
2. **External secret stores** - Integration with Vault, AWS, Azure, GCP
3. **Automatic rotation** - Secrets updated without pod restart
4. **Short-lived credentials** - Reduces exposure window

## Installing the Secrets Store CSI Driver

First, install the Secrets Store CSI Driver:

```bash
# Add the Secrets Store CSI Driver Helm repository
helm repo add secrets-store-csi-driver \
  https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts

helm repo update

# Install the CSI driver
helm install csi-secrets-store \
  secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --set rotationPollInterval=120s

# Verify installation
kubectl get pods -n kube-system -l app=secrets-store-csi-driver

# Check the CSI driver is registered
kubectl get csidrivers
# Should show: secrets-store.csi.k8s.io
```

## Using AWS Secrets Manager

Install the AWS provider:

```bash
# Install AWS Secrets Manager provider
kubectl apply -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml

# Verify provider is running
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-aws
```

Create a SecretProviderClass:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
spec:
  provider: aws
  parameters:
    # Specify secrets to retrieve from AWS Secrets Manager
    objects: |
      - objectName: "prod/database/credentials"
        objectType: "secretsmanager"
        jmesPath:
          - path: username
            objectAlias: dbUsername
          - path: password
            objectAlias: dbPassword
      - objectName: "prod/api/key"
        objectType: "secretsmanager"
        objectAlias: apiKey
  # Optionally sync to Kubernetes Secret
  secretObjects:
  - secretName: database-credentials
    type: Opaque
    data:
    - objectName: dbUsername
      key: username
    - objectName: dbPassword
      key: password
```

Use the secrets in a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: myapp:latest
    env:
    # Read secrets from mounted files
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: password
    volumeMounts:
    - name: secrets-store
      mountPath: /mnt/secrets
      readOnly: true
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: aws-secrets
```

Create the required IAM role and service account:

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
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name SecretsManagerReadPolicy \
  --policy-document file://secrets-policy.json

# Create service account with IAM role (using IRSA)
eksctl create iamserviceaccount \
  --name app-sa \
  --namespace default \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/SecretsManagerReadPolicy \
  --approve
```

Deploy the application:

```bash
kubectl apply -f secret-provider-class.yaml
kubectl apply -f pod.yaml

# Verify secrets are mounted
kubectl exec app-with-secrets -- ls -la /mnt/secrets

# Check secret files
kubectl exec app-with-secrets -- cat /mnt/secrets/dbUsername
kubectl exec app-with-secrets -- cat /mnt/secrets/dbPassword
```

## Using HashiCorp Vault

Install the Vault provider:

```bash
# Install Vault CSI provider
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --set "server.dev.enabled=true" \
  --set "injector.enabled=false" \
  --set "csi.enabled=true"

# Wait for Vault to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=vault
```

Configure Vault with test secrets:

```bash
# Enable Kubernetes auth
kubectl exec vault-0 -- vault auth enable kubernetes

# Configure Kubernetes auth
kubectl exec vault-0 -- vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# Create a secret
kubectl exec vault-0 -- vault kv put secret/database \
  username="admin" \
  password="super-secret-password"

# Create a policy
kubectl exec vault-0 -- vault policy write app-policy - <<EOF
path "secret/data/database" {
  capabilities = ["read"]
}
EOF

# Create a role
kubectl exec vault-0 -- vault write auth/kubernetes/role/app-role \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=app-policy \
  ttl=24h
```

Create a SecretProviderClass for Vault:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-secrets
spec:
  provider: vault
  parameters:
    # Vault address
    vaultAddress: "http://vault.default.svc.cluster.local:8200"
    # Vault role
    roleName: "app-role"
    # Secrets to retrieve
    objects: |
      - objectName: "database-username"
        secretPath: "secret/data/database"
        secretKey: "username"
      - objectName: "database-password"
        secretPath: "secret/data/database"
        secretKey: "password"
  # Sync to Kubernetes Secret
  secretObjects:
  - secretName: vault-database-creds
    type: Opaque
    data:
    - objectName: database-username
      key: username
    - objectName: database-password
      key: password
```

Use Vault secrets in a pod:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
---
apiVersion: v1
kind: Pod
metadata:
  name: vault-app
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: secrets-store
      mountPath: /mnt/secrets-store
      readOnly: true
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: vault-secrets
```

## Using Azure Key Vault

Install the Azure provider:

```bash
# Install Azure Key Vault provider
helm repo add csi-secrets-store-provider-azure \
  https://azure.github.io/secrets-store-csi-driver-provider-azure/charts

helm install azure-provider \
  csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --namespace kube-system

# Verify installation
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-azure
```

Create secrets in Azure Key Vault:

```bash
# Create Key Vault
az keyvault create \
  --name my-keyvault \
  --resource-group my-rg \
  --location eastus

# Add secrets
az keyvault secret set \
  --vault-name my-keyvault \
  --name database-username \
  --value "admin"

az keyvault secret set \
  --vault-name my-keyvault \
  --name database-password \
  --value "SecurePassword123!"
```

Create a SecretProviderClass for Azure:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-secrets
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "my-keyvault"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: database-username
          objectType: secret
        - |
          objectName: database-password
          objectType: secret
    tenantId: "<tenant-id>"
  secretObjects:
  - secretName: azure-db-creds
    type: Opaque
    data:
    - objectName: database-username
      key: username
    - objectName: database-password
      key: password
```

## Automatic Secret Rotation

Enable automatic rotation of secrets:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-rotation
  labels:
    app: myapp
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: DB_PASSWORD_FILE
      value: /mnt/secrets/dbPassword
    command:
    - /bin/sh
    - -c
    - |
      # Watch for secret changes and reload
      while true; do
        PASSWORD=$(cat $DB_PASSWORD_FILE)
        echo "Current password loaded"
        # Your app should reload config when secrets change
        inotifywait -e modify $DB_PASSWORD_FILE
        echo "Secret rotated, reloading..."
      done
    volumeMounts:
    - name: secrets-store
      mountPath: /mnt/secrets
      readOnly: true
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: aws-secrets
```

## Using Multiple Secret Providers

Combine secrets from different sources:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-source-secrets
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: aws-secrets
      mountPath: /mnt/aws-secrets
      readOnly: true
    - name: vault-secrets
      mountPath: /mnt/vault-secrets
      readOnly: true
  volumes:
  # AWS Secrets Manager
  - name: aws-secrets
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: aws-secrets
  # HashiCorp Vault
  - name: vault-secrets
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: vault-secrets
```

## Monitoring Secret Access

Track secret usage and rotation:

```bash
# Check SecretProviderClass resources
kubectl get secretproviderclass

# Describe to see configuration
kubectl describe secretproviderclass aws-secrets

# Check CSI driver logs
kubectl logs -n kube-system -l app=secrets-store-csi-driver

# Check provider logs (AWS example)
kubectl logs -n kube-system -l app=csi-secrets-store-provider-aws

# List pods using CSI inline volumes
kubectl get pods -o json | jq -r '.items[] |
  select(.spec.volumes[]?.csi?.driver == "secrets-store.csi.k8s.io") |
  .metadata.name'
```

## Troubleshooting

Common issues and solutions:

```bash
# 1. Secrets not mounting
kubectl describe pod <pod-name>

# Look for events about volume mount failures
# Check provider logs
kubectl logs -n kube-system -l app=csi-secrets-store-provider-aws

# 2. Permission denied errors
# Verify IAM role/managed identity has correct permissions
# Check service account annotations

# 3. Secrets not rotating
# Verify rotation is enabled
helm get values csi-secrets-store -n kube-system | grep rotation

# Check rotation interval
# Default is 2 minutes

# 4. SecretProviderClass not found
kubectl get secretproviderclass -A

# Verify it's in the same namespace as the pod
```

## Best Practices

1. **Use managed identities** instead of storing credentials
2. **Enable secret rotation** for sensitive credentials
3. **Set appropriate TTLs** for temporary credentials
4. **Monitor secret access** for security auditing
5. **Use different providers** for different secret types
6. **Test rotation** to ensure applications handle it
7. **Limit secret scope** with fine-grained IAM policies
8. **Sync to Kubernetes Secrets** only when necessary

CSI inline volumes provide a secure, cloud-native way to inject secrets into pods, eliminating the need to store sensitive data in Kubernetes and enabling automatic rotation for improved security posture.
