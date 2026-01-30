# How to Build Azure AKS Workload Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, AKS, Kubernetes, Security

Description: Configure Azure Workload Identity for AKS to grant pods Azure resource access using federated credentials without secrets.

---

Azure Workload Identity is the recommended way to authenticate your Kubernetes workloads with Azure services. It replaces the older pod-managed identity approach and provides a more secure, standards-based authentication mechanism using OpenID Connect (OIDC) federation.

This guide walks you through setting up workload identity on Azure Kubernetes Service (AKS) from scratch, including creating the necessary Azure resources, configuring Kubernetes service accounts, and testing the authentication flow.

## Prerequisites

Before starting, ensure you have the following tools installed and configured:

- Azure CLI version 2.47.0 or later
- kubectl configured to work with your AKS cluster
- An Azure subscription with permissions to create managed identities and role assignments
- Helm 3.x (for optional webhook installation)

Verify your Azure CLI version with this command:

```bash
az version --query '"azure-cli"' -o tsv
```

## Understanding Workload Identity Architecture

Workload identity uses a trust relationship between Azure AD and your Kubernetes cluster. Here is how the components work together:

| Component | Purpose |
|-----------|---------|
| OIDC Issuer | Kubernetes cluster endpoint that issues tokens for service accounts |
| Managed Identity | Azure identity that holds permissions to Azure resources |
| Federated Credential | Trust relationship linking the Kubernetes service account to the managed identity |
| Service Account | Kubernetes resource annotated to use the managed identity |
| Mutating Webhook | Automatically injects environment variables and token volumes into pods |

The authentication flow works as follows:

1. Your pod requests a service account token from Kubernetes
2. The token is projected into the pod as a volume
3. Your application exchanges this token with Azure AD
4. Azure AD validates the token against the OIDC issuer
5. Azure AD returns an access token for the managed identity
6. Your application uses this token to access Azure resources

## Step 1: Enable OIDC Issuer and Workload Identity on AKS

If you are creating a new cluster, enable both features during creation:

```bash
# Set variables for your environment
RESOURCE_GROUP="rg-workload-identity-demo"
CLUSTER_NAME="aks-workload-identity"
LOCATION="eastus"

# Create the resource group
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION

# Create AKS cluster with OIDC issuer and workload identity enabled
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --node-count 2 \
    --enable-oidc-issuer \
    --enable-workload-identity \
    --generate-ssh-keys
```

For an existing cluster, update it to enable these features:

```bash
# Enable OIDC issuer on existing cluster
az aks update \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --enable-oidc-issuer

# Enable workload identity on existing cluster
az aks update \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --enable-workload-identity
```

Retrieve the OIDC issuer URL, which you will need for creating federated credentials:

```bash
# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --query "oidcIssuerProfile.issuerUrl" \
    --output tsv)

echo "OIDC Issuer URL: $OIDC_ISSUER"
```

The output looks similar to this:

```
OIDC Issuer URL: https://eastus.oic.prod-aks.azure.com/00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111/
```

## Step 2: Create a User-Assigned Managed Identity

The managed identity holds the permissions your pods need to access Azure resources. Create one in your resource group:

```bash
# Set the identity name
IDENTITY_NAME="id-workload-identity-demo"

# Create the managed identity
az identity create \
    --resource-group $RESOURCE_GROUP \
    --name $IDENTITY_NAME \
    --location $LOCATION

# Get the managed identity client ID
IDENTITY_CLIENT_ID=$(az identity show \
    --resource-group $RESOURCE_GROUP \
    --name $IDENTITY_NAME \
    --query "clientId" \
    --output tsv)

# Get the managed identity principal ID (object ID)
IDENTITY_PRINCIPAL_ID=$(az identity show \
    --resource-group $RESOURCE_GROUP \
    --name $IDENTITY_NAME \
    --query "principalId" \
    --output tsv)

echo "Identity Client ID: $IDENTITY_CLIENT_ID"
echo "Identity Principal ID: $IDENTITY_PRINCIPAL_ID"
```

## Step 3: Assign Azure Roles to the Managed Identity

Grant the managed identity access to the Azure resources your application needs. This example demonstrates granting access to Azure Key Vault and Storage:

