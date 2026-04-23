# How to Understand Resource Behavior in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Infrastructure as Code, DevOps

Description: A guide to understanding how OpenTofu manages resource lifecycle including creation, updates, replacement, and deletion.

## Introduction

Understanding how OpenTofu manages resources - when it creates, updates, replaces, or destroys them - is fundamental to managing infrastructure safely. OpenTofu tracks resource state and determines the appropriate action by comparing desired and actual states.

Resource Actions

### Create

```hcl
# New resource not in state -> OpenTofu creates it

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Plan output:
# + resource "aws_instance" "web" {
#     + id            = (known after apply)
#     + ami           = "ami-0c55b159cbfafe1f0"
#     + instance_type = "t3.micro"
#   }
# Plan: 1 to add, 0 to change, 0 to destroy.
```

### Update In-Place

```hcl
# Some attributes can be changed without destroying the resource
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.small"  # Changed from t3.micro

  tags = {
    Name = "web-server-v2"  # Tags can also be updated in-place
  }
}

# Plan output:
# ~ resource "aws_instance" "web" {
#     ~ instance_type = "t3.micro" -> "t3.small"
#     ~ tags = {
#         ~ Name = "web-server" -> "web-server-v2"
#       }
#   }
# Plan: 0 to add, 1 to change, 0 to destroy.
```

### Replace (Destroy and Recreate)

```hcl
# Some attribute changes require replacing the resource
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"  # AMI change forces replacement
  instance_type = "t3.micro"
}

# Plan output:
# -/+ resource "aws_instance" "web" {
#     ~ id  = "i-0abc123" -> (known after apply)
#     ~ ami = "ami-0c55b159cbfafe1f0" -> "ami-0123456789abcdef0" # forces replacement
#   }
# Plan: 1 to add, 0 to change, 1 to destroy.
```

### Destroy

```hcl
# Remove from configuration -> OpenTofu destroys it
# (removed from main.tf)
# resource "aws_instance" "web" { ... }

# Plan output:
# - resource "aws_instance" "web" {
#     - ami           = "ami-0c55b159cbfafe1f0" -> null
#     - id            = "i-0abc123" -> null
#     - instance_type = "t3.micro" -> null
#   }
# Plan: 0 to add, 0 to change, 1 to destroy.
```

## "Forces Replacement" Attributes

Not all attribute changes require replacement. Providers define which attributes force replacement:

```hcl
resource "aws_instance" "web" {
  # These can be changed in-place:
  instance_type = "t3.small"  # Stop/start
  tags          = { Name = "new-name" }

  # These FORCE REPLACEMENT (destroy + create):
  ami              = "ami-0123456789abcdef0"  # New AMI
  availability_zone = "us-east-1b"  # Different AZ
}
```

## Computed Attributes

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # These are computed by AWS after creation:
  # id         = (known after apply)
  # public_ip  = (known after apply)
  # private_ip = (known after apply)
}

output "public_ip" {
  # Value is known after apply
  value = aws_instance.web.public_ip
}
```

Resource Dependencies

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  # OpenTofu knows to create VPC first because of this reference
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  # OpenTofu creates subnet before this instance
  subnet_id     = aws_subnet.public.id
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Creation order: aws_vpc.main -> aws_subnet.public -> aws_instance.web
# Destroy order is reversed: aws_instance.web -> aws_subnet.public -> aws_vpc.main
```

## Refresh Behavior

```bash
# OpenTofu refreshes state to detect drift
tofu plan
# Reads actual resource state from provider
# Compares with state file
# Shows what needs to change

# Force refresh
tofu apply -refresh=true  # Default behavior

# Skip refresh for faster plans
tofu plan -refresh=false
```

## Conclusion

Understanding OpenTofu's resource lifecycle - create, update-in-place, replace, and destroy - is essential for predicting infrastructure changes. Pay attention to "forces replacement" in plan output as it means the current resource will be destroyed and a new one created, which may cause downtime. Use lifecycle meta-arguments like `create_before_destroy` to minimize downtime when replacement is necessary.
