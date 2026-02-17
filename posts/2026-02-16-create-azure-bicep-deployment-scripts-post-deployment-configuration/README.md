# How to Create Azure Bicep Deployment Scripts for Post-Deployment Configuration Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Deployment Scripts, Automation, Infrastructure as Code, Post-Deployment, Configuration

Description: Create Azure Bicep deployment scripts to run custom PowerShell or CLI commands for post-deployment configuration that Bicep resources alone cannot handle.

---

Bicep is great at deploying Azure resources, but sometimes you need to do things that are not covered by Azure Resource Manager. Seeding a database, configuring a third-party integration, uploading initial content to a storage account, or calling a REST API to register a webhook are all tasks that fall outside what ARM can express declaratively. Bicep deployment scripts fill this gap by letting you run Azure CLI or PowerShell commands as part of your deployment.

This post covers how to create and use deployment scripts in Bicep for common post-deployment configuration tasks.

## How Deployment Scripts Work

When you include a deployment script in your Bicep template, Azure creates a temporary container instance, runs your script inside it, and captures the output. The container has the Azure CLI or PowerShell pre-installed, and your script runs with a managed identity that you provide. After the script completes, the container and its storage are cleaned up based on a retention policy you specify.

The key points to understand: deployment scripts run in Azure Container Instances, they need a managed identity for authentication, they can accept inputs via environment variables, and they can return outputs that other Bicep resources can reference.

## Basic Deployment Script

Here is a simple deployment script that creates an initial admin user in a newly deployed database.

```bicep
// deployment-scripts.bicep
// Runs post-deployment configuration using Azure CLI scripts

@description('Location for the deployment script resources')
param location string = resourceGroup().location

@description('The SQL server name to configure')
param sqlServerName string

@description('Initial admin email for the application')
param adminEmail string

// Managed identity for the deployment script to use
resource scriptIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-deployment-scripts'
  location: location
}

// Grant the identity Contributor access to the resource group
resource identityRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, scriptIdentity.id, 'contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c' // Contributor role
    )
    principalId: scriptIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Deployment script: seed initial data
resource seedDataScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'seed-initial-data'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scriptIdentity.id}': {}
    }
  }
  properties: {
    // Azure CLI image version
    azCliVersion: '2.52.0'

    // Timeout for the script execution
    timeout: 'PT30M'

    // How long to keep the script resources after completion
    retentionInterval: 'PT1H'

    // Clean up on success, keep on failure for debugging
    cleanupPreference: 'OnSuccess'

    // Environment variables available to the script
    environmentVariables: [
      {
        name: 'SQL_SERVER_NAME'
        value: sqlServerName
      }
      {
        name: 'ADMIN_EMAIL'
        value: adminEmail
      }
      {
        // Secure environment variable - not logged
        name: 'ADMIN_PASSWORD'
        secureValue: 'InitialP@ssw0rd123!'
      }
    ]

    // The script to execute
    scriptContent: '''
      #!/bin/bash
      set -e

      echo "Starting initial data seed..."

      # Get the SQL server FQDN
      SQL_FQDN=$(az sql server show \
        --name $SQL_SERVER_NAME \
        --resource-group $AZ_SCRIPTS_RESOURCE_GROUP \
        --query fullyQualifiedDomainName -o tsv)

      echo "SQL Server: $SQL_FQDN"

      # Create the initial admin user via REST API or SQL
      # This is a simplified example - real implementation would use sqlcmd
      az rest --method post \
        --url "https://management.azure.com/subscriptions/$AZ_SCRIPTS_SUBSCRIPTION_ID/..." \
        --body "{\"email\": \"$ADMIN_EMAIL\"}"

      echo "Initial data seed complete"

      # Output results that can be used by other Bicep resources
      echo "{\"seedStatus\": \"complete\", \"adminEmail\": \"$ADMIN_EMAIL\"}" > $AZ_SCRIPTS_OUTPUT_FILE
    '''
  }
  dependsOn: [
    identityRoleAssignment
  ]
}

// Access the script outputs
output seedStatus string = seedDataScript.properties.outputs.seedStatus
```

