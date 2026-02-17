# How to Configure Azure Cloud Shell with Terraform and Bicep for Infrastructure Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cloud Shell, Terraform, Bicep, Infrastructure as Code, Azure, DevOps, Cloud Management

Description: Learn how to set up Azure Cloud Shell as a productive environment for managing Azure infrastructure with Terraform and Bicep tools.

---

Azure Cloud Shell is a browser-based terminal that comes pre-loaded with Azure management tools. You do not need to install anything on your local machine - just open a browser, navigate to shell.azure.com, and you have a fully configured shell with the Azure CLI, PowerShell, Terraform, and Bicep ready to go. It is backed by persistent storage, so your scripts and configuration files survive between sessions.

For infrastructure engineers who manage Azure resources with Terraform and Bicep, Cloud Shell provides a consistent environment that works from anywhere. In this post, I will walk through how to set up Cloud Shell for serious infrastructure work, including configuring Terraform backends, organizing Bicep projects, and building efficient workflows.

## Getting Started with Cloud Shell

When you first open Cloud Shell at shell.azure.com (or by clicking the terminal icon in the Azure portal), you choose between Bash and PowerShell. For infrastructure work, I recommend Bash - most Terraform and Bicep documentation uses Bash commands, and the tooling is well-tested on Linux.

Cloud Shell provisions a small Linux container for your session. It comes with:

- Azure CLI (az)
- Azure PowerShell (Az module)
- Terraform
- Bicep CLI (integrated with az)
- kubectl, helm, ansible
- git, vim, nano, code (Monaco editor)
- Python, Node.js

The first time you launch Cloud Shell, it creates an Azure Files share in a storage account. This share is mounted at `$HOME/clouddrive` and persists between sessions. Anything you store there survives even if your Cloud Shell session times out.

## Organizing Your Infrastructure Files

Create a logical directory structure in your persistent storage:

```bash
# Set up a project directory structure in the persistent clouddrive
mkdir -p ~/clouddrive/infrastructure/{terraform,bicep,scripts,state}

# Terraform projects organized by environment
mkdir -p ~/clouddrive/infrastructure/terraform/{modules,environments/{dev,staging,prod}}

# Bicep projects organized similarly
mkdir -p ~/clouddrive/infrastructure/bicep/{modules,environments/{dev,staging,prod}}
```

Your directory structure should look like this:

```
~/clouddrive/infrastructure/
    terraform/
        modules/
            networking/
            compute/
            storage/
        environments/
            dev/
            staging/
            prod/
    bicep/
        modules/
            networking.bicep
            compute.bicep
        environments/
            dev/
            staging/
            prod/
    scripts/
        deploy.sh
        teardown.sh
```

## Configuring Terraform in Cloud Shell

Cloud Shell comes with Terraform pre-installed, but you might want a specific version. You can install any version alongside the default one:

```bash
# Check the pre-installed Terraform version
terraform version

# Install a specific Terraform version if needed
TERRAFORM_VERSION="1.7.0"
curl -Lo terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
unzip terraform.zip -d ~/clouddrive/bin/
rm terraform.zip

# Add the custom binary directory to your PATH
# Add this line to your .bashrc so it persists between sessions
echo 'export PATH="$HOME/clouddrive/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify the version
terraform version
```

## Setting Up a Terraform Backend on Azure Storage

Terraform state files should never be stored locally. Use Azure Storage as a remote backend:

```bash
# Create a storage account for Terraform state
# This should be in a dedicated resource group separate from your application resources
az group create --name terraform-state-rg --location eastus

az storage account create \
  --name tfstateaccount$(date +%s | tail -c 6) \
  --resource-group terraform-state-rg \
  --sku Standard_LRS \
  --encryption-services blob

# Create a container for state files
az storage container create \
  --name tfstate \
  --account-name YOUR_STORAGE_ACCOUNT_NAME
```

Now configure your Terraform files to use this backend:

```hcl
# backend.tf - Configure Azure Storage as the Terraform state backend
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstateaccount123456"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}
```

The nice thing about Cloud Shell is that authentication happens automatically. Since you are already logged into Azure, Terraform uses your Azure CLI credentials to access the storage backend. No need to configure service principals or environment variables for interactive use.

## Writing Terraform Configurations in Cloud Shell

Cloud Shell includes a built-in code editor (Monaco, the same editor that powers VS Code). Open it with the `code` command:

```bash
# Open the editor for a specific file
code ~/clouddrive/infrastructure/terraform/environments/dev/main.tf
```

Here is a sample Terraform configuration for deploying a web application:

```hcl
# main.tf - Deploy a web application with App Service
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Variables for environment-specific configuration
variable "environment" {
  description = "The deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

# Resource group for the application
resource "azurerm_resource_group" "app" {
  name     = "app-${var.environment}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# App Service Plan
resource "azurerm_service_plan" "app" {
  name                = "plan-${var.environment}"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  os_type             = "Linux"
  sku_name            = var.environment == "prod" ? "P1v3" : "B1"
}

# Web App
resource "azurerm_linux_web_app" "app" {
  name                = "myapp-${var.environment}-${random_id.suffix.hex}"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  service_plan_id     = azurerm_service_plan.app.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Random suffix for globally unique names
resource "random_id" "suffix" {
  byte_length = 4
}

output "web_app_url" {
  value = "https://${azurerm_linux_web_app.app.default_hostname}"
}
```

