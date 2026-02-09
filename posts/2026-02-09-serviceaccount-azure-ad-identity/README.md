# How to Configure ServiceAccount for Azure AD Workload Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, Identity

Description: Configure Azure AD Workload Identity for Kubernetes ServiceAccounts to grant pods secure access to Azure resources using federated credentials without passwords or keys.

---

Azure AD Workload Identity enables Kubernetes pods to authenticate with Azure services using their ServiceAccount tokens through federated identity credentials. This eliminates the need for service principal passwords or managed identity keys, providing a more secure authentication method.

## Understanding Azure AD Workload Identity

Azure AD Workload Identity works through OpenID Connect (OIDC) federation. Your AKS cluster exposes an OIDC issuer endpoint that Azure AD trusts. When a pod needs Azure access, it presents its ServiceAccount token. Azure AD validates this token and issues Azure AD access tokens for the configured application.

The authentication flow involves several steps. The pod receives a ServiceAccount token from the kubelet. A mutating webhook injects environment variables and volume mounts. The Azure SDK reads these injected configurations. The SDK exchanges the ServiceAccount token for an Azure AD token. The pod uses the Azure AD token to access Azure resources.

This approach provides significant security benefits. No static credentials stored in your cluster. Tokens are short-lived and rotate automatically. Fine-grained access control through Azure RBAC. Comprehensive audit logging through Azure Activity Log.

## Prerequisites and Setup

Enable OIDC issuer on your AKS cluster:

```bash
# For new clusters
az aks create \
    --resource-group my-rg \
    --name my-cluster \
    --enable-oidc-issuer \
    --enable-workload-identity

# For existing clusters
az aks update \
    --resource-group my-rg \
    --name my-cluster \
    --enable-oidc-issuer \
    --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show \
    --resource-group my-rg \
    --name my-cluster \
    --query "oidcIssuerProfile.issuerUrl" \
    --output tsv)

echo "OIDC Issuer: $OIDC_ISSUER"
```

Install the Azure Workload Identity webhook:

```bash
helm repo add azure-workload-identity https://azure.github.io/azure-workload-identity/charts
helm repo update

helm install workload-identity-webhook \
    azure-workload-identity/workload-identity-webhook \
    --namespace azure-workload-identity-system \
    --create-namespace \
    --set azureTenantID="<TENANT_ID>"
```

## Creating an Azure AD Application

Create an Azure AD application for your workload:

```bash
# Create the application
az ad app create --display-name k8s-storage-app

# Get the application (client) ID
APP_ID=$(az ad app list \
    --display-name k8s-storage-app \
    --query [].appId \
    --output tsv)

echo "Application ID: $APP_ID"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId --output tsv)
echo "Tenant ID: $TENANT_ID"
```

Create a federated identity credential:

```bash
# Create federated credential
az ad app federated-credential create \
    --id $APP_ID \
    --parameters '{
        "name": "kubernetes-federated-credential",
        "issuer": "'$OIDC_ISSUER'",
        "subject": "system:serviceaccount:production:storage-app",
        "description": "Kubernetes ServiceAccount",
        "audiences": [
            "api://AzureADTokenExchange"
        ]
    }'
```

The subject must match the Kubernetes ServiceAccount in the format `system:serviceaccount:<namespace>:<serviceaccount-name>`.

## Granting Azure Permissions

Assign Azure role permissions to the application:

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
    --assignee $APP_ID \
    --role "Storage Blob Data Contributor" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount

# Assign Key Vault Secrets User role
az role assignment create \
    --assignee $APP_ID \
    --role "Key Vault Secrets User" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/mykeyvault
```

Use the principle of least privilege - grant only necessary permissions.

## Configuring the ServiceAccount

Create a ServiceAccount with workload identity annotations:

```yaml
# storage-app-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: storage-app
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<APP_ID>"
    azure.workload.identity/tenant-id: "<TENANT_ID>"
    azure.workload.identity/service-account-token-expiration: "3600"
```

Apply the ServiceAccount:

```bash
kubectl apply -f storage-app-serviceaccount.yaml

