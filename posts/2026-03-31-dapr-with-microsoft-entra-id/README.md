# How to Use Dapr with Microsoft Entra ID (Azure AD)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Entra ID, Authentication, OAuth, Security

Description: Configure Dapr to authenticate Azure service components using Microsoft Entra ID (formerly Azure AD) with service principals, client certificates, and federated credentials.

---

Microsoft Entra ID (formerly Azure Active Directory) is the identity backbone of Azure. Dapr Azure components use Entra ID tokens to authenticate with services like Cosmos DB, Service Bus, and Key Vault. Understanding the authentication flow helps you choose the right credential type.

## Register an Application in Entra ID

```bash
# Create an app registration
az ad app create \
  --display-name "Dapr App" \
  --sign-in-audience AzureADMyOrg

# Get the app ID
APP_ID=$(az ad app list \
  --display-name "Dapr App" \
  --query "[0].appId" --output tsv)

# Create a service principal
az ad sp create --id "$APP_ID"

# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp show \
  --id "$APP_ID" \
  --query id --output tsv)
```

## Authenticate with Client Secret

```bash
# Create a client secret
CLIENT_SECRET=$(az ad app credential reset \
  --id "$APP_ID" \
  --append \
  --query password --output tsv)

# Get tenant ID
TENANT_ID=$(az account show --query tenantId --output tsv)

# Store in Kubernetes Secret
kubectl create secret generic entra-credentials \
  --from-literal=tenantId="$TENANT_ID" \
  --from-literal=clientId="$APP_ID" \
  --from-literal=clientSecret="$CLIENT_SECRET"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: my-servicebus.servicebus.windows.net
  - name: azureTenantId
    secretKeyRef:
      name: entra-credentials
      key: tenantId
  - name: azureClientId
    secretKeyRef:
      name: entra-credentials
      key: clientId
  - name: azureClientSecret
    secretKeyRef:
      name: entra-credentials
      key: clientSecret
```

## Authenticate with Client Certificate

Client certificates are more secure than secrets and are not vulnerable to leaking in logs or environment variables:

```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout dapr-key.pem \
  -out dapr-cert.pem -days 365 -nodes \
  -subj "/CN=dapr-app"

# Convert to PFX
openssl pkcs12 -export \
  -out dapr-cert.pfx \
  -inkey dapr-key.pem \
  -in dapr-cert.pem \
  -passout pass:""

# Upload certificate to app registration
az ad app credential reset \
  --id "$APP_ID" \
  --cert "@dapr-cert.pem" \
  --append

# Combine certificate and private key into a single PEM for Dapr
cat dapr-cert.pem dapr-key.pem > dapr-combined.pem

# Store combined PEM as Kubernetes Secret
kubectl create secret generic entra-cert \
  --from-file=certificate=dapr-combined.pem
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-keyvault
  - name: azureTenantId
    value: "YOUR_TENANT_ID"
  - name: azureClientId
    value: "YOUR_APP_ID"
  - name: azureCertificate
    secretKeyRef:
      name: entra-cert
      key: certificate
```

## Assign Azure RBAC Roles to the Service Principal

```bash
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# Grant Key Vault access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$SP_OBJECT_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/my-keyvault"

# Grant Cosmos DB access
az cosmosdb sql role assignment create \
  --resource-group my-rg \
  --account-name my-cosmosdb \
  --role-definition-id "00000000-0000-0000-0000-000000000002" \
  --principal-id "$SP_OBJECT_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.DocumentDB/databaseAccounts/my-cosmosdb"
```

## Test Authentication

```python
import requests

# Test Key Vault secret access via Dapr
resp = requests.get("http://localhost:3500/v1.0/secrets/secretstore/my-app-secret")
if resp.status_code == 200:
    print("Entra ID authentication successful")
    print(resp.json())
else:
    print(f"Authentication failed: {resp.status_code}")
    print(resp.text)
```

## Summary

Microsoft Entra ID provides the authentication foundation for all Dapr Azure components. Client secrets work well for development and testing, client certificates provide better security for production, and workload identity federation (via federated credentials) is ideal for Kubernetes deployments where no static credentials are needed. Azure RBAC role assignments control which Azure resources each Entra identity can access, enabling least-privilege service access.
