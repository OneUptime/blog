# How to Use Postconditions on Resources in OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Learn how to use lifecycle postconditions on OpenTofu resources to validate outputs and state after a resource is created or modified.

## Introduction

Postconditions run after OpenTofu evaluates a resource. If a postcondition fails, the operation fails. When a condition can only be checked during apply, OpenTofu may already have created or modified the resource and then stop downstream actions that depend on it. Use postconditions to verify that a resource was created with the expected properties - catching cases where the cloud provider ignores or overrides your configuration.

## Basic Postcondition Syntax

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    postcondition {
      condition     = self.public_ip != null && self.public_ip != ""
      error_message = "EC2 instance was not assigned a public IP address"
    }
  }
}
```

The `self` object refers to the resource instance being validated.

## Common Postcondition Patterns

### Verify Resource Was Created in Expected State

```hcl
resource "aws_db_instance" "main" {
  identifier        = var.db_identifier
  allocated_storage = 20
  engine            = "postgres"
  engine_version    = "14"
  instance_class    = var.instance_class
  username          = var.db_username
  password          = var.db_password
  multi_az          = true

  lifecycle {
    postcondition {
      condition     = self.multi_az == true
      error_message = "RDS instance was not created with Multi-AZ enabled"
    }
    postcondition {
      condition     = self.status == "available"
      error_message = "RDS instance did not reach available status, got: ${self.status}"
    }
  }
}
```

### Verify Assigned Network Configuration

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private.id

  lifecycle {
    postcondition {
      condition     = self.subnet_id == aws_subnet.private.id
      error_message = "Instance was placed in unexpected subnet: ${self.subnet_id}"
    }
    postcondition {
      condition     = self.public_ip == null || self.public_ip == ""
      error_message = "Private instance unexpectedly received a public IP: ${self.public_ip}"
    }
  }
}
```

### Verify Encryption State

```hcl
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  encrypted         = true
  kms_key_id        = aws_kms_key.ebs.arn

  lifecycle {
    postcondition {
      condition     = self.encrypted == true
      error_message = "EBS volume was created without encryption"
    }
    postcondition {
      condition     = self.kms_key_id == aws_kms_key.ebs.arn
      error_message = "EBS volume is using unexpected KMS key: ${self.kms_key_id}"
    }
  }
}
```

### Verify S3 Bucket Versioning

```hcl
resource "aws_s3_bucket" "state" {
  bucket = var.bucket_name

  lifecycle {
    postcondition {
      condition     = self.bucket == var.bucket_name
      error_message = "Bucket created with unexpected name: ${self.bucket}"
    }
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }

  lifecycle {
    postcondition {
      condition     = self.versioning_configuration[0].status == "Enabled"
      error_message = "S3 bucket versioning was not enabled"
    }
  }
}
```

### Validate ARN Format After Creation

```hcl
resource "aws_iam_role" "app" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.assume.json

  lifecycle {
    postcondition {
      condition     = can(regex("^arn:aws:iam::", self.arn))
      error_message = "IAM role ARN does not match expected format: ${self.arn}"
    }
  }
}
```

## Preconditions on Module Outputs

Module outputs can use preconditions to validate that the module returns valid data:

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  value = aws_vpc.main.id

  precondition {
    condition     = can(regex("^vpc-", aws_vpc.main.id))
    error_message = "Module returned invalid VPC ID: ${aws_vpc.main.id}"
  }
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id

  precondition {
    condition     = length(aws_subnet.private[*].id) >= 2
    error_message = "Module must create at least 2 private subnets, got: ${length(aws_subnet.private[*].id)}"
  }
}
```

## Postcondition Failure Behavior

When a postcondition fails, OpenTofu reports an error and stops downstream actions that depend on the failing resource. If the condition is only known during apply, OpenTofu does not undo the resource action it already performed:

```bash
tofu apply

# Error: Resource postcondition failed
#
#   on main.tf line 15, in resource "aws_db_instance" "main":
#   15:       condition     = self.multi_az == true
#
# RDS instance was not created with Multi-AZ enabled
```

## Precondition vs Postcondition

| Aspect | Precondition | Postcondition |
|--------|-------------|---------------|
| When it runs | Before the object is evaluated | After the object is evaluated |
| Purpose | Validate assumptions before evaluation | Validate guarantees after evaluation |
| Self reference | Not available | Available on resource postconditions via `self` |
| On failure | Prevents work on the associated object | Fails the operation and blocks downstream dependent work |

## Conclusion

Postconditions are essential for catching cases where cloud providers silently modify or ignore configuration values. Use `self` to reference the resource's actual post-creation attributes and verify they match expectations. Combining preconditions (validate assumptions before evaluation) with postconditions (validate resource guarantees after evaluation) creates a robust validation layer around your infrastructure resources.
