# How to Configure Environment Variables and Secrets in Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Environment Variables, Secrets, Configuration, Security, DevOps

Description: Learn how to manage environment variables and secrets in Azure Container Apps including Key Vault integration and best practices for secure configuration.

---

Every application needs configuration - database connection strings, API keys, feature flags, service URLs. In Azure Container Apps, you manage this through environment variables and secrets. Environment variables are for non-sensitive values like port numbers and log levels. Secrets are for anything you would not want to appear in logs or source control. This post covers both, including how to integrate with Azure Key Vault for centralized secret management.

## Environment Variables vs Secrets

The distinction matters for security:

- **Environment variables** are stored in the container app configuration and visible in the Azure portal, CLI output, and ARM template exports. Use them for things like `NODE_ENV=production` or `LOG_LEVEL=info`.
- **Secrets** are stored encrypted and are not visible in the portal or CLI output after creation. Use them for database passwords, API keys, and connection strings. Secrets are referenced by name in environment variable definitions using `secretref:`.

## Step 1: Set Environment Variables During Creation

You can set environment variables when creating the container app.

```bash
# Create a container app with environment variables
az containerapp create \
  --name my-api \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-api:v1 \
  --target-port 3000 \
  --ingress external \
  --env-vars "NODE_ENV=production" "LOG_LEVEL=info" "PORT=3000" "MAX_CONNECTIONS=50"
```

## Step 2: Update Environment Variables on an Existing App

Adding or changing environment variables creates a new revision.

```bash
# Add or update environment variables
az containerapp update \
  --name my-api \
  --resource-group my-rg \
  --set-env-vars "FEATURE_FLAG_NEW_UI=true" "CACHE_TTL=3600"

# Remove an environment variable by setting it to empty
az containerapp update \
  --name my-api \
  --resource-group my-rg \
  --remove-env-vars "FEATURE_FLAG_NEW_UI"
```

Each update triggers a new revision. If you are in single-revision mode, the new revision replaces the old one automatically.

## Step 3: Create Secrets

Secrets are defined at the container app level and can be referenced by environment variables and scale rules.

```bash
# Create a container app with secrets
az containerapp create \
  --name my-api \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-api:v1 \
  --target-port 3000 \
  --ingress external \
  --secrets "db-password=SuperSecret123" "api-key=sk-abc123xyz" \
  --env-vars "NODE_ENV=production" "DB_PASSWORD=secretref:db-password" "API_KEY=secretref:api-key"
```

The `secretref:` prefix tells Azure Container Apps to inject the secret value into the environment variable at runtime. The secret name must match one defined in `--secrets`.

## Step 4: Update Secrets

You can update secret values without changing your environment variable configuration.

```bash
# Update a secret value
az containerapp secret set \
  --name my-api \
  --resource-group my-rg \
  --secrets "db-password=NewPassword456"

# List all secrets (values are hidden)
az containerapp secret list \
  --name my-api \
  --resource-group my-rg \
  --output table
```

Note that updating a secret does not automatically restart your replicas. The new value takes effect when:
- A new revision is created
- Replicas are restarted manually
- The app scales up and new replicas are created

To force an immediate update, create a new revision.

```bash
# Create a new revision to pick up updated secrets
az containerapp revision copy \
  --name my-api \
  --resource-group my-rg
```

## Step 5: Integrate with Azure Key Vault

For production workloads, storing secrets directly in the container app configuration is not ideal. Azure Key Vault provides centralized secret management with access auditing and rotation capabilities.

First, create a Key Vault and add your secrets.

```bash
# Create a Key Vault
az keyvault create \
  --name my-keyvault \
  --resource-group my-rg \
  --location eastus

# Add secrets to Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name db-connection-string \
  --value "Server=myserver.database.windows.net;Database=mydb;User=admin;Password=secret"

az keyvault secret set \
  --vault-name my-keyvault \
  --name api-secret-key \
  --value "sk-production-key-12345"
```

