# How to Install Azure CLI on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Azure, CLI, Cloud, Microsoft, Tutorial

Description: Complete guide to installing and using Azure CLI on Ubuntu for cloud management.

---

Azure CLI (Command Line Interface) is Microsoft's cross-platform command-line tool for managing Azure resources. It provides a powerful way to automate tasks, manage infrastructure, and interact with Azure services directly from your terminal. This comprehensive guide covers installation, configuration, and practical usage of Azure CLI on Ubuntu.

## Prerequisites

Before installing Azure CLI, ensure you have:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- sudo privileges on your system
- Active internet connection
- An Azure account (free tier available)

## Installing Azure CLI

### Method 1: Using the Official Microsoft Repository (Recommended)

The recommended approach is to install Azure CLI from Microsoft's official repository, which ensures you receive updates automatically.

```bash
# Update the package index to ensure we have the latest package information
sudo apt-get update

# Install required packages for adding repositories securely
# ca-certificates: SSL certificates for secure connections
# curl: Tool for transferring data from URLs
# apt-transport-https: Allows apt to use HTTPS repositories
# lsb-release: Provides Linux Standard Base version information
# gnupg: GNU Privacy Guard for key management
sudo apt-get install -y ca-certificates curl apt-transport-https lsb-release gnupg

# Create a directory for storing repository keys
# The -m 0755 sets appropriate permissions
sudo mkdir -p /etc/apt/keyrings

# Download and add Microsoft's GPG signing key
# This key verifies package authenticity
curl -sLS https://packages.microsoft.com/keys/microsoft.asc | \
    gpg --dearmor | \
    sudo tee /etc/apt/keyrings/microsoft.gpg > /dev/null

# Set proper permissions on the key file
sudo chmod go+r /etc/apt/keyrings/microsoft.gpg

# Add the Azure CLI repository to your system's sources list
# $(lsb_release -cs) automatically detects your Ubuntu version
AZ_DIST=$(lsb_release -cs)
echo "Types: deb
URIs: https://packages.microsoft.com/repos/azure-cli/
Suites: ${AZ_DIST}
Components: main
Architectures: $(dpkg --print-architecture)
Signed-by: /etc/apt/keyrings/microsoft.gpg" | sudo tee /etc/apt/sources.list.d/azure-cli.sources

# Update package index with the new repository
sudo apt-get update

# Install Azure CLI
sudo apt-get install -y azure-cli
```

### Method 2: One-Line Installation Script

Microsoft provides a convenient installation script for quick setup:

```bash
# Download and execute the official installation script
# The script handles all dependencies and repository configuration
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Method 3: Using pip (Python Package Manager)

For users who prefer pip or need a specific version:

```bash
# Install pip if not already installed
sudo apt-get install -y python3-pip

# Install Azure CLI using pip
# --user flag installs for current user only (no sudo needed)
pip3 install azure-cli --user

# Add pip's bin directory to PATH (add to ~/.bashrc for persistence)
export PATH="$HOME/.local/bin:$PATH"
```

### Verify Installation

After installation, verify Azure CLI is working correctly:

```bash
# Check the installed version
az version

# Expected output shows version information for CLI and extensions
# {
#   "azure-cli": "2.x.x",
#   "azure-cli-core": "2.x.x",
#   "azure-cli-telemetry": "1.x.x",
#   "extensions": {}
# }

# Display help information
az --help
```

## Authentication (az login)

Before using Azure CLI, you must authenticate with your Azure account.

### Interactive Browser Login

The most common authentication method opens a browser for login:

```bash
# Initiate browser-based login
# A browser window opens for you to enter credentials
az login

