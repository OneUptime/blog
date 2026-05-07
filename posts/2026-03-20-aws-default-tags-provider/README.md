# How to Set Default Tags on the AWS Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, Terraform, IaC, DevOps, Tagging

Description: Learn how to configure default tags on the AWS provider in OpenTofu to automatically apply tags to all supported resources without repeating them in every resource block.

## Introduction

The AWS provider's `default_tags` feature automatically applies a set of tags to supported taggable resources managed by the provider. This eliminates the need to specify common tags (like `Environment`, `Owner`, `ManagedBy`) in every resource block. Default tags are merged with resource-level tags, with resource-level tags taking precedence on conflicts.

## Basic Default Tags Configuration

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy   = "opentofu"
      Environment = var.environment
      Project     = var.project_name
      Owner       = var.team_name
      CostCenter  = var.cost_center
    }
  }
}
```

## How Default Tags Work

With the above configuration, supported taggable resources managed by the provider automatically get those tags:

```hcl
# These tags are set explicitly

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
    # Environment, Project, Owner etc. are added automatically
  }
}

# Result: the instance has ALL tags:
# Name = "web-server"
# ManagedBy = "opentofu"
# Environment = "production"
# Project = "my-project"
# Owner = "platform-team"
# CostCenter = "CC-001"
```

## Default Tags with Dynamic Values

```hcl
locals {
  common_tags = {
    ManagedBy     = "opentofu"
    Environment   = var.environment
    Repository    = "github.com/my-org/infrastructure"
    TerraformWorkspace = terraform.workspace
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}
```

## Overriding Default Tags at Resource Level

Resource-level tags override default tags with the same key:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"  # Default
      ManagedBy   = "opentofu"
    }
  }
}

resource "aws_instance" "special" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    # This overrides the default_tags Environment value
    Environment = "staging"
    Name        = "special-instance"
  }
  # Final tags: Environment=staging, ManagedBy=opentofu, Name=special-instance
}
```

## Multiple Providers with Different Default Tags

Use provider aliases to have different default tags per environment:

```hcl
provider "aws" {
  alias  = "prod"
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      CostCenter  = "CC-PROD-001"
    }
  }
}

provider "aws" {
  alias  = "dev"
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "development"
      CostCenter  = "CC-DEV-001"
    }
  }
}

resource "aws_instance" "prod_server" {
  provider      = aws.prod
  ami           = var.ami_id
  instance_type = "m5.large"
  # Gets CostCenter = CC-PROD-001
}

resource "aws_instance" "dev_server" {
  provider      = aws.dev
  ami           = var.ami_id
  instance_type = "t3.micro"
  # Gets CostCenter = CC-DEV-001
}
```

## Tagging Compliance Check Block

Combine default tags with a check block to verify compliance. Failed assertions produce warnings and do not block plan or apply:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "opentofu"
    }
  }
}

# Verify required tags are present on critical resources
check "tagging_compliance" {
  assert {
    condition     = contains(keys(aws_instance.web.tags_all), "Environment")
    error_message = "Instance missing required Environment tag"
  }

  assert {
    condition     = contains(keys(aws_instance.web.tags_all), "ManagedBy")
    error_message = "Instance missing required ManagedBy tag"
  }
}
```

## Viewing All Tags (tags_all)

The `tags_all` attribute shows the merged result of default tags + resource tags:

```hcl
output "instance_all_tags" {
  # tags_all includes default_tags + resource-level tags
  value = aws_instance.web.tags_all
}
```

## Ignoring Default Tag Changes

If external systems modify tags, use `ignore_changes`:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    ignore_changes = [
      tags["LastModifiedBy"],  # Ignore tags set by other tools
    ]
  }
}
```

## Conclusion

Default tags on the AWS provider are the simplest and most reliable way to enforce consistent tagging across supported resources. Configure them once in the provider block and supported taggable resources receive them automatically. Use `tags_all` to inspect the merged tag set. Combine default tags with check blocks to monitor compliance, or with governance policies to enforce organization tagging standards without repeating tag definitions in every resource.
