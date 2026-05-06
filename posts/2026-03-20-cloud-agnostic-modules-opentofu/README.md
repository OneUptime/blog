# How to Write Cloud-Agnostic Modules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Multi-Cloud, Cloud-Agnostic, Infrastructure as Code, Reusability

Description: Learn how to design OpenTofu modules that work across AWS, Azure, and GCP - using abstraction patterns that hide provider-specific details behind a consistent interface.

## Introduction

Cloud-agnostic modules expose a provider-neutral interface - inputs like `name`, `environment`, `region`, and `size` - while internal implementation handles the provider-specific details. The calling code doesn't need to know whether it's creating an EC2 instance, Azure VM, or GCP compute instance.

## Pattern: Provider Selection via Variable

```hcl
# modules/object-storage/variables.tf

variable "cloud_provider" {
  type        = string
  description = "Cloud provider: aws, azure, or gcp"
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "cloud_provider must be one of: aws, azure, gcp."
  }
}

variable "bucket_name" { type = string }
variable "environment"  { type = string }
variable "region"       { type = string }
```

```hcl
# modules/object-storage/main.tf

# AWS S3
resource "aws_s3_bucket" "this" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = "${var.bucket_name}-${var.environment}"
  tags   = { Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "this" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.this[0].id
  versioning_configuration { status = "Enabled" }
}

# Azure Blob Storage
resource "azurerm_resource_group" "this" {
  count    = var.cloud_provider == "azure" ? 1 : 0
  name     = "${var.bucket_name}-${var.environment}-rg"
  location = var.region
}

resource "azurerm_storage_account" "this" {
  count                    = var.cloud_provider == "azure" ? 1 : 0
  name                     = lower(replace("${var.bucket_name}${var.environment}", "-", ""))
  resource_group_name      = azurerm_resource_group.this[0].name
  location                 = azurerm_resource_group.this[0].location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = { Environment = var.environment }
}

resource "azurerm_storage_container" "this" {
  count                 = var.cloud_provider == "azure" ? 1 : 0
  name                  = "${var.bucket_name}-${var.environment}"
  storage_account_id    = azurerm_storage_account.this[0].id
  container_access_type = "private"
}

# GCP Cloud Storage
resource "google_storage_bucket" "this" {
  count    = var.cloud_provider == "gcp" ? 1 : 0
  name     = "${var.bucket_name}-${var.environment}"
  location = upper(var.region)
  labels   = { environment = var.environment }
}
```

```hcl
# modules/object-storage/outputs.tf
output "bucket_name" {
  value = (
    var.cloud_provider == "aws"   ? aws_s3_bucket.this[0].id :
    var.cloud_provider == "azure" ? azurerm_storage_container.this[0].name :
    google_storage_bucket.this[0].name
  )
}

output "bucket_arn_or_id" {
  value = (
    var.cloud_provider == "aws"   ? aws_s3_bucket.this[0].arn :
    var.cloud_provider == "azure" ? azurerm_storage_container.this[0].id :
    google_storage_bucket.this[0].self_link
  )
}
```

## Pattern: Separate Modules per Cloud with Common Interface

A cleaner approach: create cloud-specific modules that share the same variable and output interface:

```text
modules/
  object-storage-aws/
    main.tf      # aws_s3_bucket
    variables.tf # shared interface
    outputs.tf   # bucket_name, bucket_arn_or_id
  object-storage-azure/
    main.tf      # azurerm_storage_account + azurerm_storage_container
    variables.tf # same interface
    outputs.tf   # bucket_name, bucket_arn_or_id
  object-storage-gcp/
    main.tf      # google_storage_bucket
    variables.tf # same interface
    outputs.tf   # bucket_name, bucket_arn_or_id
```

Root module selects based on provider:

```hcl
module "storage" {
  source = var.cloud_provider == "aws" ? "./modules/object-storage-aws" : (
    var.cloud_provider == "azure" ? "./modules/object-storage-azure" :
    "./modules/object-storage-gcp"
  )

  bucket_name = "app-data"
  environment = var.environment
  region      = var.region
}
```

## Shared Variable Interface Example

```hcl
# All cloud-specific modules share this variable contract
variable "name"        { type = string }
variable "environment" { type = string }
variable "region"      { type = string }
variable "tags" {
  type    = map(string)
  default = {}
}

# Compute size abstraction
variable "size" {
  type        = string
  description = "T-shirt size: small, medium, large"
  validation {
    condition     = contains(["small", "medium", "large"], var.size)
    error_message = "Size must be small, medium, or large."
  }
}
```

```hcl
# modules/vm-aws/locals.tf
locals {
  instance_type = {
    small  = "t3.small"
    medium = "t3.medium"
    large  = "t3.large"
  }[var.size]
}
```

```hcl
# modules/vm-azure/locals.tf
locals {
  vm_size = {
    small  = "Standard_B2s"
    medium = "Standard_D2s_v3"
    large  = "Standard_D4s_v3"
  }[var.size]
}
```

## Conclusion

Cloud-agnostic modules hide provider complexity behind a consistent variable interface. Use `count = var.cloud_provider == "aws" ? 1 : 0` for simple single-module patterns, or separate per-cloud module directories for cleaner separation. The key is a shared variable contract - same inputs, same outputs, different internal implementations. T-shirt sizing (small/medium/large) abstracts instance types, and shared tag/label conventions map to each provider's tagging system.