# After successful login, you'll see a list of subscriptions:
# [
#   {
#     "cloudName": "AzureCloud",
#     "id": "subscription-id-here",
#     "isDefault": true,
#     "name": "My Subscription",
#     "state": "Enabled",
#     "tenantId": "tenant-id-here",
#     "user": {
#       "name": "user@example.com",
#       "type": "user"
#     }
#   }
# ]
```

### Device Code Login

For headless systems or remote terminals without browser access:

```bash
# Use device code authentication
# You'll receive a code to enter at https://microsoft.com/devicelogin
az login --use-device-code

# Output will show:
# To sign in, use a web browser to open https://microsoft.com/devicelogin
# and enter the code XXXXXXXXX to authenticate.
```

### Service Principal Login

For automated scripts and CI/CD pipelines:

```bash
# Login using a service principal with client secret
# Replace placeholders with actual values
az login --service-principal \
    --username "<app-id>" \
    --password "<client-secret>" \
    --tenant "<tenant-id>"

# Login using a service principal with certificate
az login --service-principal \
    --username "<app-id>" \
    --password "/path/to/certificate.pem" \
    --tenant "<tenant-id>"
```

### Managed Identity Login

For Azure VMs with managed identity enabled:

```bash
# Login using system-assigned managed identity
az login --identity

# Login using user-assigned managed identity
az login --identity --username "<client-id-of-user-assigned-identity>"
```

### Check Login Status

```bash
# Display currently logged-in account information
az account show

# List all accounts you're logged into
az account list --output table
```

## Subscription Management

Azure subscriptions contain your resources and billing information.

```bash
# List all subscriptions associated with your account
az account list --output table

# Example output:
# Name                  CloudName    SubscriptionId                        State    IsDefault
# --------------------  -----------  ------------------------------------  -------  -----------
# Production            AzureCloud   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  Enabled  True
# Development           AzureCloud   yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy  Enabled  False

# Get details of the current subscription
az account show --output json

# Set a different subscription as default
# Use subscription name or ID
az account set --subscription "Development"

# Or use subscription ID
az account set --subscription "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

# List available locations/regions
az account list-locations --output table

# Show subscription spending limit and quota
az account show --query "{Name:name, SpendingLimit:spendingLimit, State:state}"
```

## Resource Groups

Resource groups are logical containers for Azure resources.

```bash
# Create a new resource group
# --location specifies the Azure region
# --tags add metadata for organization
az group create \
    --name "myapp-production-rg" \
    --location "eastus" \
    --tags Environment=Production Project=MyApp Owner=DevOps

# List all resource groups in the current subscription
az group list --output table

# List resource groups with specific tag
az group list --tag Environment=Production --output table

# Show details of a specific resource group
az group show --name "myapp-production-rg"

# List all resources within a resource group
az resource list \
    --resource-group "myapp-production-rg" \
    --output table

# Update resource group tags
az group update \
    --name "myapp-production-rg" \
    --tags Environment=Production Project=MyApp Owner=DevOps CostCenter=IT

# Export resource group as ARM template
# Useful for infrastructure-as-code
az group export \
    --name "myapp-production-rg" \
    --output json > template.json

# Delete a resource group and ALL resources within it
# --yes skips confirmation prompt
# --no-wait returns immediately without waiting for completion
az group delete \
    --name "myapp-dev-rg" \
    --yes \
    --no-wait

# Check if a resource group exists
az group exists --name "myapp-production-rg"
# Returns: true or false

# Lock a resource group to prevent accidental deletion
az lock create \
    --name "PreventDelete" \
    --resource-group "myapp-production-rg" \
    --lock-type CanNotDelete \
    --notes "Critical production resources"
```

## Virtual Machines Management

Azure Virtual Machines provide scalable compute resources.

### Creating Virtual Machines

```bash
# Create a simple Ubuntu VM with default settings
# Azure automatically creates networking resources
az vm create \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --image "Ubuntu2404" \
    --admin-username "azureuser" \
    --generate-ssh-keys \
    --size "Standard_B2s" \
    --public-ip-sku Standard

# Output includes the public IP address:
# {
#   "publicIpAddress": "20.xx.xx.xx",
#   "fqdns": "",
#   "privateIpAddress": "10.0.0.4",
#   ...
# }