```bash
# Create a Key Vault for testing
KEYVAULT_NAME="kv-workload-demo-$(openssl rand -hex 4)"

az keyvault create \
    --resource-group $RESOURCE_GROUP \
    --name $KEYVAULT_NAME \
    --location $LOCATION \
    --enable-rbac-authorization true

# Get the Key Vault resource ID
KEYVAULT_ID=$(az keyvault show \
    --resource-group $RESOURCE_GROUP \
    --name $KEYVAULT_NAME \
    --query "id" \
    --output tsv)

# Assign Key Vault Secrets User role to the managed identity
az role assignment create \
    --assignee-object-id $IDENTITY_PRINCIPAL_ID \
    --assignee-principal-type ServicePrincipal \
    --role "Key Vault Secrets User" \
    --scope $KEYVAULT_ID

# Add a test secret to the Key Vault
az keyvault secret set \
    --vault-name $KEYVAULT_NAME \
    --name "test-secret" \
    --value "workload-identity-works"
```

For Storage Account access, use similar role assignments:

```bash
# Create a storage account for testing
STORAGE_NAME="stworkload$(openssl rand -hex 4)"

az storage account create \
    --resource-group $RESOURCE_GROUP \
    --name $STORAGE_NAME \
    --location $LOCATION \
    --sku Standard_LRS

# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
    --resource-group $RESOURCE_GROUP \
    --name $STORAGE_NAME \
    --query "id" \
    --output tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
    --assignee-object-id $IDENTITY_PRINCIPAL_ID \
    --assignee-principal-type ServicePrincipal \
    --role "Storage Blob Data Contributor" \
    --scope $STORAGE_ID
```

Common role assignments for different Azure services:

| Azure Service | Role Name | Use Case |
|--------------|-----------|----------|
| Key Vault | Key Vault Secrets User | Read secrets |
| Key Vault | Key Vault Certificates User | Read certificates |
| Key Vault | Key Vault Crypto User | Cryptographic operations |
| Storage | Storage Blob Data Reader | Read blob data |
| Storage | Storage Blob Data Contributor | Read and write blob data |
| Storage | Storage Queue Data Contributor | Work with queues |
| Azure SQL | SQL DB Contributor | Manage SQL databases |
| Service Bus | Azure Service Bus Data Sender | Send messages |
| Service Bus | Azure Service Bus Data Receiver | Receive messages |
| Event Hubs | Azure Event Hubs Data Sender | Send events |
| Cosmos DB | Cosmos DB Account Reader | Read Cosmos DB data |

## Step 4: Create the Federated Credential

The federated credential establishes trust between your Kubernetes service account and the Azure managed identity. This is the critical link that makes workload identity function:

```bash
# Set the Kubernetes namespace and service account name
NAMESPACE="workload-identity-demo"
SERVICE_ACCOUNT_NAME="workload-identity-sa"

# Create the federated credential
az identity federated-credential create \
    --name "fc-${SERVICE_ACCOUNT_NAME}" \
    --identity-name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP \
    --issuer $OIDC_ISSUER \
    --subject "system:serviceaccount:${NAMESPACE}:${SERVICE_ACCOUNT_NAME}" \
    --audiences "api://AzureADTokenExchange"
```

The subject field format is important. It must match exactly:

```
system:serviceaccount:<namespace>:<service-account-name>
```

If you need the same identity for multiple namespaces, create additional federated credentials:

```bash
# Create federated credential for another namespace
az identity federated-credential create \
    --name "fc-${SERVICE_ACCOUNT_NAME}-prod" \
    --identity-name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP \
    --issuer $OIDC_ISSUER \
    --subject "system:serviceaccount:production:${SERVICE_ACCOUNT_NAME}" \
    --audiences "api://AzureADTokenExchange"
```

## Step 5: Configure Kubernetes Resources

Connect to your AKS cluster and create the namespace and service account:

```bash
# Get credentials for the cluster
az aks get-credentials \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --overwrite-existing

# Create the namespace
kubectl create namespace $NAMESPACE
```