Initialize and apply:

```bash
cd ~/clouddrive/infrastructure/terraform/environments/dev

# Initialize Terraform (downloads providers, configures backend)
terraform init

# Preview what will be created
terraform plan -out=dev.plan

# Apply the changes
terraform apply dev.plan
```

## Working with Bicep in Cloud Shell

Bicep is built into the Azure CLI, so it works seamlessly in Cloud Shell:

```bash
# Verify Bicep is available
az bicep version

# Upgrade to the latest Bicep version
az bicep upgrade

# Build a Bicep file to see the generated ARM template
az bicep build --file main.bicep
```

Create a Bicep file for the same web application:

```bicep
// main.bicep - Deploy a web application with App Service
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'
param location string = resourceGroup().location

// Use a conditional SKU based on environment
var appServiceSku = environment == 'prod' ? 'P1v3' : 'B1'
var suffix = uniqueString(resourceGroup().id)

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'plan-${environment}'
  location: location
  sku: {
    name: appServiceSku
  }
  kind: 'linux'
  properties: {
    reserved: true  // Required for Linux App Service Plans
  }
  tags: {
    Environment: environment
    ManagedBy: 'Bicep'
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'myapp-${environment}-${suffix}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
    }
    httpsOnly: true
  }
  tags: {
    Environment: environment
    ManagedBy: 'Bicep'
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
```

Deploy with the Azure CLI:

```bash
# Create a resource group
az group create --name app-dev-rg --location eastus

# Deploy the Bicep template
az deployment group create \
  --resource-group app-dev-rg \
  --template-file main.bicep \
  --parameters environment=dev

# Preview changes without deploying (what-if)
az deployment group what-if \
  --resource-group app-dev-rg \
  --template-file main.bicep \
  --parameters environment=dev
```

## Creating Helper Scripts

Automate common operations with scripts stored in your persistent storage:

```bash
#!/bin/bash
# ~/clouddrive/scripts/deploy.sh
# Helper script for deploying infrastructure with either Terraform or Bicep

set -euo pipefail

TOOL="${1:-}"
ENV="${2:-dev}"
ACTION="${3:-plan}"

if [ -z "$TOOL" ]; then
    echo "Usage: deploy.sh <terraform|bicep> <environment> <action>"
    echo "  terraform actions: init, plan, apply, destroy"
    echo "  bicep actions: what-if, deploy"
    exit 1
fi

case "$TOOL" in
    terraform)
        DIR="$HOME/clouddrive/infrastructure/terraform/environments/$ENV"
        cd "$DIR"

        case "$ACTION" in
            init)    terraform init ;;
            plan)    terraform plan -out="${ENV}.plan" ;;
            apply)   terraform apply "${ENV}.plan" ;;
            destroy) terraform destroy ;;
            *)       echo "Unknown action: $ACTION" ;;
        esac
        ;;

    bicep)
        DIR="$HOME/clouddrive/infrastructure/bicep/environments/$ENV"
        RG="app-${ENV}-rg"

        case "$ACTION" in
            what-if) az deployment group what-if --resource-group "$RG" --template-file "$DIR/main.bicep" --parameters environment="$ENV" ;;
            deploy)  az deployment group create --resource-group "$RG" --template-file "$DIR/main.bicep" --parameters environment="$ENV" ;;
            *)       echo "Unknown action: $ACTION" ;;
        esac
        ;;
esac
```

Make it executable and use it:

```bash
chmod +x ~/clouddrive/scripts/deploy.sh

# Deploy with Terraform
~/clouddrive/scripts/deploy.sh terraform dev plan
~/clouddrive/scripts/deploy.sh terraform dev apply

# Deploy with Bicep
~/clouddrive/scripts/deploy.sh bicep staging deploy
```

## Customizing Your Cloud Shell Environment

Since `~/.bashrc` persists between sessions, you can customize your environment:

```bash
# Add to ~/.bashrc for a more productive Cloud Shell experience

# Useful aliases for infrastructure work
alias tf='terraform'
alias tfi='terraform init'
alias tfp='terraform plan'
alias tfa='terraform apply'

# Quick navigation
alias infra='cd ~/clouddrive/infrastructure'

# Show current Azure subscription in the prompt
export PS1='\[\e[36m\][$(az account show --query name -o tsv 2>/dev/null)]\[\e[0m\] \w $ '
```

## Cloud Shell Limitations

Cloud Shell is great for ad-hoc operations and exploration, but it has some limitations to be aware of:

- Sessions time out after 20 minutes of inactivity
- You get a single session at a time (no multiple terminal windows unless you use tmux)
- Compute resources are shared and limited - not suitable for heavy workloads
- Only 5 GB of persistent storage by default
- Tools outside the pre-installed set need to be reinstalled after container recycles (unless stored in clouddrive)

For production infrastructure management, use Cloud Shell for exploration and quick fixes, but run your actual Terraform and Bicep deployments through Azure Pipelines for audit trails and consistency.

## Wrapping Up

Azure Cloud Shell gives you a pre-configured, browser-accessible environment for managing infrastructure with Terraform and Bicep. The persistent storage means your files, scripts, and customizations are always there when you need them. Use it for exploration, prototyping, and quick operational tasks. For production deployments, pair Cloud Shell with proper CI/CD pipelines that provide version control, approval gates, and audit trails. The combination of both gives you the flexibility to move fast when needed and the governance to stay safe when it matters.