# Create a VM with specific configuration
az vm create \
    --resource-group "myapp-production-rg" \
    --name "database-01" \
    --image "Ubuntu2404" \
    --admin-username "azureuser" \
    --ssh-key-values ~/.ssh/id_rsa.pub \
    --size "Standard_D4s_v3" \
    --os-disk-size-gb 128 \
    --data-disk-sizes-gb 256 512 \
    --vnet-name "myapp-vnet" \
    --subnet "database-subnet" \
    --nsg "database-nsg" \
    --public-ip-address "" \
    --tags Role=Database Environment=Production \
    --zone 1

# Create a Windows VM
az vm create \
    --resource-group "myapp-production-rg" \
    --name "windows-server-01" \
    --image "Win2022Datacenter" \
    --admin-username "azureadmin" \
    --admin-password "SecureP@ssw0rd123!" \
    --size "Standard_D2s_v3"
```

### Managing Virtual Machines

```bash
# List all VMs in a resource group
az vm list \
    --resource-group "myapp-production-rg" \
    --output table \
    --show-details

# Get detailed information about a specific VM
az vm show \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --show-details

# Start a stopped VM
az vm start \
    --resource-group "myapp-production-rg" \
    --name "webserver-01"

# Stop (deallocate) a VM to stop billing for compute
az vm deallocate \
    --resource-group "myapp-production-rg" \
    --name "webserver-01"

# Restart a VM
az vm restart \
    --resource-group "myapp-production-rg" \
    --name "webserver-01"

# Resize a VM to a different size
az vm resize \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --size "Standard_D4s_v3"

# List available VM sizes in a region
az vm list-sizes --location "eastus" --output table

# List available VM sizes for resizing an existing VM
az vm list-vm-resize-options \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --output table
```

### VM Operations and Maintenance

```bash
# Run a command on a VM (Linux)
az vm run-command invoke \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --command-id RunShellScript \
    --scripts "apt-get update && apt-get upgrade -y"

# Run a command on a VM (Windows)
az vm run-command invoke \
    --resource-group "myapp-production-rg" \
    --name "windows-server-01" \
    --command-id RunPowerShellScript \
    --scripts "Get-Service | Where-Object {$_.Status -eq 'Running'}"

# Get the public IP of a VM
az vm list-ip-addresses \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --output table

# Open a port on a VM
az vm open-port \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --port 443 \
    --priority 1010

# Attach a new data disk to a VM
az vm disk attach \
    --resource-group "myapp-production-rg" \
    --vm-name "webserver-01" \
    --name "webserver-01-data-disk" \
    --size-gb 256 \
    --sku Premium_LRS \
    --new

# Create a snapshot of a VM disk
az snapshot create \
    --resource-group "myapp-production-rg" \
    --name "webserver-01-snapshot-$(date +%Y%m%d)" \
    --source "/subscriptions/.../disks/webserver-01_OsDisk"

# Delete a VM (keeps disks by default)
az vm delete \
    --resource-group "myapp-production-rg" \
    --name "webserver-01" \
    --yes
```

## Azure Kubernetes Service (AKS)

AKS provides managed Kubernetes clusters in Azure.

### Creating and Managing AKS Clusters

```bash
# Create an AKS cluster with default settings
az aks create \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --node-count 3 \
    --node-vm-size "Standard_D4s_v3" \
    --generate-ssh-keys \
    --enable-managed-identity

# Create an AKS cluster with advanced configuration
az aks create \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --node-count 3 \
    --node-vm-size "Standard_D4s_v3" \
    --kubernetes-version "1.29.0" \
    --network-plugin azure \
    --network-policy azure \
    --enable-managed-identity \
    --enable-cluster-autoscaler \
    --min-count 2 \
    --max-count 10 \
    --zones 1 2 3 \
    --enable-addons monitoring \
    --tags Environment=Production Project=MyApp

