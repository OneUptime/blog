# How to Understand Terraform Blocks Arguments and Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, DevOps, Configuration

Description: Learn the fundamental building blocks of Terraform configuration files including blocks, arguments, and expressions, with clear examples for each concept.

---

Every Terraform configuration file is built from three core concepts: blocks, arguments, and expressions. If you understand these three things well, you can read and write any Terraform configuration. If you are fuzzy on them, everything else in Terraform feels confusing.

Let's break each one down with concrete examples.

## Blocks

A block is a container for content. It has a type, zero or more labels, and a body enclosed in curly braces. Blocks are the structural foundation of every `.tf` file.

```hcl
# Block type: "resource"
# Labels: "aws_instance" (resource type) and "web" (local name)
# Body: everything inside the curly braces
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

The general syntax is:

```text
<BLOCK_TYPE> "<LABEL_1>" "<LABEL_2>" {
  # Block body
}
```

Different block types require different numbers of labels. Here are the most common block types:

### Top-Level Blocks

```hcl
# terraform block - configures Terraform itself (no labels)
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# provider block - configures a provider (one label: provider name)
provider "aws" {
  region = "us-east-1"
}

# resource block - defines a resource (two labels: type and name)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# data block - defines a data source (two labels: type and name)
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# variable block - defines an input variable (one label: variable name)
variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type"
}

# output block - defines an output value (one label: output name)
output "instance_ip" {
  value       = aws_instance.web.public_ip
  description = "The public IP of the web server"
}

# locals block - defines local values (no labels)
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# module block - calls a module (one label: local name)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

### Nested Blocks

Some blocks contain other blocks. These are nested blocks, and they are part of the parent block's configuration:

```hcl
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web traffic"
  vpc_id      = aws_vpc.main.id

  # Nested block: ingress rule
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Another nested block: egress rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

The `ingress` and `egress` blocks are nested inside the `resource` block. You cannot use them at the top level - they only make sense inside a `aws_security_group` resource.

## Arguments

An argument assigns a value to a name. It appears inside a block body and uses the `=` sign:

```hcl
resource "aws_instance" "web" {
  # Each line with = is an argument
  ami           = "ami-0c55b159cbfafe1f0"    # String argument
  instance_type = "t3.micro"                   # String argument
  count         = 3                            # Number argument
  monitoring    = true                         # Boolean argument

  tags = {                                     # Map argument
    Name = "web-server"
  }
}
```

The left side is the argument name, and the right side is the argument value. The argument name is defined by whatever block type you are in. For `aws_instance`, the valid arguments are `ami`, `instance_type`, `tags`, and so on.

### Required vs. Optional Arguments

Some arguments are required and others are optional. Required arguments must be provided or Terraform will throw an error:

```hcl
resource "aws_instance" "web" {
  # Required - Terraform errors if you omit this
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Optional - Terraform uses defaults if omitted
  monitoring = true
  tags       = { Name = "web" }
}
```

### Meta-Arguments

Some arguments are available on every resource, regardless of type. These are called meta-arguments:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Meta-arguments - available on all resources
  count      = 3                                    # Create multiple instances
  depends_on = [aws_internet_gateway.gw]            # Explicit dependency
  provider   = aws.west                             # Specific provider config
  lifecycle {                                        # Lifecycle behavior
    create_before_destroy = true
  }
}
```

## Expressions

Expressions are the right side of arguments. They represent or compute values. Everything from a simple string literal to a complex transformation is an expression.

### Literal Values

The simplest expressions are literal values:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"   # String literal
  instance_type = "t3.micro"                 # String literal
  count         = 3                          # Number literal
  monitoring    = true                       # Boolean literal
}
```

### References

References point to values defined elsewhere in your configuration:

```hcl
# Reference to a variable
instance_type = var.instance_type

# Reference to another resource's attribute
subnet_id = aws_subnet.public.id

# Reference to a data source
ami = data.aws_ami.ubuntu.id

