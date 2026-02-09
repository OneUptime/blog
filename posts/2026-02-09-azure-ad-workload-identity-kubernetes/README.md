# How to Implement Azure AD Workload Identity for Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, Security

Description: Learn how to configure Azure AD Workload Identity to give Kubernetes pods secure access to Azure resources without managing secrets or certificates.

---

Kubernetes pods running on Azure often need to access Azure resources like Storage Accounts, Key Vault, or Azure SQL. Storing credentials in pods or Kubernetes secrets creates security risks and operational overhead. Azure AD Workload Identity solves this by allowing pods to authenticate to Azure using federated identity credentials, exchanging Kubernetes service account tokens for Azure AD access tokens.

This guide will show you how to implement Azure AD Workload Identity in your AKS cluster for secure, keyless access to Azure services.

## Understanding Azure AD Workload Identity

Azure AD Workload Identity uses OpenID Connect (OIDC) federation to establish trust between your AKS cluster and Azure AD. Pods use Kubernetes service accounts that are mapped to Azure AD identities (managed identities or app registrations). When a pod needs to access Azure resources, it exchanges its service account token for an Azure AD token without requiring any stored credentials.

This approach provides fine-grained access control, automatic credential rotation, and eliminates the risk of leaked secrets. The Azure SDK automatically handles the token exchange transparently.

## Prerequisites and Cluster Setup

Ensure your AKS cluster supports OIDC issuer and workload identity:

```bash
# Create AKS cluster with OIDC issuer and workload identity enabled
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-count 3 \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys

# Or enable on existing cluster
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-oidc-issuer \
  --enable-workload-identity
```

Get the OIDC issuer URL for your cluster:

```bash
# Retrieve OIDC issuer URL
export OIDC_ISSUER=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

echo $OIDC_ISSUER
# Example: https://eastus.oic.prod-aks.azure.com/tenant-id/cluster-id/
```

## Installing Workload Identity Webhook

The workload identity webhook automatically injects environment variables and volumes into pods:

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group myResourceGroup \
  --name myAKSCluster

# Install Azure Workload Identity webhook using Helm
helm repo add azure-workload-identity https://azure.github.io/azure-workload-identity/charts
helm repo update

helm install workload-identity-webhook \
  azure-workload-identity/workload-identity-webhook \
  --namespace azure-workload-identity-system \
  --create-namespace \
  --set azureTenantID=$AZURE_TENANT_ID
```

Verify the webhook is running:

```bash
kubectl get pods -n azure-workload-identity-system

# Check mutating webhook configuration
kubectl get mutatingwebhookconfiguration azure-wi-webhook-mutating-webhook-configuration
```

## Creating Azure Managed Identity

Create a managed identity that your pods will use to access Azure resources:

```bash
# Create user-assigned managed identity
az identity create \
  --name myPodIdentity \
  --resource-group myResourceGroup \
  --location eastus

# Get the client ID
export USER_ASSIGNED_CLIENT_ID=$(az identity show \
  --name myPodIdentity \
  --resource-group myResourceGroup \
  --query 'clientId' \
  --output tsv)

echo $USER_ASSIGNED_CLIENT_ID
```

Grant the managed identity permissions to access Azure resources:

```bash
# Grant access to a storage account
export STORAGE_ACCOUNT_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --query 'id' \
  --output tsv)

az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee $USER_ASSIGNED_CLIENT_ID \
  --scope $STORAGE_ACCOUNT_ID

