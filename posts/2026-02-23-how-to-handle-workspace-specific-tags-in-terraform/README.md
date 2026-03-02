# How to Handle Workspace-Specific Tags in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Tagging, AWS, Infrastructure as Code, Cost Management

Description: Learn how to implement workspace-aware tagging strategies in Terraform to track costs, enforce compliance, and manage resources across environments.

---

Tags are one of the most practical tools for managing cloud infrastructure at scale. When combined with Terraform workspaces, tags become even more powerful because you can automatically apply environment-specific metadata to every resource. This post covers the patterns and techniques for implementing workspace-aware tagging.

## Why Workspace-Based Tags Matter

Tags serve multiple purposes: cost allocation, access control, compliance auditing, and operational management. When you use workspaces for different environments, each environment needs tags that identify it correctly. Manually adding tags per environment is error-prone. Automating it through `terraform.workspace` ensures consistency.

```hcl
# Without workspace-aware tags, you have to remember to update them manually
# This is a recipe for mistakes
resource "aws_instance" "app" {
  tags = {
    Environment = "prod"  # What if someone copies this to the dev workspace?
  }
}

# With workspace-aware tags, the correct value is always applied
resource "aws_instance" "app" {
  tags = {
    Environment = terraform.workspace  # Always correct
  }
}
```

## Building a Tag Strategy

Start by defining what tags you need across all environments and which ones vary by workspace.

```hcl
# tags.tf
locals {
  # Tags that are the same across all workspaces
  static_tags = {
    Project   = "webapp"
    ManagedBy = "terraform"
    Team      = "platform-engineering"
    CostCode  = "ENG-001"
  }

  # Tags that change based on the workspace
  workspace_tags = {
    Environment = terraform.workspace
    Workspace   = terraform.workspace
  }

  # Tags specific to certain workspace types
  environment_specific_tags = {
    dev = {
      AutoShutdown = "true"
      DataClass    = "non-production"
      SLA          = "best-effort"
    }
    staging = {
      AutoShutdown = "false"
      DataClass    = "non-production"
      SLA          = "business-hours"
    }
    prod = {
      AutoShutdown = "false"
      DataClass    = "production"
      SLA          = "24x7"
      Compliance   = "SOC2"
    }
  }

  # Combine all tags
  common_tags = merge(
    local.static_tags,
    local.workspace_tags,
    lookup(local.environment_specific_tags, terraform.workspace, {})
  )
}
```

## Applying Tags to All Resources

### Using AWS Provider Default Tags

The simplest approach for AWS is to use the provider's `default_tags` feature:

```hcl
# providers.tf
provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

# Now every AWS resource automatically gets the common tags
# You only need to add resource-specific tags
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type

  tags = {
    # Resource-specific tags only
    Name = "${terraform.workspace}-app"
    Role = "application"
  }
  # common_tags are applied automatically by the provider
}

resource "aws_s3_bucket" "data" {
  bucket = "myapp-${terraform.workspace}-data"

  tags = {
    Name    = "${terraform.workspace}-data"
    Purpose = "application-data"
  }
}
```

### For Azure Resources

Azure uses a similar approach with the `azurerm` provider:

```hcl
# providers.tf
provider "azurerm" {
  features {}
}

# Azure does not have provider-level default tags,
# so use a local and merge for each resource
resource "azurerm_resource_group" "main" {
  name     = "rg-${terraform.workspace}-webapp"
  location = var.location

  tags = merge(local.common_tags, {
    Name = "rg-${terraform.workspace}-webapp"
  })
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${terraform.workspace}-webapp"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = merge(local.common_tags, {
    Name = "vnet-${terraform.workspace}-webapp"
  })
}
```

### For GCP Resources

GCP uses labels instead of tags:

```hcl
# GCP labels have stricter naming rules:
# - lowercase only
# - no special characters except hyphens and underscores
# - max 63 characters for keys and values

locals {
  gcp_labels = {
    environment = lower(terraform.workspace)
    project     = "webapp"
    managed_by  = "terraform"
    team        = "platform-engineering"
    cost_code   = "eng-001"
  }
}

resource "google_compute_instance" "app" {
  name         = "${terraform.workspace}-app"
  machine_type = var.machine_type
  zone         = var.zone

  labels = merge(local.gcp_labels, {
    role = "application"
  })

  boot_disk {
    initialize_params {
      image = var.image
    }
  }

  network_interface {
    network = google_compute_network.main.id
  }
}
```

## Workspace-Specific Cost Allocation Tags

Cost allocation is one of the primary uses for tags. Set up workspace-aware cost tags to track spending per environment:

```hcl
# cost_tags.tf
locals {
  # Map workspaces to cost centers
  cost_center_map = {
    dev     = "CC-DEV-100"
    staging = "CC-QA-200"
    prod    = "CC-PROD-300"
  }

  # Map workspaces to budget owners
  budget_owner_map = {
    dev     = "dev-lead@example.com"
    staging = "qa-lead@example.com"
    prod    = "cto@example.com"
  }

  cost_tags = {
    CostCenter  = lookup(local.cost_center_map, terraform.workspace, "CC-UNKNOWN")
    BudgetOwner = lookup(local.budget_owner_map, terraform.workspace, "unassigned")
    BillingEnv  = terraform.workspace
  }

  # Merge cost tags into common tags
  all_tags = merge(local.common_tags, local.cost_tags)
}
```

## Conditional Tags Based on Workspace

Some tags should only appear on certain workspaces:

```hcl
# conditional_tags.tf
locals {
  is_production = terraform.workspace == "prod"
  is_temporary  = startswith(terraform.workspace, "test-") || startswith(terraform.workspace, "demo-")

  # Compliance tags only for production
  compliance_tags = local.is_production ? {
    Compliance       = "SOC2"
    DataClassification = "confidential"
    BackupPolicy     = "daily-30d"
    EncryptionRequired = "true"
  } : {}

  # Expiry tags only for temporary workspaces
  expiry_tags = local.is_temporary ? {
    Temporary = "true"
    ExpiresOn = timeadd(timestamp(), "48h")
    CreatedBy = var.creator_email
  } : {}

  # Final merged tags
  final_tags = merge(
    local.common_tags,
    local.cost_tags,
    local.compliance_tags,
    local.expiry_tags
  )
}
```

## Enforcing Tag Compliance

Use Terraform validation and AWS Config rules to enforce that all resources have required tags:

```hcl
# tag_enforcement.tf

# Validate that required tags are present
variable "required_tag_keys" {
  description = "Tags that must be present on all resources"
  type        = list(string)
  default = [
    "Environment",
    "Project",
    "ManagedBy",
    "Team"
  ]
}

# AWS Config rule to check for required tags
resource "aws_config_config_rule" "required_tags" {
  name = "${terraform.workspace}-required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "Environment"
    tag2Key = "Project"
    tag3Key = "ManagedBy"
    tag4Key = "Team"
  })

  tags = local.common_tags
}

# SCP or IAM policy that denies resource creation without tags
resource "aws_iam_policy" "enforce_tags" {
  count = terraform.workspace == "prod" ? 1 : 0

  name        = "enforce-resource-tags"
  description = "Deny resource creation without required tags"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUntaggedEC2"
        Effect    = "Deny"
        Action    = ["ec2:RunInstances"]
        Resource  = ["arn:aws:ec2:*:*:instance/*"]
        Condition = {
          "StringNotLike" = {
            "aws:RequestTag/Environment" = ["*"]
          }
        }
      }
    ]
  })
}
```

## Tag-Based Resource Queries

Use tags to find and manage resources across workspaces:

```bash
#!/bin/bash
# find-resources-by-workspace.sh
# Finds all AWS resources tagged with a specific workspace

WORKSPACE=${1:-$(terraform workspace show)}

echo "Finding resources tagged with Environment=$WORKSPACE"
echo ""

# Find EC2 instances
echo "EC2 Instances:"
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=$WORKSPACE" \
  --query 'Reservations[].Instances[].[InstanceId,State.Name,InstanceType,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# Find RDS instances
echo ""
echo "RDS Instances:"
aws rds describe-db-instances \
  --query "DBInstances[?TagList[?Key=='Environment'&&Value=='$WORKSPACE']].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus]" \
  --output table

# Find S3 buckets (need to check tags per bucket)
echo ""
echo "S3 Buckets:"
aws s3api list-buckets --query 'Buckets[].Name' --output text | tr '\t' '\n' | while read bucket; do
  env_tag=$(aws s3api get-bucket-tagging --bucket "$bucket" 2>/dev/null | \
    jq -r ".TagSet[] | select(.Key==\"Environment\") | .Value" 2>/dev/null)
  if [ "$env_tag" = "$WORKSPACE" ]; then
    echo "  $bucket"
  fi
done
```

## Handling Tag Propagation

Some resources like Auto Scaling Groups need special handling for tag propagation:

```hcl
# asg.tf
resource "aws_autoscaling_group" "app" {
  name                = "${terraform.workspace}-app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Tags for the ASG itself AND propagation to launched instances
  dynamic "tag" {
    for_each = merge(local.common_tags, {
      Name = "${terraform.workspace}-app"
      Role = "application"
    })

    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true  # Tags are copied to new instances
    }
  }
}
```

## Summary

Workspace-specific tags transform how you manage infrastructure across environments. By building a consistent tagging strategy tied to `terraform.workspace`, you get automatic cost allocation, compliance enforcement, and operational visibility without manual effort. Use provider-level default tags where available, merge workspace-specific tags at the resource level, and enforce compliance through AWS Config or similar tools. For more workspace patterns, check out our guide on [workspace naming conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-naming-in-terraform-workspace/view).
