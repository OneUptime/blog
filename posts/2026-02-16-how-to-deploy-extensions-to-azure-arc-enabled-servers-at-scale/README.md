# How to Deploy Extensions to Azure Arc-Enabled Servers at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, VM Extensions, Automation, Hybrid Cloud, At Scale, Server Management

Description: A practical guide to deploying VM extensions to Azure Arc-enabled servers at scale using Azure Policy, CLI, and automation tools for consistent hybrid management.

---

Once you have your on-premises servers connected to Azure Arc, the next step is extending their capabilities with VM extensions. Extensions are the mechanism that enables Azure services to integrate with your Arc-enabled servers - things like log collection, monitoring, security scanning, and custom scripts. Deploying these one server at a time is fine for testing, but in production you need a scalable approach.

In this post, I will cover the different methods for deploying extensions to Arc servers at scale, from Azure Policy-driven deployments to CLI automation and ARM templates.

## Available Extensions for Arc Servers

Before diving into deployment methods, here is a quick overview of the most commonly used extensions for Arc-enabled servers:

- **Log Analytics Agent (MMA)** - Collects logs and performance data for Azure Monitor
- **Azure Monitor Agent (AMA)** - The newer replacement for MMA, supports Data Collection Rules
- **Dependency Agent** - Collects process and network dependency data for VM insights
- **Guest Configuration** - Enables in-guest policy auditing and enforcement
- **Custom Script Extension** - Runs scripts on the server for configuration or deployment tasks
- **Microsoft Defender for Endpoint** - Provides endpoint detection and response
- **Azure Key Vault extension** - Automatically rotates certificates from Key Vault
- **Qualys vulnerability scanner** - Integrated vulnerability assessment

You can list all available extensions using the CLI:

```bash
# List all available extension types for Arc servers
az connectedmachine extension list \
    --machine-name "my-arc-server" \
    --resource-group "arc-servers-rg" \
    --output table

# List available extension publishers and types
az connectedmachine extension image list \
    --location "eastus" \
    --output table
```

## Method 1: Azure Policy (Recommended for Scale)

Azure Policy is the best approach for ensuring extensions are deployed consistently across all your Arc servers. You define a policy that says "this extension should be installed," and Azure takes care of deploying it to any server that does not have it.

### Deploying the Azure Monitor Agent via Policy

```bash
# Assign the built-in policy to deploy Azure Monitor Agent to Linux Arc servers
az policy assignment create \
    --name "deploy-ama-linux-arc" \
    --display-name "Deploy Azure Monitor Agent to Linux Arc servers" \
    --policy "845857af-0333-4c5d-bbbc-6076697da122" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus" \
    --role "Azure Connected Machine Resource Administrator"

# For Windows Arc servers
az policy assignment create \
    --name "deploy-ama-windows-arc" \
    --display-name "Deploy Azure Monitor Agent to Windows Arc servers" \
    --policy "94f686d6-9a24-4e19-91f1-de9f6c23d2e3" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus" \
    --role "Azure Connected Machine Resource Administrator"
```

After assigning the policy, existing non-compliant servers need a remediation task to trigger the extension deployment:

```bash
# Create a remediation task for existing non-compliant servers
az policy remediation create \
    --name "remediate-ama-linux" \
    --policy-assignment "deploy-ama-linux-arc" \
    --subscription "your-subscription-id" \
    --resource-discovery-mode "ReEvaluateCompliance"
```

The beauty of the policy approach is that it is self-healing. If someone removes the extension, the policy will detect the non-compliance and redeploy it.

### Creating a Custom Policy for Extension Deployment

If there is no built-in policy for the extension you need, you can create a custom one:

```json
{
  "mode": "Indexed",
  "policyRule": {
    "if": {
      "allOf": [
        {
          // Target only Arc-enabled servers
          "field": "type",
          "equals": "Microsoft.HybridCompute/machines"
        },
        {
          // Target only Linux servers
          "field": "Microsoft.HybridCompute/machines/osName",
          "equals": "linux"
        }
      ]
    },
    "then": {
      "effect": "deployIfNotExists",
      "details": {
        "type": "Microsoft.HybridCompute/machines/extensions",
        "roleDefinitionIds": [
          "/providers/Microsoft.Authorization/roleDefinitions/cd570a14-e51a-42ad-bac8-bafd67325302"
        ],
        "existenceCondition": {
          "allOf": [
            {
              "field": "Microsoft.HybridCompute/machines/extensions/type",
              "equals": "CustomScript"
            },
            {
              "field": "Microsoft.HybridCompute/machines/extensions/publisher",
              "equals": "Microsoft.Azure.Extensions"
            }
          ]
        },
        "deployment": {
          "properties": {
            "mode": "incremental",
            "template": {
              "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
              "contentVersion": "1.0.0.0",
              "parameters": {
                "vmName": { "type": "string" },
                "location": { "type": "string" }
              },
              "resources": [
                {
                  // Deploy the custom script extension
                  "type": "Microsoft.HybridCompute/machines/extensions",
                  "apiVersion": "2022-03-10",
                  "name": "[concat(parameters('vmName'), '/CustomScript')]",
                  "location": "[parameters('location')]",
                  "properties": {
                    "publisher": "Microsoft.Azure.Extensions",
                    "type": "CustomScript",
                    "autoUpgradeMinorVersion": true,
                    "settings": {
                      "commandToExecute": "echo 'Extension deployed successfully'"
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

## Method 2: Azure CLI Batch Deployment

For one-time deployments or situations where you need more control over timing, you can script extension deployments using the Azure CLI.

```bash
#!/bin/bash
# Deploy the Azure Monitor Agent to all Arc servers in a resource group

RESOURCE_GROUP="arc-servers-rg"
EXTENSION_NAME="AzureMonitorLinuxAgent"
PUBLISHER="Microsoft.Azure.Monitor"
TYPE="AzureMonitorLinuxAgent"

# Get all Linux Arc servers in the resource group
SERVERS=$(az connectedmachine list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?osName=='linux'].name" \
    --output tsv)

# Deploy the extension to each server
for SERVER in $SERVERS; do
    echo "Deploying $EXTENSION_NAME to $SERVER..."

    # Run deployment in the background for parallelism
    az connectedmachine extension create \
        --machine-name "$SERVER" \
        --resource-group "$RESOURCE_GROUP" \
        --name "$EXTENSION_NAME" \
        --publisher "$PUBLISHER" \
        --type "$TYPE" \
        --location "eastus" \
        --no-wait &

    # Limit parallelism to 10 concurrent deployments
    if (( $(jobs -r | wc -l) >= 10 )); then
        wait -n
    fi
done

# Wait for all deployments to complete
wait
echo "All deployments submitted"
```

## Method 3: ARM Templates for Extension Deployment

ARM templates work well when you want to deploy a set of extensions as a single deployment:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "machineName": {
      "type": "string",
      "metadata": {
        "description": "The name of the Arc-enabled server"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    },
    "workspaceId": {
      "type": "string",
      "metadata": {
        "description": "Log Analytics workspace ID"
      }
    }
  },
  "resources": [
    {
      // Azure Monitor Agent extension
      "type": "Microsoft.HybridCompute/machines/extensions",
      "apiVersion": "2022-03-10",
      "name": "[concat(parameters('machineName'), '/AzureMonitorLinuxAgent')]",
      "location": "[parameters('location')]",
      "properties": {
        "publisher": "Microsoft.Azure.Monitor",
        "type": "AzureMonitorLinuxAgent",
        "autoUpgradeMinorVersion": true,
        "enableAutomaticUpgrade": true
      }
    },
    {
      // Dependency Agent extension for VM Insights
      "type": "Microsoft.HybridCompute/machines/extensions",
      "apiVersion": "2022-03-10",
      "name": "[concat(parameters('machineName'), '/DependencyAgentLinux')]",
      "location": "[parameters('location')]",
      "properties": {
        "publisher": "Microsoft.Azure.Monitoring.DependencyAgent",
        "type": "DependencyAgentLinux",
        "autoUpgradeMinorVersion": true
      },
      "dependsOn": [
        "[resourceId('Microsoft.HybridCompute/machines/extensions', parameters('machineName'), 'AzureMonitorLinuxAgent')]"
      ]
    }
  ]
}
```