# Get credentials to access the cluster with kubectl
az aks get-credentials \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --overwrite-existing

# Verify cluster connection
kubectl get nodes

# List all AKS clusters in a resource group
az aks list \
    --resource-group "myapp-production-rg" \
    --output table

# Show detailed information about a cluster
az aks show \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster"
```

### Managing Node Pools

```bash
# Add a new node pool for specific workloads
az aks nodepool add \
    --resource-group "myapp-production-rg" \
    --cluster-name "myapp-aks-cluster" \
    --name "gpunodepool" \
    --node-count 2 \
    --node-vm-size "Standard_NC6" \
    --labels workload=gpu \
    --node-taints "sku=gpu:NoSchedule"

# Scale a node pool
az aks nodepool scale \
    --resource-group "myapp-production-rg" \
    --cluster-name "myapp-aks-cluster" \
    --name "nodepool1" \
    --node-count 5

# Update node pool configuration
az aks nodepool update \
    --resource-group "myapp-production-rg" \
    --cluster-name "myapp-aks-cluster" \
    --name "nodepool1" \
    --enable-cluster-autoscaler \
    --min-count 2 \
    --max-count 8

# List node pools in a cluster
az aks nodepool list \
    --resource-group "myapp-production-rg" \
    --cluster-name "myapp-aks-cluster" \
    --output table

# Delete a node pool
az aks nodepool delete \
    --resource-group "myapp-production-rg" \
    --cluster-name "myapp-aks-cluster" \
    --name "gpunodepool" \
    --yes
```

### AKS Operations

```bash
# Upgrade Kubernetes version
# First, check available versions
az aks get-upgrades \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --output table

# Perform the upgrade
az aks upgrade \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --kubernetes-version "1.30.0" \
    --yes

# Enable/disable addons
az aks enable-addons \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --addons azure-keyvault-secrets-provider

# Start a stopped AKS cluster
az aks start \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster"

# Stop an AKS cluster (saves costs)
az aks stop \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster"

# Get the kubeconfig for admin access
az aks get-credentials \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --admin

# Delete an AKS cluster
az aks delete \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --yes \
    --no-wait
```

## Storage Account Operations

Azure Storage provides scalable cloud storage services.

### Creating Storage Accounts

```bash
# Create a general-purpose v2 storage account
az storage account create \
    --resource-group "myapp-production-rg" \
    --name "myappprodstorageacct" \
    --location "eastus" \
    --sku "Standard_LRS" \
    --kind "StorageV2" \
    --access-tier "Hot" \
    --https-only true \
    --min-tls-version "TLS1_2" \
    --tags Environment=Production Project=MyApp

# Create a storage account with advanced security
az storage account create \
    --resource-group "myapp-production-rg" \
    --name "myappsecurestorage" \
    --location "eastus" \
    --sku "Standard_GRS" \
    --kind "StorageV2" \
    --https-only true \
    --min-tls-version "TLS1_2" \
    --allow-blob-public-access false \
    --default-action Deny

# List storage accounts
az storage account list \
    --resource-group "myapp-production-rg" \
    --output table

# Get storage account connection string
az storage account show-connection-string \
    --resource-group "myapp-production-rg" \
    --name "myappprodstorageacct" \
    --output tsv

# Get storage account keys
az storage account keys list \
    --resource-group "myapp-production-rg" \
    --account-name "myappprodstorageacct" \
    --output table
```

### Working with Blob Storage

```bash
# Set the storage account for subsequent commands
export AZURE_STORAGE_ACCOUNT="myappprodstorageacct"
export AZURE_STORAGE_KEY=$(az storage account keys list \
    --resource-group "myapp-production-rg" \
    --account-name "myappprodstorageacct" \
    --query '[0].value' \
    --output tsv)

# Create a blob container
az storage container create \
    --name "application-data" \
    --public-access off

