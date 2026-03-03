# How to Use Lifecycle Rules with prevent_destroy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Lifecycle, Safety, Infrastructure as Code, Data Protection

Description: Learn how to use Terraform's prevent_destroy lifecycle rule to protect critical infrastructure resources like databases, S3 buckets, and encryption keys from accidental deletion.

---

Accidentally destroying a production database with Terraform is the kind of mistake that makes headlines. The `prevent_destroy` lifecycle rule is a safety net that blocks Terraform from destroying a resource, even if the configuration changes would normally trigger destruction. It protects your most critical resources from accidental deletion.

This post covers how `prevent_destroy` works, which resources should use it, and how to handle the situations where you actually do need to destroy a protected resource.

## How prevent_destroy Works

When `prevent_destroy` is set to `true`, Terraform will error and refuse to proceed with any plan that would destroy the resource:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.large"

  lifecycle {
    prevent_destroy = true
  }
}
```

If someone runs `terraform destroy` or changes the configuration in a way that requires the database to be replaced, Terraform shows an error:

```text
Error: Instance cannot be destroyed

  on main.tf line 1:
   1: resource "aws_db_instance" "main" {

Resource aws_db_instance.main has lifecycle.prevent_destroy set, but the
plan calls for this resource to be destroyed. To avoid this error and
continue with the plan, either disable lifecycle.prevent_destroy or reduce
the scope of the change so that aws_db_instance.main is no longer
included in the plan to be destroyed.
```

The plan is blocked. Nothing is destroyed. The database is safe.

## Which Resources to Protect

Protect any resource where data loss would be catastrophic or recovery would be difficult:

### Databases

```hcl
resource "aws_db_instance" "production" {
  identifier     = "${var.project}-prod-db"
  engine         = "postgres"
  instance_class = "db.r5.large"

  # Additional safety measures
  deletion_protection     = true  # AWS-level protection
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project}-prod-db-final"
  backup_retention_period = 30

  lifecycle {
    prevent_destroy = true  # Terraform-level protection
  }
}

resource "aws_rds_cluster" "production" {
  cluster_identifier = "${var.project}-aurora-prod"
  engine             = "aurora-postgresql"

  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project}-aurora-prod-final"

  lifecycle {
    prevent_destroy = true
  }
}
```

### S3 Buckets with Important Data

```hcl
resource "aws_s3_bucket" "customer_data" {
  bucket = "${var.project}-customer-data"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project}-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}
```

### Encryption Keys

Losing a KMS key means losing access to everything encrypted with it:

```hcl
resource "aws_kms_key" "main" {
  description         = "Main encryption key for ${var.project}"
  enable_key_rotation = true

  # KMS keys have a waiting period before deletion, but prevent_destroy
  # adds another layer of protection
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project}-main"
  target_key_id = aws_kms_key.main.key_id
}
```

### DNS Zones

Deleting a DNS zone can take down an entire domain:

```hcl
resource "aws_route53_zone" "production" {
  name = var.domain_name

  lifecycle {
    prevent_destroy = true
  }
}
```

### Elasticsearch/OpenSearch Domains

```hcl
resource "aws_opensearch_domain" "production" {
  domain_name    = "${var.project}-prod"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 3
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

### VPCs in Production

```hcl
resource "aws_vpc" "production" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "${var.project}-production-vpc"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## prevent_destroy Does Not Prevent All Changes

An important distinction: `prevent_destroy` only blocks destruction. It does not block updates. In-place updates still happen normally:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.large"  # Changing this to db.r5.xlarge is fine

  lifecycle {
    prevent_destroy = true
  }
}
```

Changing `instance_class` from `db.r5.large` to `db.r5.xlarge` triggers an in-place update (or a modification), not a replacement. Terraform allows this.

But if you change an attribute that forces replacement (like the `engine` from postgres to mysql), Terraform blocks the plan because replacement involves destroying the old resource.

## When prevent_destroy Triggers

`prevent_destroy` blocks the plan in these scenarios:

1. **`terraform destroy`** - Attempting to destroy all infrastructure
2. **Removing the resource from configuration** - Deleting the resource block
3. **Changing an attribute that forces replacement** - Terraform would need to destroy and recreate
4. **Removing the module that contains the resource** - The resource would be destroyed

```hcl
# Scenario: Changing an attribute that forces replacement
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "mysql"  # Changed from "postgres" - forces replacement
  instance_class = "db.r5.large"

  lifecycle {
    prevent_destroy = true
  }
}
# Error: Instance cannot be destroyed
```

## How to Actually Destroy a Protected Resource

When you legitimately need to destroy a protected resource (decommissioning, migration), follow these steps:

### Step 1: Remove prevent_destroy

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  instance_class = "db.r5.large"

  lifecycle {
    prevent_destroy = false  # Changed from true
  }
}
```

### Step 2: Apply the Configuration Change

```bash
terraform apply
# This only updates the lifecycle rule, no infrastructure changes
```

### Step 3: Now Destroy the Resource

```bash
terraform destroy -target=aws_db_instance.main
# Or remove the resource block and apply
```

### Alternative: Remove from State

If you want to stop managing the resource with Terraform but keep it running:

```bash
# Remove from Terraform state (does NOT destroy the resource)
terraform state rm aws_db_instance.main
```

After removing from state, delete the resource block from your configuration. The actual database continues running in AWS - you just need to manage or delete it through the AWS console or CLI.

## prevent_destroy with Conditional Logic

You might want to protect resources only in production:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}-db"
  engine         = "postgres"
  instance_class = var.db_instance_class

  lifecycle {
    # Note: prevent_destroy does not support variables
    # You cannot do: prevent_destroy = var.environment == "production"
    prevent_destroy = true
  }
}
```