Next, enable managed identity on your container app and grant it access to Key Vault.

```bash
# Enable system-assigned managed identity
az containerapp identity assign \
  --name my-api \
  --resource-group my-rg \
  --system-assigned

# Get the identity principal ID
PRINCIPAL_ID=$(az containerapp identity show \
  --name my-api \
  --resource-group my-rg \
  --query "principalId" -o tsv)

# Grant the identity access to Key Vault secrets
az keyvault set-policy \
  --name my-keyvault \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

Now configure the container app to pull secrets from Key Vault.

```bash
# Reference Key Vault secrets in the container app
az containerapp secret set \
  --name my-api \
  --resource-group my-rg \
  --secrets \
    "db-conn=keyvaultref:https://my-keyvault.vault.azure.net/secrets/db-connection-string,identityref:system"
```

The `keyvaultref:` prefix tells Azure Container Apps to fetch the secret from Key Vault using the specified managed identity.

## Step 6: Use Secrets in Bicep Templates

In a Bicep template, secrets and environment variables are defined in the container app resource.

```bicep
// Container app with secrets and environment variables
resource myApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'my-api'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      secrets: [
        {
          // Direct secret value
          name: 'static-secret'
          value: 'some-value'
        }
        {
          // Key Vault reference
          name: 'kv-secret'
          keyVaultUrl: 'https://my-keyvault.vault.azure.net/secrets/db-connection-string'
          identity: 'system'
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
      }
    }
    template: {
      containers: [
        {
          name: 'my-api'
          image: 'myregistry.azurecr.io/my-api:v1'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              // Plain environment variable
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              // Secret reference
              name: 'DB_CONNECTION'
              secretRef: 'kv-secret'
            }
          ]
        }
      ]
    }
  }
}
```

## Step 7: Access Configuration in Your Application

From your application's perspective, secrets and environment variables look the same - they are both available as regular environment variables.

```javascript
// server.js - Accessing configuration from environment variables
// No difference between secrets and regular env vars at runtime
const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbConnection: process.env.DB_CONNECTION,
  apiKey: process.env.API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required configuration at startup
const required = ['DB_CONNECTION', 'API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

console.log(`Starting server in ${config.nodeEnv} mode on port ${config.port}`);
```

## Best Practices

**Never hardcode secrets in your container image.** Environment variables and secrets should always be injected at runtime, not baked into the Docker image.

**Use Key Vault for production secrets.** While inline secrets are fine for development, Key Vault provides audit logging, rotation policies, and centralized management for production workloads.

**Validate configuration at startup.** Fail fast if required environment variables are missing. This gives you a clear error message instead of a cryptic crash later.

**Use descriptive secret names.** Names like `db-password` are clearer than `secret1`. You will thank yourself when you have 20 secrets to manage.

**Rotate secrets regularly.** When you update a secret in Key Vault, create a new revision of your container app to pick up the new value.

**Keep non-sensitive configuration as environment variables.** Not everything needs to be a secret. Log levels, feature flags, and port numbers can be plain environment variables. Overusing secrets adds unnecessary complexity.

## Troubleshooting

**Secret value not updating:** Remember that secret updates require a new revision or replica restart. Updating the secret alone does not affect running replicas.

**Key Vault access denied:** Check that the managed identity has the `get` permission on Key Vault secrets. Also verify the Key Vault URL format includes the full path to the secret.

**Environment variable not available in container:** Verify the variable name is correct. Environment variable names are case-sensitive. Also check the revision to make sure the latest configuration is deployed.

## Summary

Azure Container Apps provides a clean separation between non-sensitive configuration (environment variables) and sensitive values (secrets). For most projects, start with inline secrets for simplicity and move to Key Vault references when you need audit logging and centralized management. The important thing is to keep secrets out of your container images and source code, and to validate required configuration at startup so problems surface immediately rather than at the worst possible time.
