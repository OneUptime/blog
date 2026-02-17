# How to Configure Azure Table Storage Connection Strings for Different Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Table Storage, Connection Strings, Configuration Management, Environment Variables, Key Vault

Description: Learn how to properly manage Azure Table Storage connection strings across development, staging, and production environments with security best practices.

---

Managing connection strings for Azure Table Storage across multiple environments is one of those things that seems simple until you get it wrong. A hardcoded connection string accidentally pushed to a public repository, a staging environment accidentally connecting to production, or a rotation of storage keys that breaks your application - these are all common mistakes that proper connection string management prevents.

This guide covers the different connection string formats, how to manage them securely across environments, and best practices for production deployments.

## Azure Table Storage Connection String Formats

Azure Table Storage supports several connection string formats depending on your scenario.

**Standard connection string with account key**:

```
DefaultEndpointsProtocol=https;AccountName=stmyapp;AccountKey=base64encodedkey==;EndpointSuffix=core.windows.net
```

**Connection string with specific endpoint**:

```
DefaultEndpointsProtocol=https;AccountName=stmyapp;AccountKey=base64encodedkey==;TableEndpoint=https://stmyapp.table.core.windows.net
```

**Connection string for Azure Storage Emulator (local development)**:

```
UseDevelopmentStorage=true
```

**Connection string with SAS token**:

```
TableEndpoint=https://stmyapp.table.core.windows.net;SharedAccessSignature=sv=2021-06-08&ss=t&srt=sco&sp=rwdlacu&se=2026-12-31&st=2026-01-01&spr=https&sig=signature
```

**Connection string for Azurite (local emulator)**:

```
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1
```

## Step 1: Set Up Per-Environment Configuration

The most common approach is to use environment-specific configuration files combined with environment variables for secrets.

For a .NET application, use `appsettings.{Environment}.json`:

```json
// appsettings.Development.json
{
  "Storage": {
    "TableStorage": {
      "ConnectionString": "UseDevelopmentStorage=true",
      "TablePrefix": "dev"
    }
  }
}
```

```json
// appsettings.Staging.json
{
  "Storage": {
    "TableStorage": {
      "AccountName": "ststaging2026",
      "TablePrefix": "stg"
    }
  }
}
```

```json
// appsettings.Production.json
{
  "Storage": {
    "TableStorage": {
      "AccountName": "stprod2026",
      "TablePrefix": ""
    }
  }
}
```

Notice that staging and production do not include the actual connection string in the config file. The connection string comes from environment variables or Key Vault at runtime.

The code that reads the configuration:

```csharp
// Program.cs
// Configure Table Storage client based on environment
var builder = WebApplication.CreateBuilder(args);

// In Development, use the connection string from config
// In other environments, use Key Vault or environment variables
var connectionString = builder.Configuration["Storage:TableStorage:ConnectionString"]
    ?? Environment.GetEnvironmentVariable("AZURE_TABLE_STORAGE_CONNECTION_STRING");

builder.Services.AddSingleton(new TableServiceClient(connectionString));
```

## Step 2: Use Environment Variables for Secrets

Never put production connection strings in configuration files that get committed to source control. Use environment variables instead.

For local development, use a `.env` file (add `.env` to your `.gitignore`):

```bash
# .env (DO NOT commit this file)
AZURE_TABLE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true"
```

For Azure App Service, set the connection string as an app setting:

```bash
# Set connection string for staging
az webapp config connection-string set \
  --resource-group rg-app-staging \
  --name myapp-staging \
  --connection-string-type Custom \
  --settings "AzureTableStorage=DefaultEndpointsProtocol=https;AccountName=ststaging2026;AccountKey=<staging-key>;EndpointSuffix=core.windows.net"

# Set connection string for production
az webapp config connection-string set \
  --resource-group rg-app-prod \
  --name myapp-prod \
  --connection-string-type Custom \
  --settings "AzureTableStorage=DefaultEndpointsProtocol=https;AccountName=stprod2026;AccountKey=<prod-key>;EndpointSuffix=core.windows.net"
```

For Kubernetes deployments, use secrets:

```yaml
# k8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: table-storage-secret
  namespace: myapp
type: Opaque
stringData:
  connection-string: "DefaultEndpointsProtocol=https;AccountName=stprod2026;AccountKey=<key>;EndpointSuffix=core.windows.net"
```

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          env:
            - name: AZURE_TABLE_STORAGE_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: table-storage-secret
                  key: connection-string
