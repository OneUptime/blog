# How to Configure Alibaba Cloud Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Alibaba Cloud provider in OpenTofu to manage Alibaba Cloud resources as code.

## Introduction

The Alibaba Cloud provider for OpenTofu enables managing Alibaba Cloud resources with the same plan/apply workflow as the rest of your infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = ">= 1.119.0, < 2.0.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Alicloud provider can read credentials from environment variables:

```bash
export ALIBABA_CLOUD_ACCESS_KEY_ID="your-access-key-id"
export ALIBABA_CLOUD_ACCESS_KEY_SECRET="your-access-key-secret"
export ALIBABA_CLOUD_REGION="cn-hangzhou"
```

```hcl
provider "alicloud" {
  # Credentials and region are read from environment variables
}
```

## Example Resource

```hcl
resource "alicloud_vpc" "main" {
  vpc_name   = "${var.name}-${var.environment}"
  cidr_block = "10.0.0.0/8"

  tags = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "vpc_id" { value = alicloud_vpc.main.id }
```

## Best Practices

- Store access keys in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Alibaba Cloud resources with OpenTofu brings the same consistency and auditability to cloud infrastructure as other infrastructure-as-code workflows. Start by codifying your most critical resources and gradually expand coverage over time.
