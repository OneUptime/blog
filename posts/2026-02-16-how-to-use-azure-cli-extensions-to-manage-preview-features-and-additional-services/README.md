# How to Use Azure CLI Extensions to Manage Preview Features and Additional Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure CLI, Extensions, Azure Preview Features, DevOps, Cloud Management, Automation

Description: Install and manage Azure CLI extensions to access preview features, additional services, and specialized commands not included in the core CLI.

---

The Azure CLI ships with a core set of commands that covers the most commonly used Azure services. But Azure has hundreds of services, and many of them - especially newer ones or those in preview - are not included in the core CLI. Instead, they are available as extensions that you install separately.

Extensions are a practical mechanism for keeping the CLI lightweight while still giving you access to everything Azure offers. If you have ever tried to run an `az` command and gotten a "command not found" error, chances are you needed an extension. This guide explains how to find, install, manage, and use Azure CLI extensions effectively.

## What Are CLI Extensions?

An Azure CLI extension is a Python package that adds new commands to the `az` CLI. When you install an extension, its commands become available just like built-in commands. You interact with them the same way, they use the same authentication context, and they follow the same output format conventions.

Extensions serve several purposes:

- **Preview features**: New services and features often ship as extensions first before being promoted to the core CLI
- **Specialized services**: Some services have their own extensions because they are complex enough to warrant separate development cycles
- **Experimental features**: Features that are still being designed and might change significantly
- **Community contributions**: Some extensions are contributed by teams outside the core CLI team

## Listing Available Extensions

To see all available extensions:

```bash
# List all available extensions with their versions and status
az extension list-available --output table
```

This returns a long list. To find specific extensions, filter the output:

```bash
# Search for extensions related to a specific service
az extension list-available --query "[?contains(name, 'aks')]" --output table

# Search for extensions with a keyword in the summary
az extension list-available --query "[?contains(summary, 'preview')]" --output table
```

## Installing Extensions

Installation is straightforward:

```bash
# Install a specific extension
az extension add --name azure-devops

# Install a specific version of an extension
az extension add --name azure-devops --version 0.26.0

# Install from a URL (useful for private or custom extensions)
az extension add --source https://example.com/my-extension-0.1.0-py3-none-any.whl
```

Some commonly used extensions:

```bash
# Azure DevOps - manage repos, pipelines, boards from CLI
az extension add --name azure-devops

# AKS Preview - access preview features for Azure Kubernetes Service
az extension add --name aks-preview

# Azure IoT - manage IoT Hub and IoT Edge devices
az extension add --name azure-iot

# SSH - connect to Azure VMs via SSH using AAD authentication
az extension add --name ssh

# Container Apps - manage Azure Container Apps
az extension add --name containerapp

# Azure Firewall - advanced firewall management commands
az extension add --name azure-firewall
```

## Managing Installed Extensions

### Listing Installed Extensions

```bash
# See what extensions are currently installed
az extension list --output table
```

This shows the extension name, version, whether it is in preview, and whether an update is available.

### Updating Extensions

```bash
# Update a specific extension to the latest version
az extension update --name azure-devops

# Update all installed extensions at once
az extension list --query "[].name" -o tsv | while read ext; do
    echo "Updating $ext..."
    az extension update --name "$ext" 2>/dev/null
done
```

### Removing Extensions

```bash
# Remove an extension you no longer need
az extension remove --name azure-devops
```

## Auto-Installation

Azure CLI can automatically install extensions when you try to use a command that requires one:

```bash
# Enable auto-install of extensions
az config set extension.use_dynamic_install=yes_without_prompt

# Or with a prompt asking for confirmation
az config set extension.use_dynamic_install=yes_prompt
```

With `yes_without_prompt`, if you run a command that requires an extension, Azure CLI will automatically install it and then execute your command. This is handy for scripts but can be surprising in interactive use.

## Practical Examples with Popular Extensions

### Azure DevOps Extension

This extension is essential if you manage Azure DevOps from the command line:

```bash
# Install and configure the Azure DevOps extension
az extension add --name azure-devops

# Set the default organization and project
az devops configure --defaults organization=https://dev.azure.com/myorg project=MyProject

# List recent pipeline runs
az pipelines runs list --top 10 --output table

# Trigger a pipeline run
az pipelines run --name "CI-Pipeline" --branch main

# Create a work item
az boards work-item create \
  --type "User Story" \
  --title "Implement user profile page" \
  --assigned-to "jane@contoso.com" \
  --description "As a user, I want to view and edit my profile"

# List pull requests
az repos pr list --status active --output table
```

### AKS Preview Extension

This gives you access to the latest AKS features before they are generally available:

```bash
# Install the AKS preview extension
az extension add --name aks-preview

# Register preview features (required for some preview features)
az feature register --namespace Microsoft.ContainerService --name EnableWorkloadIdentityPreview

# Use preview features when creating or updating a cluster
az aks create \
  --resource-group "rg-aks" \
  --name "aks-dev" \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --node-count 3
```

### SSH Extension

Connect to VMs using Azure AD authentication instead of SSH keys:

```bash
# Install the SSH extension
az extension add --name ssh

# SSH into a VM using your Azure AD identity
az ssh vm \
  --resource-group "rg-vms" \
  --name "vm-jumpbox"

# SSH using a specific config file
az ssh config --resource-group "rg-vms" --name "vm-jumpbox" --file ~/.ssh/config
```

## Using Extensions in CI/CD Pipelines

When your pipeline scripts use extension commands, you need to install the extensions as part of the pipeline:

```yaml
# Install extensions at the beginning of your pipeline
steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'my-service-connection'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Install required extensions
        az extension add --name azure-devops --yes
        az extension add --name aks-preview --yes

        # Now use extension commands
        az pipelines runs list --top 5 --output table
    displayName: 'Run CLI commands with extensions'
```

The `--yes` flag suppresses confirmation prompts, which is necessary in non-interactive pipeline environments.

### Caching Extensions for Faster Pipelines

If your pipeline installs extensions on every run, you can cache them:

```yaml
# Cache Azure CLI extensions between pipeline runs
variables:
  AZURE_EXTENSION_DIR: $(Pipeline.Workspace)/.azure-cli-extensions

steps:
  - task: Cache@2
    inputs:
      key: 'azure-cli-extensions | "$(Agent.OS)"'
      path: $(AZURE_EXTENSION_DIR)
    displayName: 'Cache CLI extensions'

  - task: AzureCLI@2
    inputs:
      azureSubscription: 'my-service-connection'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Set the extension directory
        export AZURE_EXTENSION_DIR=$(AZURE_EXTENSION_DIR)

        # Install only if not already cached
        az extension add --name azure-devops --yes 2>/dev/null || true
        az extension add --name aks-preview --yes 2>/dev/null || true

        # Run your commands
        az aks list --output table
    displayName: 'Use cached CLI extensions'
```

## Extension Compatibility and Troubleshooting

### Version Conflicts

Sometimes an extension requires a specific version of the Azure CLI core. If you see errors about incompatible versions:

```bash
# Check the CLI core version
az version --output table

# Check extension compatibility
az extension show --name aks-preview --query "[minCliCoreVersion, maxCliCoreVersion]"

# Upgrade the CLI if needed
az upgrade
```

### Extension Loading Errors

If an extension fails to load, try removing and reinstalling it:

```bash
# Remove the problematic extension
az extension remove --name aks-preview

# Clear the extension cache
rm -rf ~/.azure/cliextensions/aks-preview

# Reinstall
az extension add --name aks-preview
```

### Finding Help for Extension Commands

Extension commands support the same `--help` flag as core commands:

```bash
# Get help for an extension command group
az devops --help

# Get help for a specific command
az pipelines run --help
```

## Creating Custom Extensions

If you need custom CLI commands for your organization, you can build your own extension. This is beyond the scope of this article, but the basic process is:

1. Create a Python package following the Azure CLI extension template
2. Implement your commands using the Azure CLI SDK
3. Build the wheel file
4. Distribute it to your team via a URL or internal package repository

## Wrapping Up

Azure CLI extensions are the mechanism for accessing the full breadth of Azure services from the command line. The core CLI covers the basics, but extensions unlock preview features, specialized services, and advanced management capabilities. Get in the habit of running `az extension list` and `az extension update` periodically to keep your extensions current. And if you are building CI/CD pipelines that use extension commands, make sure to install them as an early step in the pipeline so they are available when your scripts need them.