# List containers in a storage account
az storage container list \
    --account-name "myappprodstorageacct" \
    --output table

# Upload a file to blob storage
az storage blob upload \
    --container-name "application-data" \
    --name "config/app-config.json" \
    --file "./app-config.json" \
    --overwrite

# Upload a directory recursively
az storage blob upload-batch \
    --destination "application-data" \
    --source "./local-folder" \
    --pattern "*.log" \
    --overwrite

# List blobs in a container
az storage blob list \
    --container-name "application-data" \
    --output table

# Download a blob
az storage blob download \
    --container-name "application-data" \
    --name "config/app-config.json" \
    --file "./downloaded-config.json"

# Generate a SAS token for a blob (valid for 1 hour)
az storage blob generate-sas \
    --container-name "application-data" \
    --name "config/app-config.json" \
    --permissions r \
    --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
    --https-only \
    --output tsv

# Delete a blob
az storage blob delete \
    --container-name "application-data" \
    --name "config/old-config.json"

# Set blob tier (for cost optimization)
az storage blob set-tier \
    --container-name "application-data" \
    --name "archives/old-logs.zip" \
    --tier Archive
```

### Working with File Shares

```bash
# Create a file share
az storage share create \
    --name "application-files" \
    --quota 100 \
    --account-name "myappprodstorageacct"

# Upload a file to the share
az storage file upload \
    --share-name "application-files" \
    --source "./local-file.txt" \
    --path "uploads/local-file.txt"

# List files in a share
az storage file list \
    --share-name "application-files" \
    --output table

# Download a file from the share
az storage file download \
    --share-name "application-files" \
    --path "uploads/local-file.txt" \
    --dest "./downloaded-file.txt"

# Create a directory in the share
az storage directory create \
    --share-name "application-files" \
    --name "backups"
```

## Azure Active Directory

Azure AD (now Microsoft Entra ID) manages identities and access.

### Managing Users

```bash
# List all users in the directory
az ad user list --output table

# Get details of a specific user
az ad user show --id "user@example.com"

# Create a new user
az ad user create \
    --display-name "John Doe" \
    --user-principal-name "johndoe@yourdomain.onmicrosoft.com" \
    --password "TempP@ssw0rd123!" \
    --force-change-password-next-sign-in true

# Update user properties
az ad user update \
    --id "johndoe@yourdomain.onmicrosoft.com" \
    --job-title "Senior Developer" \
    --department "Engineering"

# Delete a user
az ad user delete --id "johndoe@yourdomain.onmicrosoft.com"

# List user's group memberships
az ad user get-member-groups \
    --id "user@example.com" \
    --output table
```

### Managing Groups

```bash
# List all groups
az ad group list --output table

# Create a security group
az ad group create \
    --display-name "DevOps Team" \
    --mail-nickname "devops-team" \
    --description "DevOps team members"

# Add a member to a group
az ad group member add \
    --group "DevOps Team" \
    --member-id "<user-object-id>"

# List group members
az ad group member list \
    --group "DevOps Team" \
    --output table

# Check if a user is a member of a group
az ad group member check \
    --group "DevOps Team" \
    --member-id "<user-object-id>"

# Remove a member from a group
az ad group member remove \
    --group "DevOps Team" \
    --member-id "<user-object-id>"

# Delete a group
az ad group delete --group "DevOps Team"
```

### Managing Applications

```bash
# List all registered applications
az ad app list --output table

# Create a new application registration
az ad app create \
    --display-name "My Application" \
    --sign-in-audience "AzureADMyOrg"

# Get application details
az ad app show --id "<app-id>"

# Add a redirect URI
az ad app update \
    --id "<app-id>" \
    --web-redirect-uris "https://myapp.example.com/auth/callback"

# Create a client secret for an application
az ad app credential reset \
    --id "<app-id>" \
    --display-name "Production Secret" \
    --years 2