# Verify annotations
kubectl get serviceaccount storage-app -n production -o yaml
```

## Deploying Pods with Workload Identity

Create a pod that uses the ServiceAccount:

```yaml
# storage-app-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-app
  namespace: production
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: storage-app
  containers:
  - name: app
    image: mcr.microsoft.com/azure-cli
    command:
    - /bin/bash
    - -c
    - |
      echo "Testing Azure Storage access..."
      az login --identity
      az storage blob list \
        --account-name mystorageaccount \
        --container-name mycontainer
      sleep 3600
```

The `azure.workload.identity/use: "true"` label enables the mutating webhook.

Deploy and test:

```bash
kubectl apply -f storage-app-pod.yaml

# Check logs
kubectl logs storage-app -n production

# Verify injected environment variables
kubectl exec storage-app -n production -- env | grep AZURE
```

You should see variables like:

```
AZURE_CLIENT_ID=<APP_ID>
AZURE_TENANT_ID=<TENANT_ID>
AZURE_FEDERATED_TOKEN_FILE=/var/run/secrets/azure/tokens/azure-identity-token
AZURE_AUTHORITY_HOST=https://login.microsoftonline.com/
```

## Using Azure SDK for Go

The Azure SDK automatically uses workload identity:

```go
// storage-access.go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

func main() {
    ctx := context.Background()

    // Create credential using workload identity
    cred, err := azidentity.NewDefaultAzureCredential(nil)
    if err != nil {
        log.Fatalf("failed to create credential: %v", err)
    }

    // Create blob client
    accountURL := "https://mystorageaccount.blob.core.windows.net/"
    client, err := azblob.NewClient(accountURL, cred, nil)
    if err != nil {
        log.Fatalf("failed to create client: %v", err)
    }

    // List containers
    pager := client.NewListContainersPager(nil)
    for pager.More() {
        resp, err := pager.NextPage(ctx)
        if err != nil {
            log.Fatalf("failed to list containers: %v", err)
        }

        for _, container := range resp.ContainerItems {
            fmt.Printf("Container: %s\n", *container.Name)
        }
    }
}
```

The DefaultAzureCredential automatically detects workload identity configuration.

## Python Implementation with Azure SDK

For Python applications:

```python
# azure_storage_access.py
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import os

def main():
    # DefaultAzureCredential automatically uses workload identity
    credential = DefaultAzureCredential()

    # Create blob service client
    account_url = "https://mystorageaccount.blob.core.windows.net"
    blob_service_client = BlobServiceClient(
        account_url=account_url,
        credential=credential
    )

    # List containers
    print("Storage containers:")
    containers = blob_service_client.list_containers()
    for container in containers:
        print(f"  - {container.name}")

    # Access Key Vault
    from azure.keyvault.secrets import SecretClient

    vault_url = "https://mykeyvault.vault.azure.net"
    secret_client = SecretClient(vault_url=vault_url, credential=credential)

    # List secrets
    print("\nKey Vault secrets:")
    secrets = secret_client.list_properties_of_secrets()
    for secret in secrets:
        print(f"  - {secret.name}")

if __name__ == "__main__":
    main()
```

## Accessing Multiple Azure Services

Configure permissions for multiple services:

```bash
# Storage access
az role assignment create \
    --assignee $APP_ID \
    --role "Storage Blob Data Contributor" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg

# Key Vault access
az role assignment create \
    --assignee $APP_ID \
    --role "Key Vault Secrets User" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/mykeyvault

# Cosmos DB access
az role assignment create \
    --assignee $APP_ID \
    --role "Cosmos DB Account Reader Role" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb

# Service Bus access
az role assignment create \
    --assignee $APP_ID \
    --role "Azure Service Bus Data Sender" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.ServiceBus/namespaces/myservicebus
```

## Using in Production Deployments

Configure workload identity for a Deployment:

```yaml
# production-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: production-app
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<APP_ID>"
    azure.workload.identity/tenant-id: "<TENANT_ID>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: production-app
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        env:
        - name: AZURE_STORAGE_ACCOUNT
          value: mystorageaccount
        - name: KEYVAULT_NAME
          value: mykeyvault