Deploy this template for each server:

```bash
# Deploy the extension template to a specific Arc server
az deployment group create \
    --resource-group "arc-servers-rg" \
    --template-file "extensions-template.json" \
    --parameters machineName="my-arc-server" \
                 workspaceId="your-workspace-id"
```

## Method 4: PowerShell with Parallel Execution

For large-scale deployments with PowerShell, use the `ForEach-Object -Parallel` feature:

```powershell
# Get all Arc servers
$servers = Get-AzConnectedMachine -ResourceGroupName "arc-servers-rg"

# Deploy extensions in parallel (up to 10 at a time)
$servers | ForEach-Object -Parallel {
    $server = $_

    # Check if extension already exists
    $existing = Get-AzConnectedMachineExtension `
        -MachineName $server.Name `
        -ResourceGroupName $server.ResourceGroupName `
        -Name "AzureMonitorLinuxAgent" `
        -ErrorAction SilentlyContinue

    if (-not $existing) {
        Write-Output "Installing AMA on $($server.Name)..."
        New-AzConnectedMachineExtension `
            -MachineName $server.Name `
            -ResourceGroupName $server.ResourceGroupName `
            -Name "AzureMonitorLinuxAgent" `
            -Publisher "Microsoft.Azure.Monitor" `
            -ExtensionType "AzureMonitorLinuxAgent" `
            -Location $server.Location `
            -EnableAutomaticUpgrade
    } else {
        Write-Output "AMA already installed on $($server.Name)"
    }
} -ThrottleLimit 10
```

## Monitoring Extension Deployment Status

After deploying extensions at scale, you need to verify they installed successfully:

```bash
# Check extension status across all servers in a resource group
az connectedmachine extension list \
    --machine-name "my-arc-server" \
    --resource-group "arc-servers-rg" \
    --output table

# Get a summary of extension deployment status using Resource Graph
az graph query -q "
    resources
    | where type == 'microsoft.hybridcompute/machines/extensions'
    | extend machineName = tostring(split(id, '/')[8])
    | extend extensionType = properties.type
    | extend provisioningState = properties.provisioningState
    | summarize count() by tostring(extensionType), tostring(provisioningState)
"
```

## Handling Extension Failures

Extensions can fail for various reasons. Here is how to diagnose issues:

```bash
# Get detailed extension status including error messages
az connectedmachine extension show \
    --machine-name "problem-server" \
    --resource-group "arc-servers-rg" \
    --name "AzureMonitorLinuxAgent" \
    --output json
```

Common failure reasons include network connectivity issues (the extension needs to download packages from Azure), insufficient disk space, and conflicts with existing software. Check the extension logs on the server itself at `/var/lib/GuestConfig/ext_mgr_logs/` on Linux or `C:\ProgramData\GuestConfig\ext_mgr_logs\` on Windows.

## Best Practices

**Use Azure Policy for ongoing compliance.** One-time script deployments are useful, but Policy ensures extensions stay deployed even if someone removes them.

**Enable automatic minor version upgrades.** Set `autoUpgradeMinorVersion` to true so extensions stay current with bug fixes and security patches.

**Test extensions in a staging environment first.** Before deploying to hundreds of servers, test on a small group to catch any compatibility issues.

**Monitor extension health.** Set up alerts in Azure Monitor for extension provisioning failures so you can respond quickly.

**Use tags to group servers for phased rollouts.** Tag servers with deployment waves (Wave1, Wave2, etc.) and use policy conditions to target specific waves.

## Summary

Deploying extensions to Azure Arc-enabled servers at scale requires a systematic approach. Azure Policy provides the most robust solution with its self-healing capability, while CLI scripts and ARM templates offer more control for specific deployment scenarios. Regardless of the method you choose, make sure you monitor deployment status and have a process for handling failures.