Unfortunately, `prevent_destroy` does not support expressions or variables. It must be a literal `true` or `false`. If you need conditional protection, you have to use separate resource blocks or separate environment configurations:

```hcl
# For production - in production/main.tf
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-prod-db"
  engine         = "postgres"
  instance_class = "db.r5.large"

  lifecycle {
    prevent_destroy = true
  }
}

# For dev - in dev/main.tf (or with a different module)
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-dev-db"
  engine         = "postgres"
  instance_class = "db.t3.micro"

  # No prevent_destroy - dev databases can be freely destroyed
}
```

## Combining with AWS-Level Protection

Terraform's `prevent_destroy` is a plan-time check. For defense in depth, combine it with AWS-level deletion protection:

```hcl
resource "aws_db_instance" "main" {
  identifier          = "${var.project}-prod-db"
  engine              = "postgres"
  instance_class      = "db.r5.large"
  deletion_protection = true  # AWS API will reject delete requests

  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project}-final-${formatdate("YYYY-MM-DD", timestamp())}"
  backup_retention_period = 30

  lifecycle {
    prevent_destroy = true  # Terraform will reject destroy plans
  }
}
```

With both protections:
- Terraform refuses to plan a destruction (`prevent_destroy`)
- Even if someone bypasses Terraform, AWS refuses the API call (`deletion_protection`)
- Even if deletion protection is disabled, a final snapshot is taken

### S3 Bucket Protection

```hcl
resource "aws_s3_bucket" "critical_data" {
  bucket = "${var.project}-critical-data"

  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning as additional protection
resource "aws_s3_bucket_versioning" "critical_data" {
  bucket = aws_s3_bucket.critical_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Object lock prevents even versioned objects from being deleted
resource "aws_s3_bucket_object_lock_configuration" "critical_data" {
  bucket = aws_s3_bucket.critical_data.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}
```

## Common Mistakes

### Applying prevent_destroy After the Resource Exists

`prevent_destroy` only takes effect after it is in the configuration. It cannot protect a resource retroactively if someone deletes the resource block entirely from the code:

```bash
# If someone deletes the entire resource block AND the lifecycle rule,
# prevent_destroy provides no protection because it no longer exists
# in the configuration.
```

This is why combining with AWS-level `deletion_protection` is important.

### Forgetting prevent_destroy on Related Resources

Protecting a database but not its subnet group or parameter group can still cause issues:

```hcl
resource "aws_db_instance" "main" {
  identifier             = "${var.project}-db"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  lifecycle {
    prevent_destroy = true
  }
}

# Also protect the subnet group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnets"
  subnet_ids = var.private_subnet_ids

  lifecycle {
    prevent_destroy = true
  }
}

# And the parameter group
resource "aws_db_parameter_group" "main" {
  name   = "${var.project}-db-params"
  family = "postgres15"

  lifecycle {
    prevent_destroy = true
  }
}
```

## Summary

`prevent_destroy` is your Terraform-level safety net for critical infrastructure. Apply it to databases, encryption keys, S3 buckets with important data, DNS zones, and any resource where accidental deletion would cause serious damage. Remember that it only blocks destruction - in-place updates still work normally. Combine it with AWS-level deletion protection for defense in depth. And when you legitimately need to destroy a protected resource, remove the lifecycle rule first, apply, then destroy.

For more on lifecycle management, see our post on [create_before_destroy](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lifecycle-rules-with-create-before-destroy/view) and our overview of [Terraform lifecycle rules](https://oneuptime.com/blog/post/2026-01-24-terraform-lifecycle-rules/view).