```

All replicas automatically get Azure access.

## Handling Multiple Namespaces

Create separate federated credentials for different namespaces:

```bash
# Development namespace
az ad app federated-credential create \
    --id $APP_ID \
    --parameters '{
        "name": "dev-federated-credential",
        "issuer": "'$OIDC_ISSUER'",
        "subject": "system:serviceaccount:development:app-sa",
        "audiences": ["api://AzureADTokenExchange"]
    }'

# Staging namespace
az ad app federated-credential create \
    --id $APP_ID \
    --parameters '{
        "name": "staging-federated-credential",
        "issuer": "'$OIDC_ISSUER'",
        "subject": "system:serviceaccount:staging:app-sa",
        "audiences": ["api://AzureADTokenExchange"]
    }'

# Production namespace
az ad app federated-credential create \
    --id $APP_ID \
    --parameters '{
        "name": "prod-federated-credential",
        "issuer": "'$OIDC_ISSUER'",
        "subject": "system:serviceaccount:production:app-sa",
        "audiences": ["api://AzureADTokenExchange"]
    }'
```

Each namespace gets its own federated credential while using the same Azure AD application.

## Troubleshooting Workload Identity

Common issues and debugging steps:

```bash
# Verify OIDC issuer is enabled
az aks show --resource-group my-rg --name my-cluster \
    --query "oidcIssuerProfile.issuerUrl"

# Check if webhook is running
kubectl get pods -n azure-workload-identity-system

# Verify ServiceAccount annotations
kubectl get serviceaccount storage-app -n production -o yaml

# Check if pod has the required label
kubectl get pod storage-app -n production -o jsonpath='{.metadata.labels}'

# Verify environment variables were injected
kubectl exec storage-app -n production -- env | grep AZURE

# Check federated credentials
az ad app federated-credential list --id $APP_ID

# Test token exchange manually
TOKEN=$(kubectl exec storage-app -n production -- cat /var/run/secrets/azure/tokens/azure-identity-token)
curl -X POST https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token \
    -d "client_id=$APP_ID" \
    -d "grant_type=client_credentials" \
    -d "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer" \
    -d "client_assertion=$TOKEN" \
    -d "scope=https://storage.azure.com/.default"
```

## Monitoring and Auditing

Track workload identity usage:

```bash
# Query Azure Activity Log for sign-ins
az monitor activity-log list \
    --resource-group my-rg \
    --offset 1d \
    --query "[?contains(authorization.action, 'roleAssignment')]"

# View sign-in logs for the application
az ad app list --display-name k8s-storage-app --query [].appId -o tsv | \
    xargs -I {} az monitor activity-log list --resource-id {}
```

Create alerts for failed authentications:

```bash
# Create alert rule for failed auth
az monitor metrics alert create \
    --name FailedWorkloadIdentityAuth \
    --resource-group my-rg \
    --scopes /subscriptions/$SUBSCRIPTION_ID \
    --condition "count failedSignIns > 10" \
    --window-size 5m \
    --evaluation-frequency 1m
```

## Security Best Practices

Use separate Azure AD applications for different environments:

```yaml
# development-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: development
  annotations:
    azure.workload.identity/client-id: "<DEV_APP_ID>"
---
# production-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<PROD_APP_ID>"
```

Grant minimal permissions:

```bash
# Good: Specific scope
az role assignment create \
    --assignee $APP_ID \
    --role "Storage Blob Data Reader" \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/myaccount/blobServices/default/containers/mycontainer

# Bad: Overly broad scope
# az role assignment create \
#     --assignee $APP_ID \
#     --role "Contributor" \
#     --scope /subscriptions/$SUBSCRIPTION_ID
```

## Conclusion

Azure AD Workload Identity provides secure, passwordless authentication for Kubernetes workloads accessing Azure resources. By configuring federated identity credentials and annotating ServiceAccounts with Azure AD application information, you enable pods to exchange their ServiceAccount tokens for Azure AD tokens. This eliminates static credentials, provides comprehensive audit trails, and integrates seamlessly with Azure RBAC. Implement workload identity for all AKS workloads that need Azure resource access - it's the most secure authentication method available.
