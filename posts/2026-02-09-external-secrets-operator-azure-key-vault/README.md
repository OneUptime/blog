# How to Use External Secrets Operator with Azure Key Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, Secrets Management

Description: Learn how to sync secrets from Azure Key Vault into Kubernetes using External Secrets Operator with managed identity authentication and automatic rotation.

---

Managing secrets directly in Kubernetes creates security and compliance challenges. Azure Key Vault provides centralized secret management with encryption, access policies, and audit logging, but consuming these secrets in Kubernetes requires custom code or complex integrations.

External Secrets Operator bridges this gap by automatically syncing Azure Key Vault secrets into Kubernetes. Your applications use standard Kubernetes Secrets while benefiting from Azure's enterprise-grade secret management capabilities.

In this guide, you'll learn how to configure External Secrets Operator with Azure Key Vault, implement managed identity authentication, and handle certificates and keys alongside standard secrets.

## Prerequisites

You need an Azure subscription and an AKS cluster. You also need:

- Azure CLI installed and configured
- kubectl access to your AKS cluster
- Permissions to create Azure resources (Key Vault, managed identities, role assignments)

## Creating Azure Key Vault

Create a Key Vault to store your secrets:

```bash
# Set variables
RESOURCE_GROUP="my-resource-group"
KEY_VAULT_NAME="my-keyvault-prod"
LOCATION="eastus"

# Create resource group if needed
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true
```

Add secrets to the Key Vault:

```bash
# Create database password
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name database-password \
  --value "SuperSecurePassword123"

# Create API key
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name stripe-api-key \
  --value "sk_live_abc123xyz789"

# Create connection string
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name storage-connection-string \
  --value "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=..."

# Upload certificate
az keyvault certificate import \
  --vault-name $KEY_VAULT_NAME \
  --name tls-cert \
  --file certificate.pfx
```

## Installing External Secrets Operator

Install ESO using Helm:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

Verify the installation:

```bash
kubectl get pods -n external-secrets-system
kubectl get crd | grep external-secrets
```

## Setting Up Azure Authentication

External Secrets Operator supports multiple authentication methods for Azure Key Vault. We'll cover the two most common approaches.

### Method 1: Workload Identity (Recommended for AKS)

Workload Identity is the modern, secure way to authenticate from AKS to Azure services.

Enable Workload Identity on your AKS cluster:

```bash
# Enable OIDC issuer and Workload Identity
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity
```

Get the OIDC issuer URL:

```bash
OIDC_ISSUER=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name my-aks-cluster \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

echo $OIDC_ISSUER
```

Create a managed identity:

```bash
# Create user-assigned managed identity
az identity create \
  --name external-secrets-identity \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name external-secrets-identity \
  --resource-group $RESOURCE_GROUP \
  --query clientId \
  --output tsv)

IDENTITY_OBJECT_ID=$(az identity show \
  --name external-secrets-identity \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)
```

Grant the identity access to Key Vault:

```bash
# Get Key Vault resource ID
KEY_VAULT_SCOPE=$(az keyvault show \
  --name $KEY_VAULT_NAME \
  --query id \
  --output tsv)

# Assign Key Vault Secrets User role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id $IDENTITY_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --scope $KEY_VAULT_SCOPE
```

Create federated identity credential:

```bash
az identity federated-credential create \
  --name external-secrets-federated-credential \
  --identity-name external-secrets-identity \
  --resource-group $RESOURCE_GROUP \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:external-secrets-system:external-secrets \
  --audience api://AzureADTokenExchange
```

Annotate the External Secrets service account:

```bash
kubectl annotate serviceaccount external-secrets \
  --namespace external-secrets-system \
  azure.workload.identity/client-id=$IDENTITY_CLIENT_ID
```

Label the External Secrets pods:

```bash
kubectl patch deployment external-secrets \
  --namespace external-secrets-system \
  --type merge \
  --patch '{"spec":{"template":{"metadata":{"labels":{"azure.workload.identity/use":"true"}}}}}'
```

### Method 2: Service Principal (Alternative)

Create a service principal for authentication:

```bash
# Create service principal
SP=$(az ad sp create-for-rbac --name external-secrets-sp --skip-assignment)

# Extract credentials
CLIENT_ID=$(echo $SP | jq -r '.appId')
CLIENT_SECRET=$(echo $SP | jq -r '.password')
TENANT_ID=$(echo $SP | jq -r '.tenant')

# Grant access to Key Vault
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $CLIENT_ID \
  --scope $KEY_VAULT_SCOPE
```

Store credentials in Kubernetes:

```bash
kubectl create secret generic azure-secret-sp \
  --namespace external-secrets-system \
  --from-literal=ClientID=$CLIENT_ID \
  --from-literal=ClientSecret=$CLIENT_SECRET
```

## Creating SecretStore with Workload Identity

Create a SecretStore using Workload Identity:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://my-keyvault-prod.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets-system
```

For a ClusterSecretStore accessible from all namespaces:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-keyvault-global
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://my-keyvault-prod.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets-system
```

## Creating SecretStore with Service Principal

