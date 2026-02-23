# How to Write Comments in Terraform Configuration Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Best Practices, Documentation

Description: Learn the different comment styles available in Terraform HCL files, when to use each type, and best practices for writing helpful comments in your infrastructure code.

---

Comments in Terraform files might seem like a basic topic, but getting them right matters more than you think. Good comments in infrastructure code can prevent someone from accidentally deleting a production database. Bad comments, or worse, no comments, leave your team guessing about why things are configured the way they are.

Terraform's configuration language HCL supports three different comment styles, and each has its place.

## The Three Comment Styles

### Single-Line Comments with #

The hash character `#` starts a single-line comment. Everything after the `#` on that line is ignored by Terraform.

```hcl
# This is a single-line comment
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # AMI for Ubuntu 22.04 in us-east-1
  instance_type = "t3.micro"               # Smallest general-purpose instance
}
```

This is the most common and recommended comment style in Terraform. HashiCorp's own documentation and examples use `#` almost exclusively.

### Single-Line Comments with //

Double slashes also create single-line comments, just like in C, Java, or JavaScript:

```hcl
// This also works as a single-line comment
resource "aws_s3_bucket" "logs" {
  bucket = "my-app-logs"  // Bucket for application logs
}
```

While this is valid HCL, the Terraform community and HashiCorp both prefer `#`. If you run `terraform fmt`, it will not convert `//` to `#`, but the style guide recommends `#`. I suggest sticking with `#` for consistency.

### Multi-Line Comments with /* */

For longer comments that span multiple lines, use the C-style block comment:

```hcl
/*
  This VPC is the foundation of our production network.
  It uses a /16 CIDR block which gives us 65,536 IP addresses.
  Subnets are allocated as follows:
    - 10.0.0.0/24 to 10.0.9.0/24: Public subnets
    - 10.0.10.0/24 to 10.0.19.0/24: Private subnets
    - 10.0.20.0/24 to 10.0.29.0/24: Database subnets
*/
resource "aws_vpc" "production" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "production-vpc"
  }
}
```

Multi-line comments cannot be nested. This is invalid:

```hcl
/* Outer comment
  /* Inner comment - THIS BREAKS */
*/
```

## When to Comment (and When Not To)

### Comment the Why, Not the What

The configuration itself tells you what. Comments should explain why:

```hcl
# BAD - states the obvious
# Create an S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# GOOD - explains the reasoning
# We use a separate bucket for audit logs to comply with SOC2
# retention requirements. The lifecycle policy in the bucket
# configuration ensures 7-year retention.
resource "aws_s3_bucket" "audit_logs" {
  bucket = "my-audit-logs"
}
```

### Comment Non-Obvious Values

When a value looks arbitrary, explain it:

```hcl
resource "aws_instance" "worker" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "r5.2xlarge"  # Memory-optimized for the ETL batch jobs

  root_block_device {
    volume_size = 200  # Needs 150GB+ for temporary ETL data, added 50GB buffer
  }

  # Port 9090 is used by our internal metrics collector
  # Do not change without updating the monitoring team
  vpc_security_group_ids = [aws_security_group.worker.id]
}
```

### Comment Workarounds and Hacks

Every codebase has workarounds. Document them so nobody accidentally "fixes" them:

```hcl
# WORKAROUND: The AWS provider has a bug where updating the
# description field forces replacement of the security group.
# We use lifecycle ignore_changes to prevent this.
# See: https://github.com/hashicorp/terraform-provider-aws/issues/12345
resource "aws_security_group" "api" {
  name        = "api-sg"
  description = "API security group"  # Do not change this value
  vpc_id      = aws_vpc.main.id

  lifecycle {
    ignore_changes = [description]
  }
}
```

### Comment Dependencies That Are Not Obvious

```hcl
# The NAT gateway must exist before private subnet route tables
# can route traffic to the internet. Although Terraform infers
# this dependency through the route table resource, we add an
# explicit depends_on here because the ENI attachment happens
# asynchronously and sometimes the route is created before
# the NAT gateway is fully operational.
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id

  depends_on = [aws_nat_gateway.main]
}
```

