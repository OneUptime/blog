# How to Exclude Resources from Terraform Destroy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Destroy, Resource Protection, Infrastructure as Code, Safety

Description: Learn multiple strategies to exclude specific resources from terraform destroy operations, protecting critical infrastructure like databases and storage from accidental deletion.

---

Running `terraform destroy` is one of the most dangerous operations in infrastructure management. It tears down everything in your state file. But sometimes you need to destroy most of your infrastructure while keeping specific resources alive - a production database, an S3 bucket with years of data, or a VPC shared with other teams. Terraform provides several mechanisms to protect resources from destruction.

This guide covers every approach to excluding resources from destroy operations, from lifecycle rules to state manipulation.

## Using prevent_destroy Lifecycle Rule

The most straightforward protection is the `prevent_destroy` lifecycle rule:

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.large"
  username       = "admin"
  password       = var.db_password

  skip_final_snapshot = false
  final_snapshot_identifier = "production-final-snapshot"

  lifecycle {
    # Terraform will refuse to destroy this resource
    prevent_destroy = true
  }
}
```

When you run `terraform destroy`, Terraform will stop with an error:

```text
Error: Instance cannot be destroyed

  on main.tf line 1:
   1: resource "aws_db_instance" "production" {

Resource aws_db_instance.production has lifecycle.prevent_destroy set, but
the plan calls for this resource to be destroyed. To avoid this error and
continue with the plan, either disable lifecycle.prevent_destroy or reduce
the scope of the plan using the -target flag.
```

This blocks the entire destroy operation, not just the protected resource. Nothing gets destroyed.

### Limitations of prevent_destroy

- It blocks the entire `terraform destroy`. You cannot destroy other resources while this protection is in place.
- It does not prevent the resource from being destroyed if you remove the resource block from the configuration.
- To actually destroy the resource, you must first remove the `prevent_destroy` setting.

## Using -target to Destroy Specific Resources

Instead of destroying everything, target only the resources you want to remove:

```bash
# Destroy only specific resources
terraform destroy -target=aws_instance.web
terraform destroy -target=aws_instance.worker
terraform destroy -target=module.application
```

Everything not targeted survives. This is the inverse of protection - instead of marking what to keep, you specify what to remove.

```bash
# Destroy multiple specific resources
terraform destroy \
  -target=aws_instance.web \
  -target=aws_ecs_service.app \
  -target=aws_lb.public
```

### Targeting Modules for Destruction

```bash
# Destroy an entire module but keep everything else
terraform destroy -target=module.staging_environment

# Destroy specific resources within a module
terraform destroy -target=module.app.aws_ecs_service.main
```

## Removing Resources from State Before Destroy

If you want to destroy most resources but keep a few, you can temporarily remove the protected ones from state:

```bash
# Step 1: Remove the resource from Terraform state
# This does NOT destroy the actual resource
terraform state rm aws_db_instance.production
terraform state rm aws_s3_bucket.data

# Step 2: Now destroy everything else
terraform destroy

# Step 3: Re-import the preserved resources (if needed later)
terraform import aws_db_instance.production production-database
terraform import aws_s3_bucket.data company-data-bucket
```

This works but is manual and error-prone. You need to remember to re-import the resources afterward.

## Using the removed Block

Terraform 1.7 introduced the `removed` block, which is a cleaner way to stop managing resources:

```hcl
# Instead of the resource block, use removed
removed {
  from = aws_db_instance.production

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_s3_bucket.data

  lifecycle {
    destroy = false
  }
}
```

After applying this change, the resources are removed from state without being destroyed. Then `terraform destroy` will not touch them because they are no longer tracked.

## Separating Critical Resources into a Different State

The most robust approach is to keep critical resources in a separate Terraform configuration with its own state file:

```text
# Project structure
infrastructure/
  shared/          # Never destroyed
    main.tf        # VPC, subnets, databases
    terraform.tfstate

  application/     # Can be destroyed safely
    main.tf        # EC2, ECS, Lambda
    terraform.tfstate
```

```hcl
# shared/main.tf - resources that should never be destroyed
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_db_instance" "production" {
  identifier     = "production-database"
  engine         = "postgres"
  instance_class = "db.r5.large"
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "db_endpoint" {
  value = aws_db_instance.production.endpoint
}
```

```hcl
# application/main.tf - resources that can be torn down
data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "my-state"
    key    = "shared/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = data.terraform_remote_state.shared.outputs.vpc_id
}
```

Now you can safely run `terraform destroy` in the `application/` directory without affecting anything in `shared/`.

## Using a Destroy Script

For teams that frequently need selective destruction, a wrapper script can help:

```bash
#!/bin/bash
# selective-destroy.sh
# Destroy everything except protected resources