# Reference to a module output
vpc_id = module.vpc.vpc_id

# Reference to a local value
tags = local.common_tags

# Reference to the current resource's attributes using self
provisioner "local-exec" {
  command = "echo ${self.public_ip}"
}
```

The reference syntax follows a consistent pattern: `<TYPE>.<NAME>.<ATTRIBUTE>`.

### String Interpolation

You can embed expressions inside strings using `${}`:

```hcl
# Interpolate variables into strings
tags = {
  Name = "web-server-${var.environment}"
}

# Interpolate resource attributes
output "connection_string" {
  value = "postgresql://${aws_db_instance.main.address}:5432/mydb"
}
```

### Function Calls

Terraform has a large library of built-in functions:

```hcl
# String functions
name = upper(var.project_name)
path = join("/", ["home", var.username, "config"])

# Collection functions
first_subnet = element(var.subnet_ids, 0)
unique_tags  = distinct(var.tag_list)

# Filesystem functions
user_data = file("${path.module}/scripts/init.sh")

# Type conversion functions
port = tonumber(var.port_string)
```

### Conditional Expressions

The ternary operator lets you choose between two values:

```hcl
# condition ? true_value : false_value
instance_type = var.environment == "production" ? "t3.large" : "t3.micro"
```

### For Expressions

Transform collections inline:

```hcl
# Transform a list
upper_names = [for name in var.names : upper(name)]

# Transform a map
tagged_instances = {
  for key, value in var.instances : key => merge(value, { managed = true })
}
```

## How They All Fit Together

Here is a complete example that shows blocks, arguments, and expressions working together:

```hcl
# Variable BLOCK with arguments that use literal expressions
variable "environment" {
  type        = string         # Literal type expression
  default     = "development"  # Literal string expression
  description = "The deployment environment"

  # Nested BLOCK for validation
  validation {
    # ARGUMENT with a function call EXPRESSION
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "instance_count" {
  type    = number
  default = 1
}

# Locals BLOCK
locals {
  # ARGUMENT with a map literal EXPRESSION
  environment_config = {
    development = { instance_type = "t3.micro",  count = 1 }
    staging     = { instance_type = "t3.small",  count = 2 }
    production  = { instance_type = "t3.medium", count = 3 }
  }

  # ARGUMENT with a lookup EXPRESSION
  config = local.environment_config[var.environment]
}

# Resource BLOCK
resource "aws_instance" "app" {
  # ARGUMENT with a reference EXPRESSION
  ami           = data.aws_ami.ubuntu.id

  # ARGUMENT with a lookup EXPRESSION
  instance_type = local.config.instance_type

  # ARGUMENT with a reference EXPRESSION
  count = local.config.count

  # ARGUMENT with a map EXPRESSION containing string interpolation
  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Output BLOCK
output "instance_ips" {
  # ARGUMENT with a splat EXPRESSION
  value       = aws_instance.app[*].public_ip
  description = "Public IPs of all app instances"
}
```

Every line in this configuration is either a block header, an argument inside a block, or an expression that computes the value for an argument. There is nothing else in Terraform syntax.

## Block Ordering

Terraform does not care about the order of blocks in your files. These two are equivalent:

```hcl
# Order 1
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

# Order 2 (subnet defined first) - same result
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
}
```

Terraform builds a dependency graph from the references in your expressions, not from the order of blocks in your files. This is one of the things that makes Terraform configurations declarative rather than procedural.

However, within a block, argument order also does not matter to Terraform but does matter for readability. The convention is to put the most important arguments first and meta-arguments last.

## Summary

Terraform configurations are built from just three concepts: blocks provide structure, arguments assign values within blocks, and expressions compute those values. Blocks can be nested inside other blocks. Arguments always use the `=` sign. Expressions range from simple literals to complex transformations with functions, conditionals, and loops. Master these three concepts, and the rest of Terraform becomes much more approachable.
