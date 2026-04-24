# How to Add Preconditions to Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Preconditions, Custom Conditions, Infrastructure as Code, DevOps

Description: A guide to adding preconditions to resources in OpenTofu to validate assumptions before resource creation or modification.

## Introduction

Preconditions in OpenTofu allow you to validate assumptions about input data before a resource is created or modified. If a precondition fails, OpenTofu stops the operation and reports an error, preventing the creation of misconfigured infrastructure.

## Basic Precondition Syntax

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      condition     = can(regex("^ami-", var.ami_id))
      error_message = "The ami_id must start with 'ami-'. Got: ${var.ami_id}"
    }
  }
}
```

## Validating Input Data

```hcl
variable "instance_type" {
  type = string
}

variable "environment" {
  type = string
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      # Enforce that production uses appropriately sized instances
      condition     = var.environment != "prod" || contains(["t3.large", "t3.xlarge", "m5.large"], var.instance_type)
      error_message = "Production environment requires t3.large, t3.xlarge, or m5.large. Got: ${var.instance_type}"
    }

    precondition {
      # Ensure instance type is in allowed list
      condition     = contains(["t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge", "m5.large"], var.instance_type)
      error_message = "Instance type must be one of the approved types. Got: ${var.instance_type}"
    }
  }
}
```

## Preconditions That Reference Data Sources

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  lifecycle {
    precondition {
      # Verify the AMI is recent (not older than 90 days)
      condition     = timecmp(data.aws_ami.ubuntu.creation_date, timeadd(plantimestamp(), "-2160h")) > 0
      error_message = "The selected Ubuntu AMI is more than 90 days old. Please use a more recent image."
    }

    precondition {
      # Verify correct AMI architecture
      condition     = data.aws_ami.ubuntu.architecture == "x86_64"
      error_message = "The AMI must be x86_64 architecture. Got: ${data.aws_ami.ubuntu.architecture}"
    }
  }
}
```

## Cross-Resource Preconditions

```hcl
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.subnet_cidr

  lifecycle {
    precondition {
      # Ensure subnet CIDR is within VPC CIDR
      condition     = cidrcontains(aws_vpc.main.cidr_block, var.subnet_cidr)
      error_message = "Subnet CIDR ${var.subnet_cidr} must be contained within VPC CIDR ${aws_vpc.main.cidr_block}."
    }
  }
}

resource "aws_db_instance" "main" {
  identifier        = "myapp-db"
  engine            = "postgres"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage
  multi_az          = var.db_multi_az

  lifecycle {
    precondition {
      # Validate storage is reasonable
      condition     = var.db_storage >= 20 && var.db_storage <= 65536
      error_message = "DB storage must be between 20 and 65536 GB. Got: ${var.db_storage}"
    }

    precondition {
      # Require multi-AZ for production
      condition     = var.environment != "prod" || var.db_multi_az == true
      error_message = "Production databases must have Multi-AZ enabled."
    }
  }
}
```

## Using can() for Safe Attribute Access

```hcl
variable "tags" {
  type = map(string)
}

resource "aws_instance" "tagged" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags          = var.tags

  lifecycle {
    precondition {
      # Ensure required tags are present
      condition     = can(var.tags["Environment"]) && can(var.tags["Owner"])
      error_message = "Tags must include 'Environment' and 'Owner' keys."
    }

    precondition {
      # Validate environment tag value
      condition     = contains(["dev", "staging", "prod"], lookup(var.tags, "Environment", ""))
      error_message = "The 'Environment' tag must be one of: dev, staging, prod."
    }
  }
}
```

## Multiple Preconditions

```hcl
resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name

  lifecycle {
    precondition {
      # Bucket name length
      condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
      error_message = "Bucket name must be between 3 and 63 characters."
    }

    precondition {
      # Bucket name format
      condition     = can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.bucket_name))
      error_message = "Bucket name must start and end with lowercase letter or number, and contain only lowercase letters, numbers, hyphens, and dots."
    }

    precondition {
      # No consecutive dots
      condition     = !can(regex("\\.\\.", var.bucket_name))
      error_message = "Bucket name must not contain consecutive dots."
    }
  }
}
```

## Preconditions vs Variable Validation

```hcl
# Variable validation: validates an input value before it is used elsewhere

variable "region" {
  type = string
  validation {
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], var.region)
    error_message = "Region must be one of: us-east-1, us-west-2, eu-west-1."
  }
}

# Resource precondition: attaches a check directly to a resource and is evaluated as early as possible
resource "aws_instance" "web" {
  ami           = data.aws_ami.latest.id
  instance_type = "t3.micro"

  lifecycle {
    precondition {
      # Can reference data sources that were already fetched
      condition     = data.aws_ami.latest.state == "available"
      error_message = "The selected AMI is not in 'available' state. Got: ${data.aws_ami.latest.state}"
    }
  }
}
```

## Conclusion

Preconditions in OpenTofu provide a powerful mechanism for catching configuration errors early, before infrastructure is actually created or modified. Variable validation is useful for checking input values, while preconditions let you attach checks directly to resources, data sources, and outputs. Use preconditions to enforce business rules, environment-specific requirements, and cross-resource consistency checks. Multiple preconditions can be added to a single resource, each checking a different aspect of the configuration.
