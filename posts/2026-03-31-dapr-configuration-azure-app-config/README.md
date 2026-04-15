# How to Use Dapr Configuration with Azure App Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, App Configuration, Configuration Management, Microservice

Description: Learn how to configure Dapr to use Azure App Configuration as a configuration store backend for centralized application settings on Azure deployments.

---

Azure App Configuration is a managed service for centralized application settings and feature flags. For teams running on Azure, it is a natural fit as the Dapr configuration store backend because it integrates natively with Microsoft Entra ID, supports versioning, and provides a web UI for managing configuration values.

## Set Up Azure App Configuration

Create an Azure App Configuration resource:

```bash
# Create the resource
az appconfig create \
  --name myapp-config \
  --resource-group myapp-rg \
  --location eastus \
  --sku Standard

# Get the connection string
az appconfig credential list \
  --name myapp-config \
  --resource-group myapp-rg \
  --query "[0].connectionString" -o tsv
```

## Add Configuration Values

```bash
# Add key-value pairs
az appconfig kv set \
  --name myapp-config \
  --key "myapp:max-retries" \
  --value "3" \
  --yes

az appconfig kv set \
  --name myapp-config \
  --key "myapp:timeout-seconds" \
  --value "30" \
  --yes

az appconfig kv set \
  --name myapp-config \
  --key "myapp:feature-flag-new-ui" \
  --value "false" \
  --yes

# Set a label for environment separation
az appconfig kv set \
  --name myapp-config \
  --key "myapp:log-level" \
  --value "warn" \
  --label production \
  --yes
```

## Configure the Dapr Component

Store the connection string in a Kubernetes secret:

```bash
kubectl create secret generic azure-appconfig-secret \
  --from-literal=connection-string="Endpoint=https://myapp-config.azconfig.io;Id=xxx;Secret=xxx" \
  -n production
```

Define the Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: production
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: azure-appconfig-secret
        key: connection-string
    - name: maxRetries
      value: "3"
    - name: retryDelay
      value: "4s"
    - name: subscribePollInterval
      value: "30s"
```

## Using Managed Identity Instead of Connection Strings

For AKS with Managed Identity, use Microsoft Entra ID authentication:

```yaml
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
    - name: host
      value: "https://myapp-config.azconfig.io"
    - name: azureClientId
      value: "your-managed-identity-client-id"
```

Grant the managed identity the `App Configuration Data Reader` role:

```bash
az role assignment create \
  --role "App Configuration Data Reader" \
  --assignee "your-managed-identity-client-id" \
  --scope "/subscriptions/.../resourceGroups/myapp-rg/providers/Microsoft.AppConfiguration/configurationStores/myapp-config"
```

## Reading Configuration

```bash
curl "http://localhost:3500/v1.0/configuration/appconfig?key=myapp:max-retries"
```

In .NET:

```csharp
using Dapr.Client;

var client = new DaprClientBuilder().Build();

var config = await client.GetConfiguration("appconfig", new[]
{
    "myapp:max-retries",
    "myapp:timeout-seconds",
    "myapp:feature-flag-new-ui"
});

var maxRetries = int.Parse(config.Items["myapp:max-retries"].Value);
var featureFlagEnabled = config.Items["myapp:feature-flag-new-ui"].Value == "true";
```

## Summary

Azure App Configuration as a Dapr configuration backend is ideal for Azure deployments because it provides a managed service with a web UI, Microsoft Entra ID integration, and label-based environment separation. Using Managed Identity eliminates the need to manage connection string secrets, and the Dapr component's `subscribePollInterval` setting controls how frequently configuration changes are polled.