Create the service account with the required annotation and label. The annotation tells the workload identity webhook which Azure identity to use:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: workload-identity-sa
  namespace: workload-identity-demo
  annotations:
    # This annotation is required - it specifies which Azure identity to use
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
  labels:
    # This label enables the mutating webhook for pods using this SA
    azure.workload.identity/use: "true"
```

Apply the service account using a heredoc with your actual client ID:

```bash
# Create the service account with proper annotations
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${SERVICE_ACCOUNT_NAME}
  namespace: ${NAMESPACE}
  annotations:
    azure.workload.identity/client-id: "${IDENTITY_CLIENT_ID}"
  labels:
    azure.workload.identity/use: "true"
EOF
```

Verify the service account was created correctly:

```bash
kubectl get serviceaccount ${SERVICE_ACCOUNT_NAME} -n ${NAMESPACE} -o yaml
```

## Step 6: Deploy a Test Application

Create a test deployment that uses the workload identity to access Key Vault. This example uses the Azure CLI container to verify authentication:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workload-identity-test
  namespace: workload-identity-demo
  labels:
    app: workload-identity-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: workload-identity-test
  template:
    metadata:
      labels:
        app: workload-identity-test
        # This label is required for the webhook to inject identity configuration
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: workload-identity-sa
      containers:
      - name: azure-cli
        image: mcr.microsoft.com/azure-cli:latest
        command:
        - "/bin/bash"
        - "-c"
        - "sleep infinity"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Apply the test deployment:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workload-identity-test
  namespace: ${NAMESPACE}
  labels:
    app: workload-identity-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: workload-identity-test
  template:
    metadata:
      labels:
        app: workload-identity-test
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: ${SERVICE_ACCOUNT_NAME}
      containers:
      - name: azure-cli
        image: mcr.microsoft.com/azure-cli:latest
        command:
        - "/bin/bash"
        - "-c"
        - "sleep infinity"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
EOF
```

Wait for the pod to be ready:

```bash
kubectl wait --for=condition=ready pod \
    -l app=workload-identity-test \
    -n ${NAMESPACE} \
    --timeout=120s
```

## Step 7: Verify the Webhook Injection

The workload identity webhook automatically injects several environment variables and volumes into your pods. Check what was injected:

```bash
# Get the pod name
POD_NAME=$(kubectl get pods -n ${NAMESPACE} \
    -l app=workload-identity-test \
    -o jsonpath='{.items[0].metadata.name}')

# Check the injected environment variables
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- env | grep AZURE
```

You should see these environment variables injected by the webhook:

```
AZURE_CLIENT_ID=<your-identity-client-id>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_FEDERATED_TOKEN_FILE=/var/run/secrets/azure/tokens/azure-identity-token
AZURE_AUTHORITY_HOST=https://login.microsoftonline.com/
```

Check the projected service account token volume:

```bash
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- \
    ls -la /var/run/secrets/azure/tokens/
```

The token file is automatically rotated by Kubernetes and refreshed before expiration.

## Step 8: Test Azure Resource Access

Now verify that your pod can authenticate to Azure and access resources:

```bash
# Log in to Azure using workload identity (no credentials needed)
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- \
    az login --federated-token "$(cat /var/run/secrets/azure/tokens/azure-identity-token)" \
    --service-principal \
    -u $AZURE_CLIENT_ID \
    -t $AZURE_TENANT_ID

# A simpler approach - use the identity directly
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- \
    az login --identity --username ${IDENTITY_CLIENT_ID}
```

Test Key Vault access:

```bash
# Read the test secret from Key Vault
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- \
    az keyvault secret show \
    --vault-name ${KEYVAULT_NAME} \
    --name test-secret \
    --query value \
    -o tsv
```

Expected output:

```
workload-identity-works
```

## Step 9: Using Workload Identity in Application Code

Most Azure SDKs support workload identity through the DefaultAzureCredential class. Here are examples for different languages:

### Python Example

```python
# requirements.txt
# azure-identity>=1.14.0
# azure-keyvault-secrets>=4.7.0

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# DefaultAzureCredential automatically uses workload identity when available
credential = DefaultAzureCredential()

# Create a Key Vault client
vault_url = "https://<your-keyvault-name>.vault.azure.net"
client = SecretClient(vault_url=vault_url, credential=credential)

# Retrieve a secret
secret = client.get_secret("test-secret")
print(f"Secret value: {secret.value}")
```

