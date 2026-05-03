# How to Deploy to Both AWS and Azure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Azure, Multi-Cloud, Infrastructure as Code, DevOps

Description: Learn how to use OpenTofu to provision resources across both AWS and Azure simultaneously - managing multi-cloud deployments from a single configuration with provider aliases and shared module...

## Introduction

OpenTofu can manage resources across AWS and Azure in the same configuration. This is useful for multi-cloud strategies where workloads span providers - for example, compute on AWS with Azure Active Directory for identity, or disaster recovery across clouds.

## Configuring Both Providers

```hcl
# providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}
```

## Variables for Both Clouds

```hcl
# variables.tf
variable "aws_region"             { default = "us-east-1" }
variable "azure_location"         { default = "East US" }
variable "azure_subscription_id"  { type = string }
variable "azure_tenant_id"        { type = string }
variable "environment"            { default = "prod" }
variable "project"                { default = "myapp" }
```

## Deploying Resources on Both Clouds

```hcl
# AWS: VPC and EC2 instance
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.project}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id

  tags = {
    Name        = "${var.project}-app"
    Environment = var.environment
  }
}

# Azure: Resource group and VM
resource "azurerm_resource_group" "main" {
  name     = "${var.project}-rg"
  location = var.azure_location

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.project}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_subnet" "internal" {
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.1.0/24"]
}
```

## Cross-Cloud DNS with Route53 and Azure DNS

```hcl
# AWS Route53 for global DNS
resource "aws_route53_zone" "main" {
  name = "myapp.example.com"
}

# AWS workload record
resource "aws_route53_record" "aws_app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "aws.myapp.example.com"
  type    = "A"
  ttl     = 60
  records = [aws_instance.app.public_ip]
}

# Azure workload record
resource "aws_route53_record" "azure_app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "azure.myapp.example.com"
  type    = "A"
  ttl     = 60
  records = [azurerm_public_ip.app.ip_address]
}
```

## Shared Outputs

```hcl
# outputs.tf
output "aws_app_ip" {
  value       = aws_instance.app.public_ip
  description = "AWS application server IP"
}

output "azure_app_ip" {
  value       = azurerm_public_ip.app.ip_address
  description = "Azure application server IP"
}

output "aws_vpc_id" {
  value = aws_vpc.main.id
}

output "azure_vnet_id" {
  value = azurerm_virtual_network.main.id
}
```

## Authentication for CI/CD

```yaml
# GitHub Actions: authenticate to both clouds
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: us-east-1

- name: Configure Azure credentials
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: OpenTofu Apply
  run: |
    tofu init
    tofu apply -auto-approve
```

## Conclusion

OpenTofu manages AWS and Azure resources from a single configuration using multiple provider blocks. Structure multi-cloud configs with clear naming (`aws_` and `azurerm_` prefixes), shared locals for common values, and per-cloud authentication in CI/CD. This approach works well for hybrid cloud, disaster recovery across providers, and workloads that genuinely span multiple clouds.