## PowerShell Deployment Scripts

If you prefer PowerShell, change the `kind` to `AzurePowerShell`.

```bicep
// PowerShell deployment script for configuring Azure services
resource configureServicesScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'configure-services'
  location: location
  kind: 'AzurePowerShell'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scriptIdentity.id}': {}
    }
  }
  properties: {
    azPowerShellVersion: '10.0'
    timeout: 'PT15M'
    retentionInterval: 'PT1H'
    cleanupPreference: 'OnSuccess'

    environmentVariables: [
      {
        name: 'StorageAccountName'
        value: storageAccountName
      }
      {
        name: 'ContainerName'
        value: 'config'
      }
    ]

    scriptContent: '''
      # Upload initial configuration files to the storage account
      param()

      $ErrorActionPreference = "Stop"

      Write-Host "Configuring storage account: $env:StorageAccountName"

      # Get storage context using the managed identity
      $context = New-AzStorageContext -StorageAccountName $env:StorageAccountName -UseConnectedAccount

      # Create the configuration container if it doesn't exist
      $container = Get-AzStorageContainer -Name $env:ContainerName -Context $context -ErrorAction SilentlyContinue
      if (-not $container) {
          New-AzStorageContainer -Name $env:ContainerName -Context $context -Permission Off
          Write-Host "Created container: $env:ContainerName"
      }

      # Upload default configuration file
      $configContent = @{
          version = "1.0.0"
          features = @{
              darkMode = $false
              betaFeatures = $false
              maxUploadSize = 10485760
          }
          maintenance = @{
              enabled = $false
              message = "System is under maintenance"
          }
      } | ConvertTo-Json -Depth 5

      # Write to a temporary file
      $tempFile = [System.IO.Path]::GetTempFileName()
      Set-Content -Path $tempFile -Value $configContent

      # Upload to blob storage
      Set-AzStorageBlobContent `
          -Container $env:ContainerName `
          -File $tempFile `
          -Blob "app-config.json" `
          -Context $context `
          -Force

      Write-Host "Configuration file uploaded successfully"

      # Clean up temp file
      Remove-Item $tempFile

      # Set output
      $DeploymentScriptOutputs = @{
          configUploaded = $true
          configPath = "$($env:ContainerName)/app-config.json"
      }
    '''
  }
}
```

## Using External Scripts

For longer scripts, you can reference external files instead of inlining the script content. Use the `primaryScriptUri` property to point to a script stored in a publicly accessible location or use `supportingScriptUris` for additional files.

```bicep
// Deployment script that loads an external script file
resource externalScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'run-external-script'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scriptIdentity.id}': {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    timeout: 'PT30M'
    retentionInterval: 'PT1H'

    // Load the main script from a URL
    primaryScriptUri: 'https://raw.githubusercontent.com/your-org/scripts/main/post-deploy.sh'

    // Additional supporting scripts or files
    supportingScriptUris: [
      'https://raw.githubusercontent.com/your-org/scripts/main/helpers.sh'
      'https://raw.githubusercontent.com/your-org/scripts/main/config.json'
    ]

    environmentVariables: [
      {
        name: 'ENVIRONMENT'
        value: 'production'
      }
    ]
  }
}
```

## Waiting for Dependencies

Deployment scripts can depend on other resources, ensuring they run only after required infrastructure is in place.

```bicep
// Ensure the script runs after all dependent resources are created
resource postDeployConfig 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'post-deploy-configuration'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scriptIdentity.id}': {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    timeout: 'PT10M'
    retentionInterval: 'PT1H'

    // Use forceUpdateTag to re-run the script on every deployment
    // Without this, the script only runs when its definition changes
    forceUpdateTag: utcNow()

    environmentVariables: [
      {
        name: 'KEY_VAULT_NAME'
        value: keyVault.name
      }
      {
        name: 'APP_NAME'
        value: webApp.name
      }
    ]

    scriptContent: '''
      #!/bin/bash
      set -e

      echo "Running post-deployment configuration..."

      # Register a webhook in a third-party service
      WEBHOOK_URL="https://${APP_NAME}.azurewebsites.net/api/webhooks/events"

      # Store the webhook URL in Key Vault for reference
      az keyvault secret set \
        --vault-name $KEY_VAULT_NAME \
        --name "webhook-url" \
        --value "$WEBHOOK_URL"

      echo "Post-deployment configuration complete"
      echo '{"webhookRegistered": true}' > $AZ_SCRIPTS_OUTPUT_FILE
    '''
  }
  // Explicit dependencies ensure proper ordering
  dependsOn: [
    keyVault
    webApp
    identityRoleAssignment
  ]
}
```

The `forceUpdateTag` with `utcNow()` forces the script to re-run on every deployment. Without it, the script only runs when its definition changes. Use this for scripts that need to run every time, like cache invalidation or configuration refresh.

## Error Handling and Debugging

When a deployment script fails, you need to debug it. Setting `cleanupPreference` to `OnExpiration` keeps the container instance around after failure.

```bicep
resource debuggableScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'debuggable-config-script'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scriptIdentity.id}': {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    timeout: 'PT15M'
    // Keep resources for 6 hours after completion for debugging
    retentionInterval: 'PT6H'
    // Keep everything on failure, clean up only on success
    cleanupPreference: 'OnSuccess'

    scriptContent: '''
      #!/bin/bash
      set -e

      # Structured logging for easier debugging
      log() {
        echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $1"
      }

      log "Starting configuration script"
      log "Resource Group: $AZ_SCRIPTS_RESOURCE_GROUP"
      log "Subscription: $AZ_SCRIPTS_SUBSCRIPTION_ID"

      # Validate prerequisites
      if [ -z "$REQUIRED_PARAM" ]; then
        log "ERROR: REQUIRED_PARAM is not set"
        exit 1
      fi

      # Wrap operations in error handling
      if ! az storage account show --name "$STORAGE_NAME" --resource-group "$AZ_SCRIPTS_RESOURCE_GROUP" > /dev/null 2>&1; then
        log "ERROR: Storage account $STORAGE_NAME not found"
        exit 1
      fi

      log "All validations passed"
      log "Configuration complete"

      echo '{"status": "success"}' > $AZ_SCRIPTS_OUTPUT_FILE
    '''

    environmentVariables: [
      {
        name: 'REQUIRED_PARAM'
        value: 'some-value'
      }
      {
        name: 'STORAGE_NAME'
        value: storageAccount.name
      }
    ]
  }
}
```

To check the logs of a failed script, use the Azure CLI.

```bash
# List deployment script resources in the resource group
az deployment-scripts list --resource-group rg-myapp

# View the logs of a specific deployment script
az deployment-scripts show-log \
  --resource-group rg-myapp \
  --name debuggable-config-script
```

## Orchestrating the Full Deployment

Bring it all together in a main template that deploys infrastructure and runs post-deployment configuration.

```bicep
// main.bicep
// Full deployment with post-deployment configuration

param location string = resourceGroup().location
param environment string = 'production'

// Deploy infrastructure modules
module infrastructure 'modules/infrastructure.bicep' = {
  name: 'deploy-infrastructure'
  params: {
    location: location
    environment: environment
  }
}

// Run post-deployment configuration after infrastructure is ready
module postDeploy 'modules/deployment-scripts.bicep' = {
  name: 'post-deployment-config'
  params: {
    location: location
    sqlServerName: infrastructure.outputs.sqlServerName
    adminEmail: 'admin@example.com'
  }
  dependsOn: [
    infrastructure
  ]
}

output deploymentStatus string = postDeploy.outputs.seedStatus
```

## Summary

Bicep deployment scripts bridge the gap between declarative resource deployment and imperative configuration tasks. They run in a secure container with a managed identity, accept inputs through environment variables, and return outputs that other Bicep resources can consume. Use them for database seeding, initial configuration uploads, third-party webhook registration, or any task that ARM resources cannot express declaratively. The key best practices are: always use a managed identity with minimum required permissions, set appropriate timeouts, use structured logging for debugging, and clean up resources after successful execution.