# Delete an application
az ad app delete --id "<app-id>"
```

## Service Principals

Service principals are identities for applications and automated tools.

### Creating Service Principals

```bash
# Create a service principal with Contributor role on subscription
az ad sp create-for-rbac \
    --name "myapp-cicd-sp" \
    --role Contributor \
    --scopes /subscriptions/<subscription-id>

# Output contains credentials - store securely!
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "myapp-cicd-sp",
#   "password": "generated-password-here",
#   "tenant": "tenant-id-here"
# }

# Create SP with specific role on a resource group
az ad sp create-for-rbac \
    --name "myapp-storage-sp" \
    --role "Storage Blob Data Contributor" \
    --scopes /subscriptions/<sub-id>/resourceGroups/myapp-production-rg

# Create SP with certificate authentication
az ad sp create-for-rbac \
    --name "myapp-secure-sp" \
    --role Reader \
    --scopes /subscriptions/<subscription-id> \
    --cert @/path/to/certificate.pem

# Create SP and generate a self-signed certificate
az ad sp create-for-rbac \
    --name "myapp-cert-sp" \
    --create-cert \
    --cert "myapp-cert" \
    --keyvault "myapp-keyvault"
```

### Managing Service Principals

```bash
# List all service principals
az ad sp list --all --output table

# List service principals you own
az ad sp list --show-mine --output table

# Get details of a service principal
az ad sp show --id "<app-id-or-object-id>"

# Reset service principal credentials
az ad sp credential reset \
    --id "<app-id>" \
    --display-name "New Credential" \
    --years 1

# List credentials for a service principal
az ad sp credential list --id "<app-id>" --output table

# Delete a specific credential
az ad sp credential delete \
    --id "<app-id>" \
    --key-id "<credential-key-id>"

# Delete a service principal
az ad sp delete --id "<app-id>"
```

### Role Assignments

```bash
# Assign a role to a service principal
az role assignment create \
    --assignee "<app-id>" \
    --role "Reader" \
    --scope /subscriptions/<subscription-id>/resourceGroups/myapp-production-rg

# List role assignments for a service principal
az role assignment list \
    --assignee "<app-id>" \
    --output table

# List all role assignments in a resource group
az role assignment list \
    --resource-group "myapp-production-rg" \
    --output table

# Remove a role assignment
az role assignment delete \
    --assignee "<app-id>" \
    --role "Reader" \
    --scope /subscriptions/<subscription-id>/resourceGroups/myapp-production-rg

# List available role definitions
az role definition list --output table

# Get details of a specific role
az role definition list --name "Contributor" --output json
```

## Output Formats and Queries

Azure CLI supports multiple output formats and powerful JMESPath queries.

### Output Formats

```bash
# JSON format (default) - best for scripting
az vm list --output json

# Table format - best for human readability
az vm list --output table

# TSV format - best for parsing in shell scripts
az vm list --query "[].{Name:name, RG:resourceGroup}" --output tsv

# YAML format - best for configuration files
az vm list --output yaml

# JSONC format - JSON with comments support
az vm list --output jsonc

# None format - suppress output
az group create --name "test-rg" --location "eastus" --output none

# Set default output format in configuration
az config set core.output=table
```

### JMESPath Queries

```bash
# Select specific properties
az vm list --query "[].{Name:name, Size:hardwareProfile.vmSize}"

# Filter results
az vm list --query "[?location=='eastus']"

# Filter and select
az vm list --query "[?powerState=='VM running'].{Name:name, IP:publicIps}"

# Get first result
az vm list --query "[0]"

# Get last result
az vm list --query "[-1]"

# Count results
az vm list --query "length(@)"

# Sort results
az vm list --query "sort_by(@, &name)"

# Check if value exists
az vm list --query "[?tags.Environment=='Production']"

# String operations
az vm list --query "[?starts_with(name, 'web')]"
az vm list --query "[?contains(name, 'server')]"

# Multiple conditions (AND)
az vm list --query "[?location=='eastus' && powerState=='VM running']"

