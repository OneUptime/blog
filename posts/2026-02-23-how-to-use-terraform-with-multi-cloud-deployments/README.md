# How to Use Terraform with Multi-Cloud Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Cloud, AWS, Azure, GCP, DevOps

Description: Learn how to use Terraform for multi-cloud deployments across AWS, Azure, and GCP, including provider configuration, abstraction strategies, state management, and cross-cloud networking.

---

Multi-cloud deployments use infrastructure across multiple cloud providers to improve resilience, avoid vendor lock-in, or leverage the best services from each provider. Terraform is uniquely suited for multi-cloud because it supports all major cloud providers through a single tool with a consistent workflow.

In this guide, we will cover how to architect and implement multi-cloud infrastructure with Terraform.

## Configuring Multiple Providers

Start by setting up providers for each cloud:

```hcl
# providers.tf
# Multi-cloud provider configuration

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.common_tags
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}
```

## Creating Abstraction Layers

Abstract cloud-specific details behind common interfaces:

```hcl
# modules/multi-cloud/compute/main.tf
# Abstracted compute module that works across clouds

variable "cloud_provider" {
  description = "Which cloud to deploy to"
  type        = string
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "Cloud provider must be aws, azure, or gcp."
  }
}

variable "instance_size" {
  description = "Normalized instance size"
  type        = string
  validation {
    condition     = contains(["small", "medium", "large"], var.instance_size)
    error_message = "Instance size must be small, medium, or large."
  }
}

locals {
  # Map normalized sizes to cloud-specific instance types
  instance_type_map = {
    aws = {
      small  = "t3.small"
      medium = "t3.medium"
      large  = "t3.large"
    }
    azure = {
      small  = "Standard_B1ms"
      medium = "Standard_B2s"
      large  = "Standard_B4ms"
    }
    gcp = {
      small  = "e2-small"
      medium = "e2-medium"
      large  = "e2-standard-4"
    }
  }
}

# AWS compute
resource "aws_instance" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  ami           = data.aws_ami.latest.id
  instance_type = local.instance_type_map["aws"][var.instance_size]
  subnet_id     = var.subnet_id

  tags = merge(var.tags, { Name = var.name })
}

# Azure compute
resource "azurerm_linux_virtual_machine" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = local.instance_type_map["azure"][var.instance_size]
  admin_username      = "adminuser"

  network_interface_ids = [azurerm_network_interface.main[0].id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

# GCP compute
resource "google_compute_instance" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name         = var.name
  machine_type = local.instance_type_map["gcp"][var.instance_size]
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
    }
  }

  network_interface {
    subnetwork = var.subnetwork
  }
}

# Unified output regardless of cloud
output "instance_id" {
  value = coalesce(
    try(aws_instance.main[0].id, null),
    try(azurerm_linux_virtual_machine.main[0].id, null),
    try(google_compute_instance.main[0].id, null)
  )
}
```

## Cross-Cloud Networking

Connect networks across cloud providers:

```hcl
# networking/cross-cloud-vpn.tf
# VPN connections between AWS and Azure

# AWS side
resource "aws_vpn_gateway" "main" {
  vpc_id = module.aws_vpc.vpc_id
  tags   = { Name = "aws-to-azure-vpn" }
}

resource "aws_customer_gateway" "azure" {
  bgp_asn    = 65000
  ip_address = azurerm_public_ip.vpn.ip_address
  type       = "ipsec.1"
  tags       = { Name = "azure-gateway" }
}

resource "aws_vpn_connection" "to_azure" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.azure.id
  type                = "ipsec.1"
  static_routes_only  = true

  tags = { Name = "aws-to-azure-vpn" }
}

# Azure side
resource "azurerm_virtual_network_gateway" "main" {
  name                = "azure-to-aws-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  type                = "Vpn"
  vpn_type            = "RouteBased"
  sku                 = "VpnGw1"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }
}

resource "azurerm_local_network_gateway" "aws" {
  name                = "aws-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  gateway_address     = aws_vpn_connection.to_azure.tunnel1_address
  address_space       = [module.aws_vpc.vpc_cidr]
}
```

## State Management for Multi-Cloud

Manage state files across multiple cloud deployments:

```hcl
# Each cloud deployment gets its own state file
# but uses a centralized backend

# aws/backend.tf
terraform {
  backend "s3" {
    bucket = "myorg-terraform-state"
    key    = "multi-cloud/aws/terraform.tfstate"
    region = "us-east-1"
  }
}

# azure/backend.tf
terraform {
  backend "s3" {
    bucket = "myorg-terraform-state"
    key    = "multi-cloud/azure/terraform.tfstate"
    region = "us-east-1"
  }
}

# Cross-reference between clouds using remote state
data "terraform_remote_state" "aws" {
  backend = "s3"
  config = {
    bucket = "myorg-terraform-state"
    key    = "multi-cloud/aws/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Best Practices

Do not abstract everything. Some cloud-specific features are worth using directly. Only abstract when you genuinely need portability.

Keep cloud-specific configurations separate. Mixing AWS and Azure resources in the same state file creates unnecessary coupling.

Use a consistent tagging and naming strategy across clouds. This makes cross-cloud resource management and cost tracking possible.

Test failover scenarios regularly. Multi-cloud resilience only works if you actually test the failover.

Monitor costs across all clouds. Multi-cloud can easily lead to cost surprises if not tracked carefully.

## Conclusion

Multi-cloud deployments with Terraform leverage the tool's greatest strength: a single workflow for managing infrastructure across providers. By creating appropriate abstractions, managing state carefully, and connecting networks across clouds, you can build resilient multi-cloud infrastructure while maintaining the consistency and repeatability that Terraform provides. The key is to be intentional about what you abstract and what you keep cloud-specific.
