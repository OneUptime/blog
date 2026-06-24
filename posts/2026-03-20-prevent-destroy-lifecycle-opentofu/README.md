# How to Use prevent_destroy Lifecycle in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Protect_destroy, Infrastructure as Code, DevOps

Description: A guide to using prevent_destroy lifecycle in OpenTofu to protect critical resources from accidental deletion.

## Introduction

The `prevent_destroy` lifecycle setting creates a safety guard against accidentally deleting critical resources. When set to `true`, any plan that would destroy the resource will fail with an error, forcing you to remove the protection from the configuration before the destroy can proceed.

## Basic prevent_destroy

```hcl
resource "aws_rds_cluster" "production" {
  cluster_identifier = "production-db"
  engine             = "aurora-postgresql"
  master_username    = "admin"
  master_password    = var.db_password
  skip_final_snapshot = true

  lifecycle {
    prevent_destroy = true  # Cannot be destroyed while this is set
  }
}
```

## What Happens When You Try to Destroy

```bash
# Attempt to destroy:

tofu destroy

# Error:
# Error: Instance cannot be destroyed
#
#   on main.tf line 10:
#   10:   lifecycle {
#   11:     prevent_destroy = true
#   12:   }
#
# Resource aws_rds_cluster.production has lifecycle.prevent_destroy set,
# but the plan calls for this resource to be destroyed. To avoid this error
# and continue with the destruction, either remove the resource from the
# OpenTofu configuration or remove the lifecycle.prevent_destroy block
# from the resource configuration.
```

Resources to Protect

```hcl
# Database cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier = "production-db"
  # ...

  lifecycle {
    prevent_destroy = true
  }
}

# S3 buckets with data
resource "aws_s3_bucket" "data" {
  bucket = "production-app-data"

  lifecycle {
    prevent_destroy = true
  }
}

# KMS keys
resource "aws_kms_key" "encryption" {
  description = "Production data encryption key"

  lifecycle {
    prevent_destroy = true
  }
}

# EKS cluster
resource "aws_eks_cluster" "production" {
  name = "production-cluster"
  # ...

  lifecycle {
    prevent_destroy = true
  }
}
```

## Environment-Conditional Protection

```hcl
# lifecycle settings accept only literal values.
# To enable prevent_destroy only in production, use a production-specific
# configuration or module variant with prevent_destroy set to true.
resource "aws_db_instance" "main" {
  identifier     = "prod-db"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  # ...

  lifecycle {
    prevent_destroy = true
  }
}
```

## Removing prevent_destroy for Intentional Deletion

```bash
# To intentionally delete a protected resource:

# Step 1: Remove or set prevent_destroy = false
# Edit main.tf:
# lifecycle {
#   prevent_destroy = false  # or remove the lifecycle block
# }

# Step 2: Run destroy with the updated configuration
tofu destroy -target=aws_rds_cluster.production

# Step 3: Re-add prevent_destroy after deletion (for remaining resources)
```

## Combining with Other Lifecycle Settings

You can combine `prevent_destroy` with other lifecycle settings, but any plan that still needs to destroy the existing object will be blocked while `prevent_destroy` is enabled.

```hcl
resource "aws_rds_cluster" "production" {
  cluster_identifier = "production"
  engine             = "aurora-postgresql"
  skip_final_snapshot = true

  lifecycle {
    prevent_destroy       = true   # Cannot be deleted
    create_before_destroy = true   # Does not override prevent_destroy
    ignore_changes        = [master_password]  # Ignore manual password changes
  }
}
```

## prevent_destroy in Modules

```hcl
# The lifecycle block must be inside the resource definition in the module.
# You cannot set it from a parent module, and lifecycle settings must use
# literal values.

# In modules/rds/main.tf:
resource "aws_db_instance" "this" {
  # ...

  lifecycle {
    prevent_destroy = true
  }
}

# In root module:
module "db" {
  source = "./modules/rds"
}
```

## Conclusion

`prevent_destroy` is a critical safety feature for production infrastructure. Apply it to databases, encryption keys, DNS zones, and any resource where accidental deletion would cause severe data loss or service disruption. Use production-specific configurations or module variants to enable it in production without affecting development flexibility. Remember that removing the guard requires a code change, creating a natural "break glass" procedure for intentional deletions.
