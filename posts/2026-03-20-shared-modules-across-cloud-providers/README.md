# How to Share OpenTofu Modules Across Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Multi-Cloud, Module, Infrastructure as Code, Best Practice

Description: Learn how to design and share OpenTofu modules that work across multiple cloud providers by using abstractions, interfaces, and provider-agnostic patterns.

## Introduction

When managing infrastructure across AWS, Azure, and GCP, duplicating configurations for every provider is inefficient. Shared modules let you define common infrastructure patterns once and instantiate them per provider with cloud-specific implementations.

## Module Design Principles

Effective shared modules follow these principles:

1. **Abstract the interface** - accept generic inputs, not provider-specific ones
2. **Encapsulate provider logic** - keep cloud-specific code inside the module
3. **Use consistent naming** - inputs and outputs should be identically named across providers
4. **Version independently** - each module should have its own version

## Project Structure

```text
modules/
├── networking/
│   ├── aws/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── azure/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── README.md
└── compute/
    ├── aws/
    └── azure/
```

## Shared Variables Interface

Define the same variable names across provider-specific modules:

```hcl
# modules/networking/aws/variables.tf

variable "name"       { type = string }
variable "cidr_block" { type = string }
variable "region"     { type = string }

# modules/networking/azure/variables.tf
variable "name"       { type = string }
variable "cidr_block" { type = string }
variable "region"     { type = string }
```

## Consistent Output Interface

```hcl
# modules/networking/aws/outputs.tf
output "network_id"   { value = aws_vpc.this.id }
output "network_name" { value = aws_vpc.this.tags["Name"] }

# modules/networking/azure/outputs.tf
output "network_id"   { value = azurerm_virtual_network.this.id }
output "network_name" { value = azurerm_virtual_network.this.name }
```

## Calling Modules in Root Configuration

```hcl
module "network_aws" {
  source     = "./modules/networking/aws"
  name       = "prod-network"
  cidr_block = "10.0.0.0/16"
  region     = "us-east-1"
}

module "network_azure" {
  source     = "./modules/networking/azure"
  name       = "prod-network"
  cidr_block = "10.1.0.0/16"
  region     = "East US"
}
```

## Publishing Modules to a Registry

After publishing modules to the OpenTofu Registry or a private registry, reference them with a registry source address:

```hcl
module "network_aws" {
  source  = "registry.example.com/myorg/networking-aws/aws"
  version = "~> 1.2"

  name       = "prod-network"
  cidr_block = "10.0.0.0/16"
  region     = "us-east-1"
}
```

## Conclusion

Sharing modules across cloud providers in OpenTofu requires thoughtful interface design - consistent variable names, output shapes, and encapsulated provider logic. This approach lets teams reuse patterns and reduces the cost of maintaining multi-cloud infrastructure.
