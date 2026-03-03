# How to Handle Resource Type Changes During Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Resource Types, State Management, Infrastructure as Code

Description: Learn how to handle Terraform resource type changes during provider upgrades and migrations using moved blocks, state operations, and import strategies.

---

Provider upgrades and migrations often introduce resource type changes. A resource you defined as one type may be renamed, split into multiple types, or merged with another. Without proper handling, these changes cause Terraform to destroy the old resource and create a new one, potentially causing downtime. This guide covers techniques for handling resource type changes smoothly.

## Why Resource Types Change

Resource types change for several reasons. Providers may split a monolithic resource into smaller, more focused resources for better management. Resources may be renamed for consistency. Cloud provider API changes may require new resource structures. Provider maintainers may deprecate old resource types in favor of improved implementations.

## Using Moved Blocks

Terraform 1.1 introduced moved blocks as the primary tool for handling resource renames and type changes:

```hcl
# Resource type changed from aws_s3_bucket_object to aws_s3_object
moved {
  from = aws_s3_bucket_object.file
  to   = aws_s3_object.file
}

resource "aws_s3_object" "file" {
  bucket = aws_s3_bucket.data.id
  key    = "data/file.txt"
  source = "local/file.txt"
}
```

When you run `terraform plan`, Terraform shows the move instead of a destroy/create:

```text
Terraform will perform the following actions:

  # aws_s3_bucket_object.file has moved to aws_s3_object.file
    resource "aws_s3_object" "file" {
        id     = "data/file.txt"
        # (other attributes unchanged)
    }

Plan: 0 to add, 0 to change, 0 to destroy.
```

## Handling Resource Splits

When a single resource is split into multiple resources, you need to import the additional resources:

```hcl
# Before: S3 bucket with inline configuration
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
  acl    = "private"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true
    expiration {
      days = 90
    }
  }
}

# After: S3 bucket split into separate resources
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_acl" "data" {
  bucket = aws_s3_bucket.data.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "expire-old"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}
```

Import the new separate resources:

```hcl
# Import blocks for the split resources
import {
  to = aws_s3_bucket_acl.data
  id = "my-bucket,private"
}

import {
  to = aws_s3_bucket_versioning.data
  id = "my-bucket"
}

import {
  to = aws_s3_bucket_lifecycle_configuration.data
  id = "my-bucket"
}
```

## Using terraform state mv

For resource type changes not supported by moved blocks, use the CLI:

```bash
# Move a resource to a new type
terraform state mv \
  'aws_elasticsearch_domain.search' \
  'aws_opensearch_domain.search'
```

This is necessary when the state schema between old and new types is compatible but moved blocks are not supported for the transition.

## Handling Complex Resource Type Migrations

Some migrations involve changing both the resource type and restructuring attributes:

```hcl
# Before: Classic load balancer
resource "aws_elb" "web" {
  name               = "web-lb"
  availability_zones = ["us-east-1a", "us-east-1b"]

  listener {
    instance_port     = 80
    instance_protocol = "http"
    lb_port           = 80
    lb_protocol       = "http"
  }

  health_check {
    target              = "HTTP:80/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# After: Application load balancer (different resource type and structure)
resource "aws_lb" "web" {
  name               = "web-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.subnet_ids
}

resource "aws_lb_target_group" "web" {
  name     = "web-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path     = "/"
    interval = 30
    timeout  = 5
  }
}

resource "aws_lb_listener" "web" {
  load_balancer_arn = aws_lb.web.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}
```

For this type of migration where the new resources are fundamentally different, you cannot simply move state. Instead, create the new resources alongside the old ones, migrate traffic, then remove the old resources:

```bash
# Step 1: Create new ALB resources (terraform apply)
# Step 2: Migrate traffic/DNS to new ALB
# Step 3: Remove old ELB from configuration
# Step 4: Remove old ELB from state
terraform state rm aws_elb.web
```

## Batch Handling Resource Type Changes

For configurations with many resources undergoing type changes:

```bash
#!/bin/bash
# batch-resource-moves.sh
# Generate moved blocks for batch resource type changes

# Define the resource type mapping
declare -A TYPE_MAP=(
  ["aws_s3_bucket_object"]="aws_s3_object"
  ["aws_elasticsearch_domain"]="aws_opensearch_domain"
)

# Find all resources of the old type in state
for old_type in "${!TYPE_MAP[@]}"; do
  new_type="${TYPE_MAP[$old_type]}"

  # Get all resources of this type from state
  terraform state list | grep "^${old_type}\." | while read -r resource; do
    # Extract the resource name
    resource_name="${resource#${old_type}.}"

    echo "moved {"
    echo "  from = ${old_type}.${resource_name}"
    echo "  to   = ${new_type}.${resource_name}"
    echo "}"
    echo ""
  done
done > moved.tf

echo "Generated moved blocks in moved.tf"
echo "Update your resource blocks to use the new types, then run terraform plan"
```

## Handling Module Internal Resource Type Changes

When a module you use changes its internal resource types, the module should provide moved blocks. If it does not, you may need to handle the state manually:

```bash
# If a module changed internal resource types
# Check if the module provides moved blocks (most modern modules do)

# If not, you may need to:
# 1. Check the module changelog for migration instructions
# 2. Manually move state entries

terraform state mv \
  'module.vpc.aws_nat_gateway.this[0]' \
  'module.vpc.aws_nat_gateway.main[0]'
```

## Testing Resource Type Changes

Always test in a non-production environment:

```bash
# Create a plan file
terraform plan -out=type-change.tfplan

# Review the plan carefully
terraform show type-change.tfplan

# Look for destroy/create pairs that should be moves
# If you see:
#   - aws_old_type.resource will be destroyed
#   + aws_new_type.resource will be created
# You need a moved block or state mv

# After adding moved blocks, re-plan
terraform plan
# Should show moves, not destroy/create
```

## Lifecycle of Moved Blocks

Moved blocks can be removed after they have been applied across all environments:

```hcl
# Keep moved blocks until all environments have applied them
# Then remove them to keep configuration clean

# Good practice: add a comment with removal date
moved {
  from = aws_s3_bucket_object.file
  to   = aws_s3_object.file
  # Safe to remove after all environments apply this change
  # Target removal: 2026-04-01
}
```

## Best Practices

Use moved blocks as the first choice for handling resource type changes. Test all type changes with terraform plan before applying. Handle resource splits by importing the new sub-resources. Keep moved blocks in your configuration until all environments have applied them. Document resource type changes in your commit messages. For fundamentally different resource types, plan a gradual migration with traffic cutover.

## Conclusion

Resource type changes during Terraform migrations are common and manageable. Moved blocks handle simple renames and type changes. Resource splits require import blocks for the new resources. Complex structural changes may need a parallel deployment strategy. The key is always using terraform plan to verify the migration path before applying, ensuring no unexpected resource destruction.

For related guides, see [How to Handle Breaking Changes During Terraform Upgrades](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-during-terraform-upgrades/view) and [How to Migrate Between Terraform Provider Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-between-terraform-provider-versions/view).
