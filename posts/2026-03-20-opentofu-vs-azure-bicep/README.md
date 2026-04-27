# OpenTofu vs Azure Bicep: Choosing for Azure Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure Bicep, Azure, Comparison, Infrastructure as Code, DevOps

Description: Compare OpenTofu and Azure Bicep for managing Azure infrastructure - their syntax, multi-cloud support, and Azure-native integration - to choose the right tool for your Azure deployments.

## Introduction

For Azure infrastructure, both OpenTofu and Azure Bicep are solid choices. Bicep is Microsoft's Azure-native DSL that compiles to ARM templates. OpenTofu uses the AzureRM provider and supports multi-cloud. The choice depends on whether you need Azure-only or multi-cloud management.

## Syntax Comparison

OpenTofu (HCL):

```hcl
# OpenTofu: Deploy Azure resources

resource "azurerm_resource_group" "main" {
  name     = "prod-rg"
  location = "East US"
  tags     = { Environment = "production" }
}

resource "azurerm_virtual_network" "main" {
  name                = "prod-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

Azure Bicep:

```bicep
// Bicep: Deploy Azure resources (deployed into an existing resource group)
param location string = resourceGroup().location

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: 'prod-vnet'
  location: location
  tags: {
    Environment: 'production'
  }
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'app-subnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
        }
      }
    ]
  }
}
```

## Comparison Matrix

| Feature | OpenTofu | Azure Bicep |
|---------|----------|-------------|
| Multi-cloud | Yes | No (Azure only) |
| Language | HCL | Bicep DSL |
| Output | Direct API calls | ARM templates |
| State management | .tfstate files | Managed by Azure |
| Module system | Terraform Registry | Bicep Registry |
| Policy as code | OPA, Checkov | Azure Policy |
| IDE support | VS Code HCL extension | Bicep VS Code extension |
| Rollback | Manual | ARM deployment history |
| What-if | `tofu plan` | `az deployment group what-if` |
| License | MPL 2.0 | MIT (open source) |

## Azure Bicep Advantages

**Native ARM resource coverage** - Every Azure resource available the day it launches, because Bicep compiles directly to ARM.

**What-if analysis** - Similar to `tofu plan`, but integrated with Azure deployment history:

```bash
# Bicep: Preview changes before deploying
az deployment group what-if \
  --resource-group prod-rg \
  --template-file main.bicep \
  --parameters environment=production
```

**No state file management** - Azure manages deployment state. No S3 bucket or storage account needed for state.

**Azure Policy integration** - Policy-as-code is native to the Azure platform, separate from deployment tooling.

## OpenTofu Advantages

**Multi-cloud** - Manage Azure, AWS, GCP, and other resources together.

```hcl
# OpenTofu: Azure + AWS in one config
provider "azurerm" { features {} }
provider "aws"     { region = "us-east-1" }

resource "azurerm_resource_group" "main" { /* ... */ }
resource "aws_s3_bucket" "backup" { /* ... */ }
```

**Rich module ecosystem** - The `Azure` organization on the Terraform Registry provides battle-tested modules:

```hcl
module "aks" {
  source  = "Azure/aks/azurerm"
  version = "~> 7.0"

  resource_group_name = azurerm_resource_group.main.name
  prefix              = "prod"
  # ...
}
```

**Unified tooling** - Same CI/CD workflows, security scanning (Checkov), and linting (tflint) work across all clouds.

## Using Both: Azure Landing Zones

Microsoft's Azure Landing Zones Accelerator supports both:

```bash
# Azure Landing Zones with OpenTofu
git clone https://github.com/Azure/terraform-azurerm-caf-enterprise-scale
cd terraform-azurerm-caf-enterprise-scale

# Or with Bicep
az deployment mg create \
  --template-file es/main.bicep \
  --management-group-id my-org
```

## Conclusion

Azure Bicep is the better choice for Azure-only environments that want native ARM integration, no state file management, and tight Azure Policy integration. OpenTofu is the better choice for multi-cloud environments, teams already using Terraform/OpenTofu for other clouds, and organizations that want unified tooling across their infrastructure portfolio. Both support the same Azure resources - the choice is primarily about cloud scope and tooling consistency.
