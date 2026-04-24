# How to Use Preconditions on Resources in OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Learn how to use lifecycle preconditions on OpenTofu resources to validate inputs and state before a resource is created or modified.

## Introduction

Resource preconditions are evaluated as early as possible, usually during planning, before a resource is created or modified. If a condition depends on unknown values, OpenTofu defers the check until apply. If a precondition fails, the plan or apply is rejected with an error. Use preconditions to validate that inputs, variables, or related resource states meet requirements before making changes.

## Basic Precondition Syntax

```hcl
resource "aws_db_instance" "main" {
  # ... resource configuration ...

  lifecycle {
    precondition {
      condition     = var.db_password != "" && length(var.db_password) >= 16
      error_message = "Database password must be at least 16 characters long"
    }
  }
}
```

## Common Precondition Patterns

### Validate Variable Values

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      condition     = contains(["t3.micro", "t3.small", "t3.medium", "t3.large"], var.instance_type)
      error_message = "Instance type must be t3.micro, t3.small, t3.medium, or t3.large. Got: ${var.instance_type}"
    }
  }
}
```

### Validate Data Source Results

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id

  lifecycle {
    precondition {
      condition     = data.aws_ami.ubuntu.root_device_type == "ebs"
      error_message = "AMI must use EBS root device, got: ${data.aws_ami.ubuntu.root_device_type}"
    }
  }
}
```

### Validate Workspace-Specific Requirements

```hcl
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    precondition {
      condition = (
        terraform.workspace != "production" ||
        var.db_instance_class == "db.r5.large"
      )
      error_message = "Production database must use db.r5.large instance class"
    }
  }
}
```

### Validate Cross-Resource Dependencies

```hcl
resource "aws_instance" "web" {
  ami       = var.ami_id
  subnet_id = aws_subnet.public.id

  lifecycle {
    precondition {
      condition     = aws_subnet.public.vpc_id == var.expected_vpc_id
      error_message = "Subnet ${aws_subnet.public.id} is not in the expected VPC ${var.expected_vpc_id}"
    }
  }
}
```

### Enforce Encryption Requirements

```hcl
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = var.volume_size
  encrypted         = var.encrypt_volume

  lifecycle {
    precondition {
      condition     = var.encrypt_volume == true
      error_message = "EBS volumes must be encrypted. Set encrypt_volume = true"
    }
  }
}
```

## Preconditions in Modules

Preconditions in modules provide useful error messages to module callers:

```hcl
# modules/rds/main.tf

variable "instance_class" {
  type = string
}

variable "is_production" {
  type    = bool
  default = false
}

resource "aws_db_instance" "main" {
  instance_class = var.instance_class
  # ...

  lifecycle {
    precondition {
      condition = !var.is_production || startswith(var.instance_class, "db.r")
      error_message = "Production databases require memory-optimized instance classes (db.r* family), got: ${var.instance_class}"
    }
  }
}
```

## Precondition Failure Output

```bash
tofu plan

# Error: Resource precondition failed
#
#   on main.tf line 25, in resource "aws_db_instance" "main":
#   25:       condition = !var.is_production || startswith(var.instance_class, "db.r")
#     ├────────────────
#     │ var.instance_class is "db.t3.micro"
#     │ var.is_production is true
#
# Production databases require memory-optimized instance classes (db.r* family), got: db.t3.micro
```

## Conclusion

Preconditions are powerful gatekeepers that prevent incorrect configurations from reaching your infrastructure. Use them to validate inputs at the resource level, check data source results, and enforce workspace-specific requirements. Unlike variable validation, which is declared on an input variable, preconditions are declared on the resource itself and evaluated in that resource's context, making cross-resource and context-aware validation easier to place where the assumption matters.
