# How to Call a Module from Another Directory in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Infrastructure as Code, DevOps, Local Modules

Description: Learn how to reference and call Terraform modules from local directories using relative and absolute paths, including best practices for project organization.

---

The simplest way to use Terraform modules is to call them from local directories within your project. No remote registries, no Git URLs, no network dependencies. Just a `source` path pointing to a folder on your filesystem. This is how most teams start with modules, and for many projects it is all you ever need.

This guide covers how to reference local modules, common directory layouts, and the gotchas you should watch out for.

## Basic Syntax

To call a module from another directory, you use a relative path in the `source` argument:

```hcl
# main.tf - Call a module in a subdirectory
module "networking" {
  source = "./modules/networking"

  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

The path is relative to the file where the `module` block is defined. The `./` prefix means "start from the current directory."

## Directory Layout Options

There are several common ways to organize modules within a project.

### Flat Modules Directory

The most common pattern - all modules live under a `modules/` directory at the project root:

```
infrastructure/
  main.tf
  variables.tf
  outputs.tf
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
```

Calling these from the root:

```hcl
# infrastructure/main.tf

module "networking" {
  source = "./modules/networking"
  # ... variables
}

module "compute" {
  source = "./modules/compute"
  # ... variables
}

module "database" {
  source = "./modules/database"
  # ... variables
}
```

### Nested Modules

Some modules contain sub-modules for internal use:

```
infrastructure/
  main.tf
  modules/
    ecs-service/
      main.tf
      variables.tf
      outputs.tf
      modules/
        task-definition/
          main.tf
          variables.tf
          outputs.tf
        security-group/
          main.tf
          variables.tf
          outputs.tf
```

The parent module calls its sub-modules using relative paths from its own directory:

```hcl
# modules/ecs-service/main.tf

module "task_definition" {
  source = "./modules/task-definition"

  service_name = var.service_name
  cpu          = var.cpu
  memory       = var.memory
}

module "security_group" {
  source = "./modules/security-group"

  vpc_id       = var.vpc_id
  service_name = var.service_name
  port         = var.container_port
}
```

### Sibling Directory References

You can also reference modules in sibling directories using `../`:

```
project/
  environments/
    dev/
      main.tf      # Calls ../../modules/networking
    staging/
      main.tf      # Calls ../../modules/networking
    prod/
      main.tf      # Calls ../../modules/networking
  modules/
    networking/
      main.tf
    compute/
      main.tf
```

```hcl
# environments/dev/main.tf

module "networking" {
  # Go up two levels, then into modules/networking
  source = "../../modules/networking"

  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
}

module "compute" {
  source = "../../modules/compute"

  subnet_ids  = module.networking.private_subnet_ids
  environment = "dev"
}
```

## A Complete Working Example

Let us walk through a full example with a networking module and a root configuration that calls it.

First, the module:

```hcl
# modules/networking/variables.tf

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 2
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 2
}
```

```hcl
# modules/networking/main.tf

# Fetch available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count = var.public_subnet_count

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.environment}-public-${count.index}"
    Environment = var.environment
    Tier        = "public"
  }
}

resource "aws_subnet" "private" {
  count = var.private_subnet_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 100)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.environment}-private-${count.index}"
    Environment = var.environment
    Tier        = "private"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name        = "${var.environment}-igw"
    Environment = var.environment
  }
}
```

```hcl
# modules/networking/outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "ID of the internet gateway"
  value       = aws_internet_gateway.this.id
}
```

Now call it from the root:

```hcl
# main.tf (root module)

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Call the local networking module
module "network" {
  source = "./modules/networking"

  vpc_cidr             = "10.0.0.0/16"
  environment          = "dev"
  public_subnet_count  = 2
  private_subnet_count = 2
}

# Use the module's outputs in other resources
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = module.network.public_subnet_ids[0]

  tags = {
    Name = "web-server"
  }
}
```

## The path.module and path.root References

Inside a module, you often need to reference files relative to the module itself (not the root configuration). Terraform provides path references for this:

```hcl
# Inside a module - reference files relative to the module directory
resource "aws_iam_policy" "this" {
  name   = "my-policy"
  # path.module points to the directory where THIS .tf file lives
  policy = file("${path.module}/policies/access-policy.json")
}

# path.root points to the root module directory (where terraform is run)
locals {
  project_root = path.root
}
```

This distinction is important. If your module is at `./modules/iam/` and it needs to read `./modules/iam/policies/access-policy.json`, use `path.module`. If you used `path.root`, it would look in the wrong directory.

## When to Use Local Modules vs Remote

Local modules are the right choice when:

- The modules are specific to this project and will not be shared
- You are iterating quickly on module design
- You want changes to propagate immediately without versioning overhead
- Your team works in a monorepo

Remote modules (Git, registry, S3) are better when:

- Multiple projects or teams need the same module
- You need version pinning to prevent breaking changes
- The module is mature and changes infrequently

## Things to Watch Out For

**Circular references.** Module A cannot call Module B if Module B already calls Module A. Terraform will detect this and throw an error.

**Terraform init after adding modules.** Every time you add a new `module` block or change the `source`, you need to run `terraform init` again. Terraform needs to initialize the module.

**State paths.** Resources inside a module are tracked in state with the module prefix: `module.networking.aws_vpc.this`. If you rename the module block from `module "networking"` to `module "network"`, Terraform will think the old resources should be destroyed and new ones created. Use `moved` blocks to handle renames safely:

```hcl
# Tell Terraform that the module was renamed, not replaced
moved {
  from = module.networking
  to   = module.network
}
```

## Summary

Calling a module from a local directory is the most straightforward way to organize Terraform code. Use `source = "./path/to/module"` for subdirectories, `source = "../path/to/module"` for sibling directories, and lean on `path.module` inside the module for file references. Keep your module directories well-organized with the standard file layout, and remember to run `terraform init` whenever you add or change module sources. For sharing modules across projects, consider [Git repositories](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-git-repository-in-terraform/view) or the [Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view).