# Grant access to Key Vault
export KEY_VAULT_ID=$(az keyvault show \
  --name mykeyvault \
  --resource-group myResourceGroup \
  --query 'id' \
  --output tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $USER_ASSIGNED_CLIENT_ID \
  --scope $KEY_VAULT_ID
```

## Creating Federated Identity Credential

Establish trust between the Kubernetes service account and the Azure managed identity:

```bash
# Define service account details
export SERVICE_ACCOUNT_NAMESPACE="production"
export SERVICE_ACCOUNT_NAME="azure-access"

# Create federated identity credential
az identity federated-credential create \
  --name myFederatedIdentity \
  --identity-name myPodIdentity \
  --resource-group myResourceGroup \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:${SERVICE_ACCOUNT_NAMESPACE}:${SERVICE_ACCOUNT_NAME} \
  --audience api://AzureADTokenExchange
```

The subject must match exactly `system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT_NAME`. This grants only that specific service account permission to impersonate the managed identity.

## Creating Kubernetes Service Account

Create the Kubernetes service account with proper annotations:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: azure-access
  namespace: production
  annotations:
    azure.workload.identity/client-id: YOUR_CLIENT_ID
  labels:
    azure.workload.identity/use: "true"
```

Replace `YOUR_CLIENT_ID` with the managed identity client ID. Apply the service account:

```bash
# Substitute the client ID
cat > service-account.yaml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: azure-access
  namespace: production
  annotations:
    azure.workload.identity/client-id: ${USER_ASSIGNED_CLIENT_ID}
  labels:
    azure.workload.identity/use: "true"
EOF

kubectl apply -f service-account.yaml

# Verify creation
kubectl get sa azure-access -n production -o yaml
```

The label `azure.workload.identity/use: "true"` triggers the webhook to inject identity configurations.

## Deploying Pods with Workload Identity

Configure your deployments to use the service account:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: storage-app
  template:
    metadata:
      labels:
        app: storage-app
        azure.workload.identity/use: "true"  # Required label
    spec:
      serviceAccountName: azure-access
      containers:
      - name: app
        image: myregistry.azurecr.io/storage-app:latest
        env:
        - name: AZURE_CLIENT_ID
          value: YOUR_CLIENT_ID
```

The webhook automatically injects:
- `AZURE_AUTHORITY_HOST`
- `AZURE_FEDERATED_TOKEN_FILE`
- `AZURE_TENANT_ID`
- Volume mount for the service account token

Deploy the application:

```bash
kubectl apply -f deployment.yaml

# Check that environment variables are injected
kubectl describe pod -n production -l app=storage-app | grep AZURE_
```

## Testing Azure Access from Pods

Verify pods can authenticate to Azure:

```bash
# Create test pod with Azure CLI
kubectl run azure-cli-test -n production \
  --image=mcr.microsoft.com/azure-cli:latest \
  --serviceaccount=azure-access \
  --labels="azure.workload.identity/use=true" \
  --command -- sleep infinity

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/azure-cli-test -n production

# Exec into the pod
kubectl exec -it azure-cli-test -n production -- sh

# Inside the pod, verify environment variables
env | grep AZURE

# Login using workload identity
az login --federated-token $(cat $AZURE_FEDERATED_TOKEN_FILE) \
  --service-principal \
  -u $AZURE_CLIENT_ID \
  -t $AZURE_TENANT_ID

# Test storage access
az storage blob list \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --auth-mode login

# Clean up
exit
kubectl delete pod azure-cli-test -n production
```

## Using Workload Identity with Azure SDK

Azure SDKs automatically use workload identity. Here's a Python example:

```python
# app.py
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from azure.keyvault.secrets import SecretClient
import os

def upload_to_blob():
    """Upload file to Azure Blob Storage using Workload Identity"""
    # DefaultAzureCredential automatically uses workload identity
    credential = DefaultAzureCredential()

    account_url = "https://mystorageaccount.blob.core.windows.net"
    blob_service_client = BlobServiceClient(account_url, credential=credential)

    container_name = "mycontainer"
    blob_name = "myfile.txt"

    blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=blob_name
    )

    with open("localfile.txt", "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    print(f"Uploaded {blob_name}")

def get_secret():
    """Get secret from Key Vault using Workload Identity"""
    credential = DefaultAzureCredential()

    vault_url = "https://mykeyvault.vault.azure.net"
    secret_client = SecretClient(vault_url=vault_url, credential=credential)

    secret_name = "my-secret"
    secret = secret_client.get_secret(secret_name)
    print(f"Retrieved secret: {secret.value}")

if __name__ == "__main__":
    print("Testing Azure Workload Identity...")
    upload_to_blob()
    get_secret()
```

No explicit credentials needed - the SDK detects and uses workload identity automatically.

## Multiple Identities for Different Workloads

Create separate managed identities for different access levels:

```bash
# Create read-only identity
az identity create \
  --name myReadOnlyIdentity \
  --resource-group myResourceGroup

export READONLY_CLIENT_ID=$(az identity show \
  --name myReadOnlyIdentity \
  --resource-group myResourceGroup \
  --query 'clientId' \
  --output tsv)

# Grant read-only access
az role assignment create \
  --role "Storage Blob Data Reader" \
  --assignee $READONLY_CLIENT_ID \
  --scope $STORAGE_ACCOUNT_ID

# Create federated credential
az identity federated-credential create \
  --name myReadOnlyFederated \
  --identity-name myReadOnlyIdentity \
  --resource-group myResourceGroup \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:production:readonly-access \
  --audience api://AzureADTokenExchange

# Create service account
kubectl create sa readonly-access -n production
kubectl annotate sa readonly-access -n production \
  azure.workload.identity/client-id=$READONLY_CLIENT_ID
kubectl label sa readonly-access -n production \
  azure.workload.identity/use=true
```

Different pods can now use different identities based on their requirements.

## Troubleshooting Workload Identity

Common issues and solutions:

```bash
# Verify OIDC issuer is enabled
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "oidcIssuerProfile"

# Check webhook is running
kubectl get pods -n azure-workload-identity-system
kubectl logs -n azure-workload-identity-system -l app.kubernetes.io/name=workload-identity-webhook

# Verify pod has correct labels and annotations
kubectl describe pod -n production POD_NAME | grep -A5 "Labels\|Annotations"

# Check injected environment variables
kubectl exec -it POD_NAME -n production -- env | grep AZURE

# Verify federated credential
az identity federated-credential list \
  --identity-name myPodIdentity \
  --resource-group myResourceGroup
```

If authentication fails, ensure the service account namespace and name exactly match the federated credential subject.

## Monitoring Identity Usage

Enable Azure Monitor to track managed identity usage:

```bash
# Query identity sign-in logs
az monitor activity-log list \
  --resource-group myResourceGroup \
  --caller $USER_ASSIGNED_CLIENT_ID

# View resource access logs
az monitor diagnostic-settings create \
  --resource $STORAGE_ACCOUNT_ID \
  --name storage-diagnostics \
  --logs '[{"category":"StorageRead","enabled":true}]' \
  --workspace /subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.OperationalInsights/workspaces/WORKSPACE
```

Set up alerts for unusual access patterns or failed authentication attempts.

## Migrating from Pod Managed Identity

If using the older pod managed identity approach, migrate to workload identity:

```bash
# Remove old pod identity binding
az aks pod-identity delete \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --name old-pod-identity

# Remove NMI daemonset
kubectl delete daemonset nmi -n kube-system

# Follow steps above to create federated credential
# Update deployments to use new service account
# Remove azure.identity/use label (old system)
# Add azure.workload.identity/use label (new system)
```

Test thoroughly in non-production environments before migrating production workloads.

## Best Practices

Use separate managed identities for different applications and environments. Follow the principle of least privilege by granting only required permissions. Use custom RBAC roles with minimal permissions rather than built-in roles when possible.

Regularly audit managed identity permissions:

```bash
# List role assignments for an identity
az role assignment list \
  --assignee $USER_ASSIGNED_CLIENT_ID \
  --all

# Review and remove unnecessary permissions
az role assignment delete \
  --assignee $USER_ASSIGNED_CLIENT_ID \
  --role "Contributor" \
  --scope $RESOURCE_ID
```

Enable Conditional Access policies to restrict where identities can be used. Configure Azure Policy to enforce workload identity usage and prevent storing secrets in pods.

## Conclusion

Azure AD Workload Identity provides secure, keyless authentication for Kubernetes pods accessing Azure resources. By eliminating stored credentials and using short-lived tokens, it significantly reduces security risks while simplifying credential management.

Start by enabling workload identity on your AKS cluster and creating managed identities with minimal required permissions. Use federated credentials to establish trust between Kubernetes service accounts and Azure AD identities. The Azure SDK's automatic credential discovery makes implementation straightforward with minimal code changes.

Combined with proper RBAC, network policies, and monitoring, Azure AD Workload Identity forms a critical component of secure AKS deployments. The elimination of stored secrets and automatic credential rotation provide both security and operational benefits.