# Multiple conditions (OR)
az vm list --query "[?location=='eastus' || location=='westus']"

# Nested queries
az aks show \
    --resource-group "myapp-production-rg" \
    --name "myapp-aks-cluster" \
    --query "agentPoolProfiles[].{Name:name, Count:count, VMSize:vmSize}"

# Complex example: Get running VMs with their IPs
az vm list --show-details \
    --query "[?powerState=='VM running'].{
        Name:name,
        ResourceGroup:resourceGroup,
        PublicIP:publicIps,
        PrivateIP:privateIps,
        Size:hardwareProfile.vmSize
    }" \
    --output table
```

## Extensions

Azure CLI extensions add functionality for specific services.

### Managing Extensions

```bash
# List available extensions
az extension list-available --output table

# Search for extensions
az extension list-available --query "[?contains(name, 'aks')]" --output table

# Install an extension
az extension add --name "aks-preview"

# Install a specific version
az extension add --name "azure-devops" --version "0.26.0"

# List installed extensions
az extension list --output table

# Update an extension
az extension update --name "aks-preview"

# Update all extensions
az extension list --query "[].name" --output tsv | xargs -I {} az extension update --name {}

# Remove an extension
az extension remove --name "aks-preview"

# Show extension details
az extension show --name "azure-devops"
```

### Popular Extensions

```bash
# Azure DevOps extension for pipelines and repos
az extension add --name "azure-devops"
az devops configure --defaults organization=https://dev.azure.com/myorg project=MyProject
az pipelines list --output table

# AKS Preview for latest Kubernetes features
az extension add --name "aks-preview"

# Azure IoT extension
az extension add --name "azure-iot"
az iot hub list --output table

# Azure Machine Learning extension
az extension add --name "ml"
az ml workspace list --output table

# Interactive mode extension
az extension add --name "interactive"
az interactive  # Launches interactive shell

# SSH extension for VM access
az extension add --name "ssh"
az ssh vm --resource-group "myapp-production-rg" --name "webserver-01"

# Resource Graph extension for cross-subscription queries
az extension add --name "resource-graph"
az graph query -q "Resources | where type == 'microsoft.compute/virtualmachines' | limit 10"
```

## Troubleshooting

Common issues and their solutions.

### Authentication Issues

```bash
# Clear cached credentials and re-login
az logout
az account clear
az login

# Check current login status
az account show

# Verify token is valid
az account get-access-token

# Login with specific tenant
az login --tenant "<tenant-id>"

# Debug authentication issues
az login --debug 2>&1 | tee login-debug.log
```

### Certificate and SSL Issues

```bash
# If you encounter SSL certificate errors
# Option 1: Update CA certificates
sudo apt-get update && sudo apt-get install -y ca-certificates

# Option 2: Specify CA bundle path
export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

# Option 3: Disable SSL verification (NOT recommended for production)
az config set core.disable_confirm_prompt=true
export AZURE_CLI_DISABLE_CONNECTION_VERIFICATION=1
```

### Performance Issues

```bash
# Enable command execution time display
az config set core.only_show_errors=false

# Increase timeout for slow operations
az config set core.timeout=300

# Use --no-wait for long-running operations
az vm create --name "myvm" --no-wait ...
az vm wait --name "myvm" --resource-group "myrg" --created

# Check operation status
az vm show --name "myvm" --resource-group "myrg" --query "provisioningState"
```

### Common Errors and Solutions

```bash
# Error: "The subscription is not registered to use namespace 'Microsoft.xxx'"
# Solution: Register the resource provider
az provider register --namespace "Microsoft.ContainerService"
az provider show --namespace "Microsoft.ContainerService" --query "registrationState"

# Error: "Quota exceeded"
# Solution: Request quota increase or use different region/VM size
az vm list-usage --location "eastus" --output table

# Error: "Resource already exists"
# Solution: Check existing resources or use different name
az resource list --name "resourcename" --output table