# Define resources to keep
PROTECTED=(
  "aws_db_instance.production"
  "aws_s3_bucket.data"
  "aws_vpc.main"
)

# Build the target list (everything NOT protected)
TARGETS=""
while IFS= read -r resource; do
  skip=false
  for protected in "${PROTECTED[@]}"; do
    if [[ "$resource" == "$protected"* ]]; then
      skip=true
      break
    fi
  done
  if [ "$skip" = false ]; then
    TARGETS="$TARGETS -target=$resource"
  fi
done < <(terraform state list)

# Show what will be destroyed
echo "Will destroy: $TARGETS"
echo "Will keep: ${PROTECTED[*]}"
read -p "Continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  terraform destroy $TARGETS
fi
```

## Combining Approaches

In practice, you often combine multiple strategies:

```hcl
# 1. Use prevent_destroy for critical production resources
resource "aws_db_instance" "production" {
  identifier     = "production-database"
  engine         = "postgres"
  instance_class = "db.r5.large"

  lifecycle {
    prevent_destroy = true
  }
}

# 2. Keep shared infrastructure in a separate state
# (in a different Terraform workspace/directory)

# 3. Use the removed block for resources transitioning out
removed {
  from = aws_instance.legacy_app

  lifecycle {
    destroy = false
  }
}
```

## AWS-Level Protection

Beyond Terraform, you can add protection at the AWS level:

### S3 Bucket Versioning and MFA Delete

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "critical-data"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"  # Requires MFA to delete
  }
}
```

### RDS Deletion Protection

```hcl
resource "aws_db_instance" "production" {
  identifier          = "production-database"
  engine              = "postgres"
  instance_class      = "db.r5.large"
  deletion_protection = true  # AWS-level protection

  lifecycle {
    prevent_destroy = true  # Terraform-level protection
  }
}
```

### EC2 Termination Protection

```hcl
resource "aws_instance" "critical" {
  ami                     = "ami-0c55b159cbfafe1f0"
  instance_type           = "t3.large"
  disable_api_termination = true  # AWS will refuse to terminate

  lifecycle {
    prevent_destroy = true
  }
}
```

Even if Terraform tries to destroy these resources, AWS itself will refuse the operation. This provides a second layer of defense.

## What Happens After Selective Destruction

After selectively destroying resources, your Terraform state and configuration may be inconsistent. Clean up by:

1. Running `terraform plan` to see the current state
2. Updating your `.tf` files to remove references to destroyed resources
3. Running `terraform plan` again to confirm a clean state

```bash
# After destroying some resources
terraform plan
# Review any planned changes

# If there are configuration references to destroyed resources, fix them
# Then verify
terraform plan
# Should show either "No changes" or only expected changes
```

## Conclusion

Protecting resources from `terraform destroy` requires a deliberate strategy. For individual critical resources, `prevent_destroy` provides a quick safety net. For broader protection, separating resources into different state files is the most reliable approach. The `-target` flag and state removal techniques work for one-off situations. AWS-level protections like deletion protection and termination protection add an extra safety layer. The best approach combines multiple strategies to ensure that accidental destruction simply cannot happen to your most important infrastructure.

For related resource management techniques, see our guide on [how to handle resources with computed attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-computed-attributes/view).