### Go Example

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/Azure/azure-sdk-for-go/sdk/keyvault/azsecrets"
)

func main() {
    // DefaultAzureCredential automatically detects workload identity
    credential, err := azidentity.NewDefaultAzureCredential(nil)
    if err != nil {
        log.Fatalf("failed to create credential: %v", err)
    }

    // Create Key Vault client
    vaultURL := "https://<your-keyvault-name>.vault.azure.net"
    client, err := azsecrets.NewClient(vaultURL, credential, nil)
    if err != nil {
        log.Fatalf("failed to create client: %v", err)
    }

    // Get secret
    resp, err := client.GetSecret(context.Background(), "test-secret", "", nil)
    if err != nil {
        log.Fatalf("failed to get secret: %v", err)
    }

    fmt.Printf("Secret value: %s\n", *resp.Value)
}
```

### Node.js Example

```javascript
// package.json dependencies:
// "@azure/identity": "^3.3.0"
// "@azure/keyvault-secrets": "^4.7.0"

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

async function main() {
    // DefaultAzureCredential automatically uses workload identity
    const credential = new DefaultAzureCredential();

    // Create Key Vault client
    const vaultUrl = "https://<your-keyvault-name>.vault.azure.net";
    const client = new SecretClient(vaultUrl, credential);

    // Get secret
    const secret = await client.getSecret("test-secret");
    console.log(`Secret value: ${secret.value}`);
}

main().catch(console.error);
```

### .NET Example

```csharp
// NuGet packages:
// Azure.Identity
// Azure.Security.KeyVault.Secrets

using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

// DefaultAzureCredential automatically uses workload identity
var credential = new DefaultAzureCredential();

// Create Key Vault client
var vaultUri = new Uri("https://<your-keyvault-name>.vault.azure.net");
var client = new SecretClient(vaultUri, credential);

// Get secret
KeyVaultSecret secret = await client.GetSecretAsync("test-secret");
Console.WriteLine($"Secret value: {secret.Value}");
```

## Step 10: Production Deployment Example

Here is a complete production-ready deployment configuration:

```yaml
# production-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    name: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<MANAGED_IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  KEYVAULT_URL: "https://<your-keyvault>.vault.azure.net"
  STORAGE_ACCOUNT_URL: "https://<your-storage>.blob.core.windows.net"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
  labels:
    app: production-app
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
        version: v1
        azure.workload.identity/use: "true"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: app-service-account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: app
        image: myregistry.azurecr.io/myapp:v1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        envFrom:
        - configMapRef:
            name: app-config
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: production-app
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: production-app
---
apiVersion: v1
kind: Service
metadata:
  name: production-app
  namespace: production
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: production-app
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: production-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: production-app
```

## Troubleshooting Common Issues

### Issue: Pod Stuck in ContainerCreating

Check if the webhook is running:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=azure-workload-identity-webhook
```

Check webhook logs for errors:

```bash
kubectl logs -n kube-system \
    -l app.kubernetes.io/name=azure-workload-identity-webhook \
    --tail=100
```

### Issue: Authentication Fails with AADSTS700024

This error indicates the federated credential subject does not match. Verify:

```bash
# Check your service account details
kubectl get sa ${SERVICE_ACCOUNT_NAME} -n ${NAMESPACE} -o yaml

# Verify the federated credential configuration
az identity federated-credential show \
    --name "fc-${SERVICE_ACCOUNT_NAME}" \
    --identity-name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP
```

The subject in the federated credential must exactly match `system:serviceaccount:<namespace>:<sa-name>`.

### Issue: Environment Variables Not Injected

Verify the pod has the required label:

```bash
kubectl get pod ${POD_NAME} -n ${NAMESPACE} \
    -o jsonpath='{.metadata.labels.azure\.workload\.identity/use}'
```

Verify the service account has the required annotation and label:

```bash
kubectl get sa ${SERVICE_ACCOUNT_NAME} -n ${NAMESPACE} \
    -o jsonpath='{.metadata.annotations.azure\.workload\.identity/client-id}'

kubectl get sa ${SERVICE_ACCOUNT_NAME} -n ${NAMESPACE} \
    -o jsonpath='{.metadata.labels.azure\.workload\.identity/use}'
```

