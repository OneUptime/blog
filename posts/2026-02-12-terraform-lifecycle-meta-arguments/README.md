# How to Use Terraform Lifecycle Rules (create_before_destroy, prevent_destroy)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code

Description: Deep dive into Terraform lifecycle meta-arguments including create_before_destroy, prevent_destroy, ignore_changes, and replace_triggered_by with practical AWS examples.

---

Terraform's default behavior is straightforward: create what's missing, update what's changed, destroy what's been removed. But sometimes that default behavior causes problems. What if destroying a resource before creating its replacement causes downtime? What if someone accidentally removes a database from the config? What if an external process modifies a resource and you don't want Terraform to revert it?

That's where lifecycle rules come in. They let you override Terraform's default behavior for specific resources. There are four lifecycle meta-arguments, and understanding them will save you from some painful mistakes.

## create_before_destroy

By default, Terraform destroys the old resource before creating the new one. For many resources, this means downtime. `create_before_destroy` reverses that order.

Here's a classic example with a security group. If you change the name or description of a security group, Terraform needs to replace it:

```hcl
# Without create_before_destroy, EC2 instances lose their
# security group briefly during replacement
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id
  description = "Application security group"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

With `create_before_destroy`, Terraform creates the new security group first, updates all resources that reference it, then destroys the old one. No gap.

Other common resources that benefit from `create_before_destroy`:

- **ACM certificates** - create the new cert before removing the old one from load balancers
- **Launch templates** - keep the old one active while instances roll over
- **IAM policies** - avoid permission gaps during replacement
- **Parameter groups** - RDS/ElastiCache need the new group ready before switching

Here's the ACM certificate pattern:

```hcl
# ACM certificates should always use create_before_destroy
resource "aws_acm_certificate" "main" {
  domain_name       = "example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

For more on ACM certificates, see our post on [managing ACM certificates with Terraform](https://oneuptime.com/blog/post/2026-02-12-manage-aws-acm-certificates-with-terraform/view).

### When it Doesn't Work

`create_before_destroy` has limitations. Some resources have unique constraints that prevent two instances from existing simultaneously. For example, you can't have two S3 buckets with the same name. Same for IAM roles, DNS records, and many others. In those cases, you need to use `name_prefix` instead of `name`, or accept a brief outage.

## prevent_destroy

`prevent_destroy` is a safety net for resources you never want to accidentally delete. Terraform will refuse to destroy the resource, throwing an error instead.

This is essential for databases, encryption keys, and any stateful resource:

```hcl
# Protect production database from accidental destruction
resource "aws_db_instance" "production" {
  identifier     = "myapp-production"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.large"

  # ... other configuration ...

  lifecycle {
    prevent_destroy = true
  }
}

# Protect KMS keys - losing these means losing encrypted data forever
resource "aws_kms_key" "main" {
  description             = "Production encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  lifecycle {
    prevent_destroy = true
  }
}

# Protect S3 buckets with important data
resource "aws_s3_bucket" "data" {
  bucket = "mycompany-production-data"

  lifecycle {
    prevent_destroy = true
  }
}
```

If someone runs `terraform destroy` or removes the resource from the configuration, Terraform will throw an error like:

```
Error: Instance cannot be destroyed
  resource "aws_db_instance" "production" has lifecycle.prevent_destroy set,
  but the plan calls for this resource to be destroyed.
```

To actually destroy the resource, you'd need to first remove the `prevent_destroy` rule, apply, then destroy. This two-step process is intentional - it makes you think twice.

### When to Use prevent_destroy

Use it on anything that:
- Contains data that can't be recreated (databases, S3 buckets)
- Would cause permanent data loss if destroyed (KMS keys)
- Would cause significant downtime if destroyed (load balancers, DNS zones)

## ignore_changes

`ignore_changes` tells Terraform to ignore modifications to specific attributes. This is useful when external processes (auto-scaling, manual updates, other automation) modify a resource and you don't want Terraform to revert those changes.

The most common use case is ECS service desired count with auto-scaling:

```hcl
# Don't fight with auto-scaling over the desired count
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  lifecycle {
    ignore_changes = [desired_count]
  }
}
```

Without `ignore_changes`, every `terraform apply` would reset `desired_count` back to 3, undoing whatever the auto-scaler had set. That defeats the whole purpose of auto-scaling.

Other common use cases for `ignore_changes`:

```hcl
# Auto Scaling Group - don't override scaling decisions
resource "aws_autoscaling_group" "app" {
  desired_capacity = 2
  min_size         = 1
  max_size         = 10
  # ... other config ...

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

# Lambda function - code deployed separately via CI/CD
resource "aws_lambda_function" "app" {
  function_name = "my-function"
  # ... other config ...

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      last_modified
    ]
  }
}

# Cognito user pool - some attributes can't be changed without replacement
resource "aws_cognito_user_pool" "main" {
  name = "myapp-users"
  # ... other config ...

  lifecycle {
    ignore_changes = [schema]
  }
}
```

You can also ignore all attributes (though this is rarely a good idea):

```hcl
lifecycle {
  ignore_changes = all
}
```

### Warning About ignore_changes

Don't use `ignore_changes` as a way to avoid fixing configuration drift. If something is changing outside Terraform, figure out why and whether that's intentional. `ignore_changes` should be a deliberate choice, not a band-aid.

## replace_triggered_by

Added in Terraform 1.2, `replace_triggered_by` forces a resource to be replaced when another resource or attribute changes. This is useful when Terraform doesn't automatically detect that a dependency change requires replacement.

This forces the ECS service to redeploy when the task definition changes:

```hcl
# Force service redeployment when task definition changes
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  lifecycle {
    replace_triggered_by = [
      aws_ecs_task_definition.app
    ]
  }
}
```

Another common pattern is triggering a null_resource when a dependency changes:

```hcl
# Rerun a provisioner when the configuration changes
resource "null_resource" "deploy" {
  lifecycle {
    replace_triggered_by = [
      aws_lambda_function.app.source_code_hash,
      aws_lambda_function.app.environment
    ]
  }

  provisioner "local-exec" {
    command = "echo 'Deployment triggered'"
  }
}
```

## Combining Lifecycle Rules

You can use multiple lifecycle rules on the same resource:

```hcl
# Production RDS with multiple lifecycle protections
resource "aws_db_instance" "production" {
  identifier     = "myapp-production"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  # ... other configuration ...

  lifecycle {
    # Never accidentally destroy this database
    prevent_destroy = true

    # Don't fight with manual performance tuning
    ignore_changes = [
      instance_class,
    ]

    # If replacement is needed, create new one first
    create_before_destroy = true
  }
}
```

## Preconditions and Postconditions

Terraform 1.2 also added `precondition` and `postcondition` blocks within lifecycle. These validate assumptions about your infrastructure:

```hcl
resource "aws_db_instance" "production" {
  identifier     = "myapp-production"
  engine         = "postgres"
  instance_class = var.db_instance_class
  multi_az       = var.multi_az

  lifecycle {
    precondition {
      condition     = var.environment == "production" ? var.multi_az == true : true
      error_message = "Production databases must have multi_az enabled."
    }

    postcondition {
      condition     = self.status == "available"
      error_message = "Database did not reach available status."
    }
  }
}
```

For more on validation and assertions, see our post on [Terraform check blocks for infrastructure assertions](https://oneuptime.com/blog/post/2026-02-12-terraform-check-blocks-infrastructure-assertions/view).

## Wrapping Up

Lifecycle rules are one of those Terraform features that you don't need until you really need them. `prevent_destroy` saves you from disasters, `create_before_destroy` prevents downtime, `ignore_changes` keeps peace with auto-scaling and external processes, and `replace_triggered_by` fills in the gaps where Terraform's dependency detection falls short. Use them deliberately, document why each one is there, and review them periodically - especially `ignore_changes`, which can mask real configuration drift.
