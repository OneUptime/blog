# How to Configure AWS Provider with Default Tags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Provider, Tagging, Cost Management, Infrastructure as Code

Description: Learn how to configure default tags in the Terraform AWS provider to automatically apply consistent tags across all your AWS resources for cost tracking and compliance.

---

Tagging AWS resources consistently is one of those things every team agrees is important but few teams do well. Tags get forgotten, misspelled, or applied inconsistently across modules. The AWS provider for Terraform has a `default_tags` block that solves this by automatically applying a set of tags to every resource that supports tagging. You define them once at the provider level and they propagate everywhere.

## Why Default Tags Matter

Before getting into the configuration, here is why you should care about consistent tagging:

- **Cost allocation** - AWS Cost Explorer lets you filter and group costs by tag. Without consistent tags, you cannot answer "how much does project X cost?"
- **Compliance** - Many organizations require tags like `Environment`, `Owner`, and `CostCenter` on every resource
- **Automation** - Tags can drive automation, like shutting down non-production resources at night
- **Incident response** - When something breaks, tags tell you who owns it and what it belongs to

Manually adding tags to every Terraform resource is error-prone and tedious. Default tags handle this automatically.

## Basic Default Tags Configuration

Here is a minimal configuration with default tags:

```hcl
# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  # These tags will be applied to every resource that supports tagging
  default_tags {
    tags = {
      Environment = "production"
      Project     = "my-app"
      ManagedBy   = "terraform"
      Team        = "platform"
    }
  }
}
```

With this configuration, every `aws_instance`, `aws_s3_bucket`, `aws_vpc`, and any other taggable resource will automatically receive these four tags without you specifying them in each resource block.

## Using Variables for Dynamic Tags

Hardcoding tag values works for simple setups, but in practice you want tags to be dynamic based on the environment, workspace, or deployment context:

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "team" {
  description = "Owning team"
  type        = string
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# providers.tf
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
      Team        = var.team
      CostCenter  = var.cost_center
      ManagedBy   = "terraform"
      # Include the Terraform workspace name for workspace-based workflows
      Workspace   = terraform.workspace
    }
  }
}
```

Then your `terraform.tfvars` for each environment provides the values:

```hcl
# environments/production.tfvars
environment = "production"
project     = "my-app"
team        = "platform"
cost_center = "CC-1234"
```

## Combining Default Tags with Resource-Level Tags

Default tags and resource-level tags work together. If a resource defines its own tags, they merge with the default tags:

```hcl
# This resource gets all default tags PLUS the Name tag
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server-01"
    Role = "webserver"
  }
}
```

The resulting tags on this instance will be:

```
Environment = "production"
Project     = "my-app"
ManagedBy   = "terraform"
Team        = "platform"
Name        = "web-server-01"
Role        = "webserver"
```

### Tag Override Behavior

If a resource-level tag has the same key as a default tag, the resource-level tag wins:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
    }
  }
}

resource "aws_s3_bucket" "staging_data" {
  bucket = "my-staging-data"

  # This overrides the default "production" value
  tags = {
    Environment = "staging"
  }
}
```

The bucket will have `Environment = "staging"` because resource-level tags take precedence over default tags.

**Important caveat**: When you override a default tag at the resource level, Terraform may show a perpetual diff in your plan output. This is a known behavior. The plan will show the tag as being set to the resource-level value, which is technically correct but can be noisy. The AWS provider team has improved this over time, but it is something to be aware of.

## Multi-Region with Default Tags

When you use provider aliases for multiple regions, you can apply default tags to each alias:

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
      Region      = "us-east-1"
      ManagedBy   = "terraform"
    }
  }
}

# Secondary region for disaster recovery
provider "aws" {
  alias  = "dr"
  region = "us-west-2"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
      Region      = "us-west-2"
      Purpose     = "disaster-recovery"
      ManagedBy   = "terraform"
    }
  }
}

# Resources in the primary region get primary tags
resource "aws_s3_bucket" "primary" {
  bucket = "my-app-primary"
}

# Resources in the DR region get DR tags
resource "aws_s3_bucket" "dr" {
  provider = aws.dr
  bucket   = "my-app-dr"
}
```

## Handling the tags_all Attribute

Every AWS resource that supports tagging exposes a `tags_all` computed attribute. This attribute contains the merged result of default tags and resource-level tags:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}

# You can reference the merged tags in outputs
output "instance_all_tags" {
  value = aws_instance.web.tags_all
}
```

This is useful when you need to pass the complete set of tags to another resource or module.

## Using a Local Tags Map

For more complex tagging strategies, define your tags as a local value and reference it in the provider:

```hcl
locals {
  # Common tags computed from multiple inputs
  common_tags = {
    Environment = var.environment
    Project     = var.project
    Team        = var.team
    CostCenter  = var.cost_center
    ManagedBy   = "terraform"
    CreatedDate = formatdate("YYYY-MM-DD", timestamp())
    Repository  = "github.com/myorg/my-infra"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}
```

**Warning about timestamp()**: Using `timestamp()` in default tags means the `CreatedDate` tag will change on every apply, causing Terraform to want to update all resources. If you want a creation date, set it once and manage it manually, or use a fixed value passed as a variable.

## Enforcing Tag Compliance

Default tags handle the happy path, but what about modules or resources that explicitly set tags to empty? You can add validation:

```hcl
# Check that required tags exist using a data source
data "aws_caller_identity" "current" {}

# Use a check block (Terraform 1.5+) to validate tags
check "tag_compliance" {
  assert {
    condition     = length(keys(provider::aws::default_tags())) >= 3
    error_message = "At least 3 default tags must be configured"
  }
}
```

For stricter enforcement, use tools like `tflint` with custom rules or OPA/Conftest policies that validate tags in your CI pipeline:

```bash
# Example tflint rule in .tflint.hcl
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Project", "ManagedBy"]
}
```

## Common Pitfalls

### 1. Forgetting About Auto Scaling Group Propagation

Default tags do not automatically propagate to instances launched by Auto Scaling Groups. You still need to configure tag propagation explicitly:

```hcl
resource "aws_autoscaling_group" "web" {
  # ... other config ...

  tag {
    key                 = "Name"
    value               = "web-asg"
    propagate_at_launch = true
  }

  # Default tags are applied to the ASG itself,
  # but you need explicit tag blocks with propagate_at_launch
  # for tags to reach the launched instances
}
```

### 2. Data Sources Do Not Get Tags

Default tags only apply to managed resources, not data sources. This makes sense because data sources are read-only.

### 3. Some Resources Ignore Tags

A small number of AWS resources do not support tagging at all. The provider cannot apply default tags to resources that do not have a `tags` argument.

## Summary

Default tags in the AWS provider give you a single place to define tags that apply everywhere. This reduces duplication, ensures consistency, and makes cost tracking and compliance much easier. Combine them with variables for environment-specific values, and use resource-level tags for additional metadata that varies per resource. If your organization is serious about tagging, default tags should be one of the first things you configure in any new Terraform project.