```

## Step 3: Use Azure Key Vault for Production

For production environments, store connection strings in Azure Key Vault. This provides audit logging, access control, and automatic rotation capabilities.

Store the connection string in Key Vault:

```bash
# Store the production connection string as a secret
az keyvault secret set \
  --vault-name kv-myapp-prod \
  --name "TableStorageConnectionString" \
  --value "DefaultEndpointsProtocol=https;AccountName=stprod2026;AccountKey=<key>;EndpointSuffix=core.windows.net"
```

Reference the Key Vault secret in your application:

```python
# Python example using Key Vault to retrieve connection string
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.data.tables import TableServiceClient

# Authenticate to Key Vault using managed identity or service principal
credential = DefaultAzureCredential()
secret_client = SecretClient(
    vault_url="https://kv-myapp-prod.vault.azure.net",
    credential=credential
)

# Retrieve the connection string from Key Vault
connection_string = secret_client.get_secret("TableStorageConnectionString").value

# Create the Table Storage client
table_service = TableServiceClient.from_connection_string(connection_string)

# Now use the client
table_client = table_service.get_table_client("orders")
```

For .NET applications, use the Key Vault configuration provider:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add Key Vault as a configuration source
var keyVaultUri = new Uri($"https://{builder.Configuration["KeyVault:Name"]}.vault.azure.net");
builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());

// The connection string is now available via configuration
var connectionString = builder.Configuration["TableStorageConnectionString"];
```

## Step 4: Use Managed Identity Instead of Connection Strings

The most secure approach is to avoid connection strings entirely and use Azure AD authentication with managed identity:

```python
from azure.identity import DefaultAzureCredential
from azure.data.tables import TableServiceClient

# No connection string needed - authenticate with managed identity
credential = DefaultAzureCredential()

# Use the account URL directly
table_service = TableServiceClient(
    endpoint="https://stprod2026.table.core.windows.net",
    credential=credential
)

# Assign the "Storage Table Data Contributor" role to your managed identity
# This replaces the need for account keys in the connection string
```

Grant the managed identity the appropriate role:

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --resource-group rg-app-prod \
  --name myapp-prod \
  --query principalId -o tsv)

# Grant Table Data Contributor role
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Table Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-storage/providers/Microsoft.Storage/storageAccounts/stprod2026"
```

With this approach, your configuration per environment is just the endpoint URL - no secrets to manage:

```json
// appsettings.Development.json
{
  "Storage": {
    "TableEndpoint": "http://127.0.0.1:10002/devstoreaccount1"
  }
}

// appsettings.Production.json
{
  "Storage": {
    "TableEndpoint": "https://stprod2026.table.core.windows.net"
  }
}
```

## Step 5: Handle Storage Key Rotation

Storage account keys should be rotated periodically. When using connection strings with account keys, rotation can cause downtime if not handled correctly.

Here is a safe rotation procedure:

```bash
# Step 1: Check which key your application is using
az storage account keys list \
  --account-name stprod2026 \
  --resource-group rg-storage \
  --output table

# Step 2: Update your application to use key2 (if currently using key1)
NEW_KEY=$(az storage account keys list \
  --account-name stprod2026 \
  --resource-group rg-storage \
  --query "[1].value" -o tsv)

NEW_CONN="DefaultEndpointsProtocol=https;AccountName=stprod2026;AccountKey=$NEW_KEY;EndpointSuffix=core.windows.net"

# Update Key Vault with the new connection string
az keyvault secret set \
  --vault-name kv-myapp-prod \
  --name "TableStorageConnectionString" \
  --value "$NEW_CONN"

# Step 3: Restart your application to pick up the new secret
az webapp restart --resource-group rg-app-prod --name myapp-prod

# Step 4: After verifying the app works, regenerate key1
az storage account keys renew \
  --account-name stprod2026 \
  --resource-group rg-storage \
  --key key1
```

Using managed identity eliminates this entire process since there are no keys to rotate.

## Step 6: Validate Connection Strings

Before deploying, validate that your connection string is correct:

```python
from azure.data.tables import TableServiceClient

def validate_connection(connection_string):
    """Validate a Table Storage connection string by listing tables"""
    try:
        service = TableServiceClient.from_connection_string(connection_string)
        # Try to list tables as a connectivity check
        tables = list(service.list_tables())
        print(f"Connection valid. Found {len(tables)} tables.")
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

# Validate before deployment
validate_connection(connection_string)
```

## Wrapping Up

Managing Azure Table Storage connection strings across environments is about keeping secrets out of source control, using the right authentication method for each environment, and having a clear strategy for key rotation. For development, use the local emulator. For staging and production, prefer managed identity over connection strings to eliminate secrets entirely. If you must use connection strings, store them in Azure Key Vault and reference them at runtime. Whatever approach you choose, automate your key rotation process and validate connections as part of your deployment pipeline.