### Issue: Token File Not Found

Check if the projected volume is mounted:

```bash
kubectl describe pod ${POD_NAME} -n ${NAMESPACE} | grep -A 10 "Volumes:"
```

Verify the token file path:

```bash
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- \
    cat /var/run/secrets/azure/tokens/azure-identity-token | head -c 100
```

### Debugging Checklist

| Check | Command |
|-------|---------|
| OIDC issuer enabled | `az aks show -g $RG -n $CLUSTER --query oidcIssuerProfile.enabled` |
| Workload identity enabled | `az aks show -g $RG -n $CLUSTER --query securityProfile.workloadIdentity.enabled` |
| Webhook running | `kubectl get pods -n kube-system -l app.kubernetes.io/name=azure-workload-identity-webhook` |
| Service account annotation | `kubectl get sa $SA -n $NS -o jsonpath='{.metadata.annotations}'` |
| Pod label | `kubectl get pod $POD -n $NS -o jsonpath='{.metadata.labels}'` |
| Federated credential exists | `az identity federated-credential list --identity-name $ID -g $RG` |
| Role assignment exists | `az role assignment list --assignee $PRINCIPAL_ID` |

## Cleanup Resources

When you are done testing, remove all created resources:

```bash
# Delete the Kubernetes resources
kubectl delete namespace ${NAMESPACE}

# Delete the federated credential
az identity federated-credential delete \
    --name "fc-${SERVICE_ACCOUNT_NAME}" \
    --identity-name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP \
    --yes

# Delete the managed identity
az identity delete \
    --name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP

# Delete the Key Vault (if created for testing)
az keyvault delete \
    --name $KEYVAULT_NAME \
    --resource-group $RESOURCE_GROUP

# Purge the Key Vault (required for soft-delete enabled vaults)
az keyvault purge \
    --name $KEYVAULT_NAME \
    --location $LOCATION

# Delete the storage account (if created for testing)
az storage account delete \
    --name $STORAGE_NAME \
    --resource-group $RESOURCE_GROUP \
    --yes

# Delete the AKS cluster
az aks delete \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --yes

# Delete the resource group (removes everything)
az group delete \
    --name $RESOURCE_GROUP \
    --yes
```

## Security Best Practices

Follow these practices when using workload identity in production:

1. **Principle of Least Privilege**: Assign only the minimum required roles to managed identities. Avoid using Owner or Contributor roles when Reader or specific data plane roles suffice.

2. **Separate Identities per Application**: Create dedicated managed identities for each application rather than sharing identities across multiple workloads.

3. **Namespace Isolation**: Use separate namespaces for different environments (dev, staging, production) with different managed identities for each.

4. **Audit Federated Credentials**: Regularly review federated credentials to ensure they match active deployments:

```bash
az identity federated-credential list \
    --identity-name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table
```

5. **Monitor Authentication Events**: Enable diagnostic logging on Azure AD to track workload identity authentication:

```bash
az monitor diagnostic-settings create \
    --name "workload-identity-logs" \
    --resource "/subscriptions/<sub-id>/providers/Microsoft.AAD/domainServices/<domain>" \
    --logs '[{"category": "SignInLogs", "enabled": true}]' \
    --workspace "<log-analytics-workspace-id>"
```

6. **Use Pod Security Standards**: Enforce restricted pod security standards to prevent privilege escalation:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Summary

Azure Workload Identity provides a secure, standards-based approach for authenticating Kubernetes workloads with Azure services. By using OIDC federation, your applications can access Azure resources without storing secrets or managing credentials.

Key takeaways:

- Enable OIDC issuer and workload identity on your AKS cluster
- Create managed identities with appropriate role assignments
- Establish trust using federated credentials
- Annotate service accounts with the managed identity client ID
- Label pods to enable webhook injection
- Use DefaultAzureCredential in your application code

This approach eliminates the need for storing Azure credentials in Kubernetes secrets, reduces the attack surface, and simplifies credential rotation since tokens are automatically refreshed by the platform.
