# How to Create Resource Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Resource Groups, Organizations, Tagging, Infrastructure as Code

Description: Learn how to create and manage AWS Resource Groups with Terraform to organize, search, and take bulk actions on tagged resources across your account.

---

AWS Resource Groups let you organize your resources into logical collections based on tags or CloudFormation stack membership. Instead of hunting through individual service consoles to find related resources, you can group them together and view, monitor, or take actions on them as a unit.

Managing resource groups through Terraform keeps your organizational structure in code alongside the resources themselves. When you add a new service to a project, the resource group automatically picks it up if the tags match. This guide covers creating tag-based and CloudFormation-based groups, and using them effectively.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with Resource Groups and Tag Editor permissions
- A consistent tagging strategy across your resources

## Provider Configuration

```hcl
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
}
```

## Tag-Based Resource Groups

The most common approach is grouping resources by tag values. Any resource with matching tags automatically joins the group:

```hcl
# Resource group for all production resources
resource "aws_resourcegroups_group" "production" {
  name        = "production-resources"
  description = "All resources tagged with Environment=production"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Environment"
          Values = ["production"]
        }
      ]
    })
  }

  tags = {
    Purpose = "resource-organization"
  }
}

# Resource group for a specific project
resource "aws_resourcegroups_group" "project_alpha" {
  name        = "project-alpha"
  description = "Resources belonging to Project Alpha"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Project"
          Values = ["alpha"]
        },
        {
          Key    = "Environment"
          Values = ["production", "staging"]
        }
      ]
    })
  }

  tags = {
    Project = "alpha"
  }
}
```

## Filtering by Resource Type

You can narrow a group to specific resource types:

```hcl
# Group only EC2 instances for a team
resource "aws_resourcegroups_group" "team_compute" {
  name        = "platform-team-compute"
  description = "EC2 instances owned by the platform team"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = [
        "AWS::EC2::Instance",
        "AWS::EC2::Volume",
        "AWS::EC2::SecurityGroup"
      ]
      TagFilters = [
        {
          Key    = "Team"
          Values = ["platform"]
        }
      ]
    })
  }

  tags = {
    Team = "platform"
  }
}

# Group for database resources
resource "aws_resourcegroups_group" "databases" {
  name        = "all-databases"
  description = "All RDS and DynamoDB resources in production"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = [
        "AWS::RDS::DBInstance",
        "AWS::RDS::DBCluster",
        "AWS::DynamoDB::Table"
      ]
      TagFilters = [
        {
          Key    = "Environment"
          Values = ["production"]
        }
      ]
    })
  }

  tags = {
    Category = "databases"
  }
}
```

## CloudFormation Stack-Based Groups

If you use CloudFormation alongside Terraform (or for resources created by other tools), you can group by stack:

```hcl
# Group resources from a specific CloudFormation stack
resource "aws_resourcegroups_group" "cfn_stack" {
  name        = "legacy-app-stack"
  description = "Resources from the legacy application CloudFormation stack"

  resource_query {
    type = "CLOUDFORMATION_STACK_1_0"

    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      StackIdentifier     = "arn:aws:cloudformation:us-east-1:123456789012:stack/legacy-app/abc123"
    })
  }
}
```

## Creating Groups Dynamically

When you have multiple teams or projects, use a loop to create groups from a map:

```hcl
# Define team configurations
variable "teams" {
  description = "Map of team names to their resource group settings"
  type = map(object({
    description    = string
    resource_types = list(string)
  }))
  default = {
    platform = {
      description    = "Platform team resources"
      resource_types = ["AWS::AllSupported"]
    }
    data = {
      description    = "Data team resources"
      resource_types = ["AWS::RDS::DBInstance", "AWS::DynamoDB::Table", "AWS::S3::Bucket"]
    }
    frontend = {
      description    = "Frontend team resources"
      resource_types = ["AWS::CloudFront::Distribution", "AWS::S3::Bucket", "AWS::Lambda::Function"]
    }
    backend = {
      description    = "Backend team resources"
      resource_types = ["AWS::ECS::Service", "AWS::EC2::Instance", "AWS::ElasticLoadBalancingV2::LoadBalancer"]
    }
  }
}

# Create a resource group for each team
resource "aws_resourcegroups_group" "teams" {
  for_each = var.teams

  name        = "${each.key}-team-resources"
  description = each.value.description

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = each.value.resource_types
      TagFilters = [
        {
          Key    = "Team"
          Values = [each.key]
        }
      ]
    })
  }

  tags = {
    Team    = each.key
    Purpose = "resource-organization"
  }
}
```

## Environment-Based Groups

Separate groups per environment give you quick visibility into what is running where:

```hcl
# Create groups for each environment
locals {
  environments = ["production", "staging", "development"]
}

resource "aws_resourcegroups_group" "environments" {
  for_each = toset(local.environments)

  name        = "${each.value}-all-resources"
  description = "All resources in the ${each.value} environment"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Environment"
          Values = [each.value]
        }
      ]
    })
  }

  tags = {
    Environment = each.value
    Purpose     = "environment-grouping"
  }
}
```

## Tagging Strategy Best Practices

Resource groups are only as useful as your tagging strategy. Here is a recommended minimum set of tags:

```hcl
# Define a locals block with standard tags
locals {
  standard_tags = {
    Environment = var.environment
    Project     = var.project_name
    Team        = var.team_name
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
  }
}

# Apply to all resources using default_tags in the provider
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = local.standard_tags
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "my-project"
}

variable "team_name" {
  description = "Team owning these resources"
  type        = string
  default     = "platform"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}
```

## Using Resource Groups with AWS Config

Resource groups integrate with AWS Config for compliance monitoring:

```hcl
# AWS Config rule scoped to a resource group
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags-check"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag2Key   = "Team"
    tag3Key   = "Project"
  })

  # Scope to specific resource types
  scope {
    compliance_resource_types = [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket"
    ]
  }

  tags = {
    Purpose = "compliance"
  }
}
```

## Outputs

```hcl
output "production_group_arn" {
  description = "ARN of the production resource group"
  value       = aws_resourcegroups_group.production.arn
}

output "team_group_arns" {
  description = "ARNs of team resource groups"
  value = {
    for k, v in aws_resourcegroups_group.teams : k => v.arn
  }
}
```

## Monitoring Grouped Resources

Resource groups become powerful when combined with monitoring. Use OneUptime to create dashboards that align with your resource groups, giving each team visibility into exactly the resources they own. This makes it straightforward to identify which team's resources are causing alerts or performance issues.

## Summary

AWS Resource Groups bring order to accounts that have grown organically. By defining groups in Terraform alongside a consistent tagging strategy, you make it easy to find, monitor, and manage related resources. The key is getting your tagging right first - once every resource has the right tags, the groups practically define themselves.
