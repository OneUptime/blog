# How to Define a Resource Block in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Resources, Infrastructure as Code, AWS

Description: Learn the anatomy of a Terraform resource block, including resource types, names, arguments, attributes, and how to structure your resource definitions for clarity and maintainability.

---

The resource block is the most fundamental building block in Terraform. Every piece of infrastructure you manage - an EC2 instance, a database, a DNS record, a Kubernetes deployment - is defined as a resource block. Understanding how resource blocks work is essential for writing Terraform configurations.

This post breaks down every part of a resource block, from the basic syntax to nested blocks, references, and organization patterns.

## Basic Resource Block Syntax

A resource block has two labels: the resource type and the resource name. Inside the block, you define the arguments that configure the resource.

```hcl
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

Breaking this down:

- `resource` - The keyword that starts a resource block
- `"aws_instance"` - The resource type. This determines what kind of infrastructure Terraform creates. The prefix before the underscore (`aws`) identifies the provider.
- `"web_server"` - The local name. This is how you reference this resource elsewhere in your configuration. It has no meaning to AWS or any cloud provider.
- `ami` and `instance_type` - Arguments that configure the resource
- `tags` - A map argument

The combination of type and name must be unique within a module. You cannot have two `aws_instance` resources both named `web_server`.

## Resource Types and Providers

The resource type tells Terraform which provider to use and what API to call. The first part of the type name is the provider prefix:

```hcl
# AWS resources start with "aws_"
resource "aws_s3_bucket" "data" { }
resource "aws_vpc" "main" { }
resource "aws_lambda_function" "processor" { }

# Azure resources start with "azurerm_"
resource "azurerm_resource_group" "main" { }
resource "azurerm_virtual_network" "main" { }

# Google Cloud resources start with "google_"
resource "google_compute_instance" "web" { }
resource "google_storage_bucket" "data" { }

# Kubernetes resources start with "kubernetes_"
resource "kubernetes_namespace" "app" { }
resource "kubernetes_deployment" "api" { }
```

Terraform uses the provider prefix to determine which provider plugin handles the resource.

## Arguments vs. Attributes

Arguments are values you set in the configuration. Attributes are values that Terraform learns after creating the resource.

```hcl
resource "aws_instance" "web" {
  # Arguments - you define these
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "web-server"
  }
}

# Attributes - Terraform learns these after creation
output "instance_id" {
  value = aws_instance.web.id  # Assigned by AWS
}

output "public_ip" {
  value = aws_instance.web.public_ip  # Assigned by AWS
}

output "arn" {
  value = aws_instance.web.arn  # Computed by AWS
}
```

You reference a resource's attributes using `<type>.<name>.<attribute>`.

## Required vs. Optional Arguments

Each resource type has required and optional arguments. Required arguments must be specified; optional arguments have defaults.

```hcl
resource "aws_s3_bucket" "data" {
  # Required argument
  bucket = "my-unique-bucket-name"

  # Optional arguments - these have defaults
  force_destroy = false  # Default is false

  tags = {
    Environment = "dev"
  }
}

resource "aws_db_instance" "main" {
  # Required arguments
  engine         = "postgres"
  instance_class = "db.t3.micro"

  # Required if not restoring from snapshot
  allocated_storage = 20
  username          = "admin"
  password          = var.db_password

  # Optional arguments
  engine_version        = "15.4"        # Default: latest
  multi_az              = false          # Default: false
  publicly_accessible   = false          # Default: false
  storage_encrypted     = true
  backup_retention_period = 7
  skip_final_snapshot   = true
}
```

Check the provider documentation for which arguments are required and what the defaults are for optional ones.

## Nested Blocks

Some arguments are defined as nested blocks rather than simple key-value pairs:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Nested block for root volume configuration
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  # Nested block for network interface
  network_interface {
    network_interface_id = aws_network_interface.web.id
    device_index         = 0
  }

  # Nested block for credit specification
  credit_specification {
    cpu_credits = "standard"
  }

  tags = {
    Name = "web-server"
  }
}
```

Nested blocks look like sub-resource definitions. They configure specific aspects of the resource.

Some nested blocks can appear multiple times:

```hcl
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # Multiple ingress blocks
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # Egress block
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
}
```

## Referencing Other Resources

Resources reference each other using the `<type>.<name>.<attribute>` syntax. This creates implicit dependencies.

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

# Subnet references the VPC
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id  # Reference to VPC
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "public-subnet"
  }
}

# Security group references the VPC
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id  # Reference to VPC

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Instance references subnet and security group
resource "aws_instance" "web" {
  ami                    = var.ami_id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id          # Reference to subnet
  vpc_security_group_ids = [aws_security_group.web.id]   # Reference to SG

  tags = {
    Name = "web-server"
  }
}
```

Terraform builds a dependency graph from these references and creates resources in the correct order.

## Using Variables and Locals in Resources

Resources commonly use variables for configurable values and locals for computed values:

```hcl
variable "environment" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

locals {
  name_prefix = "myapp-${var.environment}"
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id  # From a data source
  instance_type = var.instance_type              # From a variable

  tags = merge(local.common_tags, {              # From locals
    Name = "${local.name_prefix}-app"
  })
}
```

## Dynamic Blocks

When the number of nested blocks is not fixed, use `dynamic` blocks:

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  # Generate ingress blocks dynamically
  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Organizing Resource Blocks

For small projects, put related resources in the same file. For larger projects, group by concern:

```text
project/
  main.tf          # Primary resources
  networking.tf    # VPC, subnets, route tables
  security.tf      # Security groups, IAM roles
  database.tf      # RDS instances
  compute.tf       # EC2 instances, ECS services
  storage.tf       # S3 buckets
  variables.tf     # Variable definitions
  outputs.tf       # Output definitions
  locals.tf        # Local values
```

Terraform does not care about filenames - it loads all `.tf` files in the directory. The organization is for humans.

## Summary

Resource blocks are how you tell Terraform what infrastructure to create. Every resource has a type (which determines the provider and API), a name (which identifies it within your configuration), arguments (which configure it), and attributes (which Terraform learns after creation). References between resources create implicit dependencies. Nested blocks configure sub-components. Dynamic blocks handle variable numbers of sub-components. Get comfortable with resource block syntax and you have the foundation for everything else in Terraform.

For more on resource configuration, check out our post on [resource meta-arguments](https://oneuptime.com/blog/post/2026-02-23-how-to-use-resource-meta-arguments-in-terraform/view).
