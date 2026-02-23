# How to Reference Input Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Infrastructure as Code, DevOps

Description: Learn how to reference input variables throughout your Terraform configuration using the var prefix, including in resources, modules, locals, and expressions.

---

Input variables are how you parameterize your Terraform configurations. You define them once, then reference them wherever you need their values. This keeps your code flexible and reusable across different environments, accounts, and use cases.

This post focuses specifically on the mechanics of referencing input variables - the `var.<name>` syntax and all the places you can use it.

## The var Prefix

Every input variable in Terraform is referenced using the `var` prefix:

```hcl
# Define a variable
variable "instance_type" {
  description = "The EC2 instance type to use"
  type        = string
  default     = "t3.micro"
}

# Reference it with var.<name>
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type  # reference the variable
}
```

That is the whole pattern. Declare with `variable`, reference with `var.`. Simple enough, but there are many contexts where you will use this, so let us walk through them.

## Referencing Variables in Resource Arguments

The most common use case is passing variable values directly to resource arguments:

```hcl
variable "region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "instance_count" {
  type    = number
  default = 2
}

# Use variables in the provider configuration
provider "aws" {
  region = var.region
}

# Use variables in resource arguments
resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Environment = var.environment
    Name        = "app-${var.environment}-${count.index}"
  }
}
```

## Referencing Variables in String Interpolation

When you need to embed a variable value inside a larger string, use the `${}` interpolation syntax:

```hcl
variable "project_name" {
  type    = string
  default = "myapp"
}

variable "environment" {
  type    = string
  default = "prod"
}

resource "aws_s3_bucket" "data" {
  # Interpolate variables into a string
  bucket = "${var.project_name}-${var.environment}-data"
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
  # ... other configuration
  engine         = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  username       = "admin"
  password       = var.db_password  # no interpolation needed for standalone use
}
```

Note that when a variable is the entire value (not embedded in a string), you do not need the interpolation syntax. Just use `var.name` directly.

## Referencing Complex Variable Types

Variables can be maps, lists, and objects. The way you reference them depends on the type.

### Lists

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Reference a specific element by index
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]  # index into the list
}
```

### Maps

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

variable "environment" {
  type    = string
  default = "dev"
}

# Look up a value from the map
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_types[var.environment]  # map lookup
}
```

### Objects

```hcl
variable "database_config" {
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "postgres"
    instance_class = "db.t3.micro"
    storage_gb     = 20
    multi_az       = false
  }
}

# Reference individual fields of the object
resource "aws_db_instance" "main" {
  engine            = var.database_config.engine
  instance_class    = var.database_config.instance_class
  allocated_storage = var.database_config.storage_gb
  multi_az          = var.database_config.multi_az
  username          = "admin"
  password          = "changeme"
}
```

## Referencing Variables in Local Values

Local values are a great place to transform or combine variables before using them:

```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "team" {
  type = string
}

# Combine variables into local values
locals {
  # Build a naming prefix from variables
  name_prefix = "${var.project_name}-${var.environment}"

  # Build common tags from variables
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Team        = var.team
    ManagedBy   = "terraform"
  }
}

# Then use the locals in resources
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app"
  })
}
```

## Referencing Variables in Module Calls

Variables flow down into modules as input arguments:

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "environment" {
  type = string
}

# Pass variables into a module
module "networking" {
  source = "./modules/networking"

  vpc_cidr = var.vpc_cidr        # pass the variable through
  env_name = var.environment     # variable names don't have to match
}
```

## Referencing Variables in Conditional Expressions

Variables work naturally in conditional (ternary) expressions:

```hcl
variable "environment" {
  type = string
}

variable "enable_monitoring" {
  type    = bool
  default = false
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"
  monitoring    = var.enable_monitoring

  # Conditionally set the count
  count = var.environment == "production" ? 3 : 1
}
```

## Referencing Variables in for Expressions

You can iterate over variable values using `for` expressions:

```hcl
variable "users" {
  type = list(object({
    name  = string
    role  = string
  }))
  default = [
    { name = "alice", role = "admin" },
    { name = "bob", role = "developer" },
    { name = "carol", role = "developer" },
  ]
}

# Filter and transform variable values
locals {
  # Get only admin users
  admin_users = [for u in var.users : u.name if u.role == "admin"]

  # Build a map from the list
  user_roles = { for u in var.users : u.name => u.role }
}
```

## Variables You Cannot Reference

There are a few places where `var` references are not allowed:

- Inside `variable` blocks themselves (a variable cannot reference another variable in its default value)
- In `backend` configuration blocks (backend config is evaluated before variables)
- In `provider` `version` constraints

```hcl
# This does NOT work - variables can't reference other variables in defaults
variable "base_cidr" {
  default = "10.0.0.0"
}

variable "vpc_cidr" {
  default = "${var.base_cidr}/16"  # ERROR: variables can't be used here
}

# Instead, use a local
locals {
  vpc_cidr = "${var.base_cidr}/16"  # this works fine
}
```

## Wrapping Up

The `var.<name>` reference is one of the most frequently used expressions in Terraform. It works in resource arguments, string interpolation, locals, conditionals, loops, and module calls. Understanding how to reference variables of different types - strings, numbers, lists, maps, and objects - gives you the tools to write flexible, parameterized infrastructure code.

For more on how variables work with other Terraform references, see [How to Reference Local Values in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-local-values/view) and [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view).
