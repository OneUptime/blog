# How to Use Preconditions on Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Validation

Description: Learn how to use preconditions in OpenTofu lifecycle blocks to validate inputs and dependencies before a resource is created or updated.

## Introduction

Preconditions are assertions that must be true before a resource is created or updated. If a precondition fails, OpenTofu aborts the plan or apply with an error. Use preconditions to validate that input variables, data sources, and dependencies meet expectations before provisioning resources.

## Basic Precondition

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      condition     = startswith(var.instance_type, "t3.")
      error_message = "Only t3.* instance types are allowed. Got: ${var.instance_type}"
    }
  }
}
```

## Precondition on Data Source

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = [var.ami_owner_account]

  filter {
    name   = "name"
    values = ["acme-app-*"]
  }

  lifecycle {
    precondition {
      condition     = can(regex("^[0-9]{12}$", var.ami_owner_account))
      error_message = "ami_owner_account must be a 12-digit AWS account ID. Got: ${var.ami_owner_account}"
    }
  }
}
```

## Validate Variable Values

```hcl
variable "environment" {
  type = string
}

resource "aws_s3_bucket" "state" {
  bucket = "acme-state-${var.environment}"

  lifecycle {
    precondition {
      condition     = contains(["development", "staging", "production"], var.environment)
      error_message = "environment must be one of: development, staging, production. Got: ${var.environment}"
    }
  }
}
```

## Precondition Validating Cross-Resource Consistency

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = var.subnet_ids

  lifecycle {
    precondition {
      condition     = length(var.subnet_ids) >= 2
      error_message = "RDS subnet group requires at least 2 subnets across different AZs. Got: ${length(var.subnet_ids)}"
    }
  }
}
```

## Precondition on Data Source Results

```hcl
data "aws_vpc" "main" {
  id = var.vpc_id
}

resource "aws_subnet" "private" {
  vpc_id     = data.aws_vpc.main.id
  cidr_block = var.subnet_cidr

  lifecycle {
    precondition {
      condition     = cidrcontains(data.aws_vpc.main.cidr_block, var.subnet_cidr)
      error_message = "Subnet CIDR ${var.subnet_cidr} is not within VPC CIDR ${data.aws_vpc.main.cidr_block}."
    }
  }
}
```

## Multiple Preconditions

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier = var.cluster_name
  engine             = var.engine
  engine_version     = var.engine_version

  lifecycle {
    precondition {
      condition     = var.engine == "aurora-postgresql"
      error_message = "Only aurora-postgresql engine is supported. Got: ${var.engine}"
    }

    precondition {
      condition     = can(regex("^[0-9]+\\.[0-9]+$", var.engine_version))
      error_message = "Engine version must be in format X.Y. Got: ${var.engine_version}"
    }

    precondition {
      condition     = var.deletion_protection || var.environment != "production"
      error_message = "Deletion protection must be enabled for production RDS clusters."
    }
  }
}
```

## Precondition with try()

```hcl
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = var.node_group_name

  lifecycle {
    precondition {
      # Safely handle potential null
      condition     = try(var.disk_size, 20) >= 20
      error_message = "EKS node group disk size must be at least 20 GB."
    }
  }
}
```

## Preconditions vs Variable Validation

```hcl
# Variable validation: runs at plan time, before any resources are read

variable "instance_type" {
  type = string
  validation {
    condition     = startswith(var.instance_type, "t3.")
    error_message = "Must be a t3.* instance type."
  }
}

# Precondition: runs after dependencies are evaluated, can reference data sources
resource "aws_instance" "web" {
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      # Can reference data sources (not possible in variable validation)
      condition     = data.aws_ami.app.architecture == "x86_64"
      error_message = "Selected AMI must be x86_64."
    }
  }
}
```

## Conclusion

Preconditions enforce invariants that must be true before a resource is created or modified. They run during plan, causing early failure with a clear error message before any infrastructure changes occur. Use preconditions to validate input variables, cross-resource consistency, data source results, and business rules. They can reference data sources and other resources, making them more powerful than variable validation for complex checks.
