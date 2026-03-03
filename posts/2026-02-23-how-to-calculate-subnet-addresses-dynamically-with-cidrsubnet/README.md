# How to Calculate Subnet Addresses Dynamically with cidrsubnet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Networking, CIDR, Subnetting, Cloud Architecture

Description: Learn advanced techniques for dynamically calculating subnet addresses using Terraform's cidrsubnet function for flexible, reusable network architectures.

---

Hardcoding subnet CIDR blocks is one of the most common mistakes in Terraform configurations. It makes your code brittle, hard to reuse across environments, and a nightmare to maintain when network requirements change. Dynamic subnet calculation with `cidrsubnet` solves all of these problems by deriving every subnet from a single parent CIDR variable.

## The Problem with Static Subnets

Consider a typical static subnet setup:

```hcl
# Fragile - every CIDR is hardcoded
resource "aws_subnet" "public_a" {
  cidr_block = "10.0.0.0/24"
}

resource "aws_subnet" "public_b" {
  cidr_block = "10.0.1.0/24"
}

resource "aws_subnet" "private_a" {
  cidr_block = "10.0.10.0/24"
}

resource "aws_subnet" "private_b" {
  cidr_block = "10.0.11.0/24"
}
```

If you want to deploy this in a new environment with a different VPC CIDR (say `172.16.0.0/16`), you would need to change every single subnet definition. With dynamic calculation, you change one variable and everything adapts.

## Building a Dynamic Network Module

Let's build a reusable networking module that calculates all subnets dynamically.

### Step 1: Define the Input Variables

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  # No default - each environment provides its own
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "subnet_newbits" {
  description = "Number of additional bits for subnet prefix"
  type        = number
  default     = 8  # Creates /24 subnets from a /16 VPC
}
```

### Step 2: Calculate Subnet CIDRs Dynamically

```hcl
locals {
  az_count = length(var.availability_zones)

  # Calculate public subnet CIDRs
  # Subnets 0 through (az_count - 1) are public
  public_subnets = {
    for idx, az in var.availability_zones :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx)
  }

  # Calculate private subnet CIDRs
  # Subnets start at az_count to avoid overlap with public subnets
  private_subnets = {
    for idx, az in var.availability_zones :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + local.az_count)
  }

  # Calculate database subnet CIDRs
  # Subnets start at 2 * az_count
  database_subnets = {
    for idx, az in var.availability_zones :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + (local.az_count * 2))
  }
}
```

### Step 3: Create the Resources

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value
  availability_zone       = each.key
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${each.key}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  tags = {
    Name = "private-${each.key}"
    Tier = "private"
  }
}

resource "aws_subnet" "database" {
  for_each = local.database_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  tags = {
    Name = "database-${each.key}"
    Tier = "database"
  }
}
```

### Step 4: Use the Module in Different Environments

```hcl
# Development environment
module "dev_network" {
  source = "./modules/network"

  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-west-2a", "us-west-2b"]
  subnet_newbits     = 8  # /24 subnets
}

# Production environment with more AZs and different CIDR
module "prod_network" {
  source = "./modules/network"

  vpc_cidr           = "172.16.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  subnet_newbits     = 8  # /24 subnets
}
```

## Advanced Patterns

### Hierarchical Subnet Calculation

For complex networks, you can apply `cidrsubnet` in layers:

```hcl
variable "global_cidr" {
  default = "10.0.0.0/8"
}

locals {
  # First level: allocate /16 blocks per environment
  env_cidrs = {
    dev     = cidrsubnet(var.global_cidr, 8, 0)   # 10.0.0.0/16
    staging = cidrsubnet(var.global_cidr, 8, 1)   # 10.1.0.0/16
    prod    = cidrsubnet(var.global_cidr, 8, 2)   # 10.2.0.0/16
  }

  # Second level: within production, allocate /20 blocks per region
  prod_regions = {
    us_east = cidrsubnet(local.env_cidrs["prod"], 4, 0)  # 10.2.0.0/20
    us_west = cidrsubnet(local.env_cidrs["prod"], 4, 1)  # 10.2.16.0/20
    eu_west = cidrsubnet(local.env_cidrs["prod"], 4, 2)  # 10.2.32.0/20
  }

  # Third level: within each region, allocate /24 subnets
  us_east_subnets = {
    public_a  = cidrsubnet(local.prod_regions["us_east"], 4, 0)  # 10.2.0.0/24
    public_b  = cidrsubnet(local.prod_regions["us_east"], 4, 1)  # 10.2.1.0/24
    private_a = cidrsubnet(local.prod_regions["us_east"], 4, 2)  # 10.2.2.0/24
    private_b = cidrsubnet(local.prod_regions["us_east"], 4, 3)  # 10.2.3.0/24
  }
}
```