# Error: "AuthorizationFailed"
# Solution: Check role assignments
az role assignment list --assignee "<your-user-or-sp-id>" --output table

# Error: Command not found after installation
# Solution: Refresh shell or add to PATH
source ~/.bashrc
# Or for zsh
source ~/.zshrc

# View detailed error information
az vm create --name "test" --debug 2>&1 | tee error-log.txt
```

### Logging and Debugging

```bash
# Enable debug logging
az config set core.collect_telemetry=true
az config set logging.enable_log_file=true

# View CLI configuration
az config get

# Reset CLI configuration to defaults
az config unset defaults.location
az config unset defaults.group

# Find log file location
az config get logging.log_dir

# Run command with verbose output
az vm list --verbose

# Run command with debug output
az vm list --debug

# Check Azure service status
az rest --method GET --url "https://status.azure.com/api/status"
```

### Reinstalling Azure CLI

```bash
# Complete removal and reinstall
sudo apt-get remove -y azure-cli
sudo rm -rf ~/.azure
sudo apt-get autoremove -y

# Remove repository
sudo rm /etc/apt/sources.list.d/azure-cli.sources

# Reinstall using one-liner
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az version
```

## Best Practices

```bash
# 1. Always use resource groups for organization
az group create --name "project-env-rg" --location "eastus" --tags Project=Name Environment=Prod

# 2. Use tags consistently for cost tracking and management
az resource tag --tags CostCenter=IT Department=Engineering Owner=team@example.com \
    --ids "/subscriptions/.../resourceGroups/myrg/providers/Microsoft.Compute/virtualMachines/myvm"

# 3. Store sensitive values in Key Vault, not in scripts
az keyvault secret set --vault-name "myvault" --name "db-password" --value "secret"
DB_PASSWORD=$(az keyvault secret show --vault-name "myvault" --name "db-password" --query "value" -o tsv)

# 4. Use managed identities instead of service principal secrets when possible
az vm identity assign --resource-group "myrg" --name "myvm"

# 5. Set default values to reduce repetitive typing
az config set defaults.location=eastus defaults.group=myapp-production-rg

# 6. Use --no-wait for long operations in scripts
az vm create --name "myvm" --no-wait ...
# Do other work
az vm wait --name "myvm" --resource-group "myrg" --created

# 7. Export and version control ARM templates
az group export --name "myrg" > infrastructure.json

# 8. Use query to extract specific values for scripting
VM_IP=$(az vm list-ip-addresses --name "myvm" --resource-group "myrg" --query "[0].virtualMachine.network.publicIpAddresses[0].ipAddress" -o tsv)
```

## Conclusion

Azure CLI is an essential tool for managing Azure resources efficiently from the command line. This guide covered the most common operations, but Azure CLI offers many more capabilities. Use `az --help` or `az <command> --help` to explore additional options and commands.

For comprehensive documentation, visit the [official Azure CLI documentation](https://docs.microsoft.com/en-us/cli/azure/).

## Monitor Your Azure Infrastructure with OneUptime

While Azure CLI helps you manage your cloud resources, monitoring their health and performance is equally critical. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Azure infrastructure, including:

- **Uptime Monitoring**: Track the availability of your Azure VMs, AKS clusters, App Services, and other resources with real-time alerts
- **Performance Metrics**: Monitor CPU, memory, disk, and network performance across your Azure environment
- **Incident Management**: Automatically create incidents when issues are detected and manage the entire incident lifecycle
- **Status Pages**: Keep your users informed about service status with customizable public or private status pages
- **On-Call Scheduling**: Ensure the right team members are notified when Azure resources experience issues
- **Log Management**: Centralize and analyze logs from all your Azure services in one place

With OneUptime, you can ensure your Azure infrastructure remains healthy, performant, and reliable. Start monitoring your Azure resources today at [https://oneuptime.com](https://oneuptime.com).