For service principal authentication:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      authType: ServicePrincipal
      vaultUrl: "https://my-keyvault-prod.vault.azure.net"
      tenantId: "your-tenant-id"
      authSecretRef:
        clientId:
          name: azure-secret-sp
          key: ClientID
          namespace: external-secrets-system
        clientSecret:
          name: azure-secret-sp
          key: ClientSecret
          namespace: external-secrets-system
```

## Creating ExternalSecret Resources

### Syncing Simple Secrets

Sync a single secret from Azure Key Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-password
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: database-password
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: database-password
```

### Syncing Multiple Secrets

Fetch multiple secrets into one Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: db_password
    remoteRef:
      key: database-password
  - secretKey: stripe_key
    remoteRef:
      key: stripe-api-key
  - secretKey: storage_connection
    remoteRef:
      key: storage-connection-string
```

### Working with Secret Versions

Azure Key Vault supports versioning. Access specific versions:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: versioned-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: versioned-secret
    creationPolicy: Owner
  data:
  # Use latest version (default)
  - secretKey: current_password
    remoteRef:
      key: database-password
  # Use specific version
  - secretKey: previous_password
    remoteRef:
      key: database-password
      version: abc123def456
```

### Using Templates

Transform secrets using templates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-config
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: database-config
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Create connection string from parts
        connection_string: |
          Server={{ .host }};Database={{ .database }};User Id={{ .username }};Password={{ .password }};
        # Create JSON config
        config.json: |
          {
            "database": {
              "host": "{{ .host }}",
              "username": "{{ .username }}",
              "password": "{{ .password }}"
            }
          }
  data:
  - secretKey: host
    remoteRef:
      key: database-host
  - secretKey: database
    remoteRef:
      key: database-name
  - secretKey: username
    remoteRef:
      key: database-username
  - secretKey: password
    remoteRef:
      key: database-password
```

## Working with Certificates

Azure Key Vault stores certificates differently. Access certificate components:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tls-certificate
  namespace: production
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: tls-certificate
    type: kubernetes.io/tls
    creationPolicy: Owner
  data:
  # Get certificate
  - secretKey: tls.crt
    remoteRef:
      key: tls-cert
      property: certificate
  # Get private key
  - secretKey: tls.key
    remoteRef:
      key: tls-cert
      property: key
```

Use the certificate in an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: production
spec:
  tls:
  - hosts:
    - example.com
    secretName: tls-certificate
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## Using Secrets in Deployments

Reference the synced Kubernetes Secrets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:latest
        env:
        # Use individual secrets
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-password
              key: password
        - name: STRIPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: stripe_key
        # Use entire secret as environment variables
        envFrom:
        - secretRef:
            name: app-secrets
            prefix: APP_
```

## Implementing Automatic Rotation

Configure automatic secret rotation using Azure Key Vault's built-in features:

```bash
# Set expiration date for a secret
az keyvault secret set-attributes \
  --vault-name $KEY_VAULT_NAME \
  --name database-password \
  --expires "2026-12-31T23:59:59Z"
```

External Secrets Operator will automatically sync new versions based on the `refreshInterval`. To trigger pod restarts when secrets change, use Reloader:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "database-password,app-secrets"
spec:
  # ... deployment spec
```

## Monitoring External Secrets

Check the status of ExternalSecrets:

```bash
# List all ExternalSecrets
kubectl get externalsecrets -n production

# Describe specific ExternalSecret
kubectl describe externalsecret database-password -n production

# Check operator logs
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets
```

Healthy ExternalSecret shows:

```
Status:
  Conditions:
    Last Transition Time:  2026-02-09T10:00:00Z
    Status:                True
    Type:                  Ready
  Refresh Time:            2026-02-09T11:00:00Z
```

## Handling Multiple Key Vaults

For multi-region deployments, create separate SecretStores:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault-eastus
  namespace: production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://keyvault-eastus.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets-system
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault-westus
  namespace: production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://keyvault-westus.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets-system
```

## Best Practices

1. **Use Workload Identity**: Always prefer Workload Identity over service principals for better security and simplified credential management.

2. **Enable soft delete**: Protect against accidental deletion by enabling soft delete on Key Vault:
   ```bash
   az keyvault update \
     --name $KEY_VAULT_NAME \
     --enable-soft-delete true \
     --enable-purge-protection true
   ```

3. **Set appropriate refresh intervals**: Balance between secret freshness and Azure API costs.

4. **Use RBAC over access policies**: Azure Key Vault RBAC provides better integration with Azure AD and more granular permissions.

5. **Enable diagnostic logging**: Monitor all access to secrets:
   ```bash
   az monitor diagnostic-settings create \
     --name keyvault-diagnostics \
     --resource $KEY_VAULT_SCOPE \
     --logs '[{"category":"AuditEvent","enabled":true}]' \
     --workspace <log-analytics-workspace-id>
   ```

6. **Tag secrets**: Use tags to organize and track secrets:
   ```bash
   az keyvault secret set \
     --vault-name $KEY_VAULT_NAME \
     --name database-password \
     --value "password" \
     --tags Environment=Production Team=Platform
   ```

7. **Use Private Endpoints**: For production, connect to Key Vault via Private Endpoints instead of public internet.

External Secrets Operator with Azure Key Vault provides seamless integration between Azure's secret management and Kubernetes. Your applications consume standard Kubernetes Secrets while benefiting from Azure's enterprise features like managed identities, audit logging, and centralized access control.