## Comment Patterns for Different Block Types

### Variable Blocks

```hcl
# The CIDR block for the VPC. We use /16 to allow room for
# growth. Each environment gets its own /16 range:
#   - Development: 10.0.0.0/16
#   - Staging:     10.1.0.0/16
#   - Production:  10.2.0.0/16
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"  # description is the official doc

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}
```

Note: the `description` argument in variables and outputs is Terraform's built-in way to document things. It shows up in `terraform plan` output and generated documentation. Use comments for additional context that does not fit in a short description.

### Module Blocks

```hcl
# EKS cluster for running production workloads.
# We pin to a specific module version to avoid unexpected
# changes during terraform apply. Always test module upgrades
# in staging first.
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"  # Tested and approved 2024-01-15

  cluster_name    = "production"
  cluster_version = "1.28"  # AWS EKS supported version, EOL: 2024-11

  # Node group configuration based on our load testing results
  # from Q4 2023. 3x m5.xlarge handles peak traffic of 10k req/s.
  eks_managed_node_groups = {
    general = {
      instance_types = ["m5.xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 3
    }
  }
}
```

### Output Blocks

```hcl
# Exposed for use by the application deployment pipeline.
# The CI/CD system reads this output to configure kubectl.
output "cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster API endpoint"
}
```

## Commenting Out Code

A common use of comments is temporarily disabling resources. This works, but be careful:

```hcl
# Temporarily disabled while investigating the billing spike
# TODO(jane): Re-enable after 2024-02-01 or remove if not needed
#
# resource "aws_cloudwatch_metric_alarm" "high_cpu" {
#   alarm_name          = "high-cpu-utilization"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = "2"
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/EC2"
#   period              = "120"
#   statistic           = "Average"
#   threshold           = "80"
# }
```

If you are commenting out a resource that already exists in your state, remember that Terraform does not know about commented-out code. On the next apply, it will try to destroy that resource because it no longer appears in the configuration. A safer approach is to use `count = 0` or remove it from state first:

```hcl
# Disabled - set count to 0 instead of commenting out
# to make the intent clear and prevent accidental deletion
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = 0  # Temporarily disabled - investigating billing spike

  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  # ... rest of config
}
```

## terraform fmt and Comments

When you run `terraform fmt`, it formats your code but leaves comments in place. However, it does adjust the alignment of inline comments to match the surrounding code:

```hcl
# Before terraform fmt
resource "aws_instance" "web" {
  ami = "ami-abc123" # The AMI
  instance_type = "t3.micro" # Instance type
}

# After terraform fmt
resource "aws_instance" "web" {
  ami           = "ami-abc123"  # The AMI
  instance_type = "t3.micro"   # Instance type
}
```

The inline comments get aligned with the formatted arguments, which keeps things tidy.

## Team Conventions

Establish and document your team's commenting conventions. Here is a reasonable starting point:

```hcl
# File header comment - describes the purpose of this file
# and any important context about the resources it contains.

# Section comments separate logical groups of resources.
# Use these to break up long files.

# ============================================================
# Networking
# ============================================================

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"  # Inline comment for specific values
}

# TODO comments for tracking work items
# TODO(username): Description of what needs to be done

# FIXME comments for known issues
# FIXME: This hardcoded AMI needs to be replaced with a data source

# WARNING/NOTE comments for critical information
# WARNING: Changing this value will cause downtime
# NOTE: This resource is shared across all environments
```

## Summary

Terraform supports three comment styles: `#` for single-line (preferred), `//` for single-line (less common), and `/* */` for multi-line blocks. The most important thing about comments is not the syntax but the content. Comment the why, not the what. Document workarounds, non-obvious values, and anything that would make a colleague pause and wonder. Use the `description` argument for official documentation on variables and outputs, and use comments for the additional context that does not fit there. And if you are going to comment out a resource, remember that Terraform will try to destroy it on the next apply.