### Conditionally Sized Subnets

Different environments might need different subnet sizes:

```hcl
variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

locals {
  # Production gets larger subnets, dev gets smaller ones
  subnet_newbits = var.environment == "production" ? 4 : 8

  # Production /16 with 4 newbits = /20 subnets (4096 IPs)
  # Development /16 with 8 newbits = /24 subnets (256 IPs)
  public_subnet  = cidrsubnet(var.vpc_cidr, local.subnet_newbits, 0)
  private_subnet = cidrsubnet(var.vpc_cidr, local.subnet_newbits, 1)
}
```

### Using with Terraform Workspaces

Workspaces can drive subnet calculation:

```hcl
locals {
  # Map workspace names to network configurations
  workspace_config = {
    default = { cidr = "10.0.0.0/16", newbits = 8 }
    dev     = { cidr = "10.1.0.0/16", newbits = 8 }
    staging = { cidr = "10.2.0.0/16", newbits = 8 }
    prod    = { cidr = "10.3.0.0/16", newbits = 4 }
  }

  # Look up configuration for the current workspace
  config  = local.workspace_config[terraform.workspace]
  vpc_cidr = local.config.cidr
  newbits  = local.config.newbits

  # Calculate subnets based on workspace configuration
  subnets = {
    public  = cidrsubnet(local.vpc_cidr, local.newbits, 0)
    private = cidrsubnet(local.vpc_cidr, local.newbits, 1)
    data    = cidrsubnet(local.vpc_cidr, local.newbits, 2)
  }
}
```

## Debugging Subnet Calculations

When your subnet layout is not working as expected, use outputs to inspect the calculated values:

```hcl
# Add temporary outputs to debug subnet calculations
output "debug_subnets" {
  value = {
    vpc_cidr     = var.vpc_cidr
    newbits      = var.subnet_newbits
    total_subnets = pow(2, var.subnet_newbits)
    public       = [for i in range(3) : cidrsubnet(var.vpc_cidr, var.subnet_newbits, i)]
    private      = [for i in range(3) : cidrsubnet(var.vpc_cidr, var.subnet_newbits, i + 3)]
  }
}
```

You can also use `terraform console` to experiment interactively:

```bash
# Start the Terraform console
terraform console

# Try different calculations
> cidrsubnet("10.0.0.0/16", 8, 0)
"10.0.0.0/24"
> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"
> cidrsubnet("10.0.0.0/16", 4, 0)
"10.0.0.0/20"
```

## Validation and Safety

Add validation rules to catch configuration errors early:

```hcl
variable "vpc_cidr" {
  type = string
  validation {
    # Ensure the CIDR is valid and has a reasonable prefix length
    condition     = can(cidrsubnet(var.vpc_cidr, 0, 0))
    error_message = "The vpc_cidr must be a valid CIDR block."
  }
}

variable "subnet_newbits" {
  type = number
  validation {
    condition     = var.subnet_newbits >= 1 && var.subnet_newbits <= 16
    error_message = "subnet_newbits must be between 1 and 16."
  }
}
```

## A Complete Working Example

Here is a full configuration that ties everything together:

```hcl
terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "azs" {
  default = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

locals {
  az_count = length(var.azs)

  # Dynamically calculate all subnet CIDRs
  public_cidrs   = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_cidrs  = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i + local.az_count)]
  database_cidrs = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i + local.az_count * 2)]
}

# Show the calculated layout
output "network_layout" {
  value = {
    vpc      = var.vpc_cidr
    public   = local.public_cidrs
    private  = local.private_cidrs
    database = local.database_cidrs
  }
}
```

Running `terraform plan` with this configuration will show:

```text
network_layout = {
  vpc      = "10.0.0.0/16"
  public   = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
  private  = ["10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]
  database = ["10.0.6.0/24", "10.0.7.0/24", "10.0.8.0/24"]
}
```

## Summary

Dynamic subnet calculation with `cidrsubnet` is what separates amateur Terraform configurations from professional ones. By deriving all network addresses from a single variable, you get configurations that are portable across environments, easy to modify, and free from the errors that come with manual IP math. Start with a simple pattern, and scale up to hierarchical layouts as your infrastructure grows. For allocating multiple subnets in one call, also check out the [cidrsubnets function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrsubnets-function-in-terraform/view).
