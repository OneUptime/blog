# How to Filter Resources and Collections in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Filtering, For Expressions, HCL, Collection, Infrastructure as Code

Description: Learn how to filter resources and collections in OpenTofu using for expressions with conditions, data source filters, and the can() function - selecting only the resources you need.

## Introduction

Filtering in OpenTofu means selecting a subset of a collection based on a condition. For expressions with `if` clauses filter lists and maps. Provider-specific data source filters query AWS/Azure/GCP for resources matching specific criteria. The `try()` function supplies a fallback when optional attributes are missing.

## Filtering Lists with For Expressions

```hcl
variable "subnets" {
  default = [
    { name = "web-public",  type = "public",  cidr = "10.0.1.0/24", az = "us-east-1a" },
    { name = "api-public",  type = "public",  cidr = "10.0.2.0/24", az = "us-east-1b" },
    { name = "db-private",  type = "private", cidr = "10.0.3.0/24", az = "us-east-1a" },
    { name = "app-private", type = "private", cidr = "10.0.4.0/24", az = "us-east-1b" }
  ]
}

locals {
  # Filter to only public subnets
  public_subnets = [for s in var.subnets : s if s.type == "public"]
  # [{name="web-public",...}, {name="api-public",...}]

  # Filter and extract CIDRs
  private_cidrs = [for s in var.subnets : s.cidr if s.type == "private"]
  # ["10.0.3.0/24", "10.0.4.0/24"]

  # Filter to specific AZ
  az1_subnets = [for s in var.subnets : s if s.az == "us-east-1a"]
}
```

## Filtering Maps

```hcl
variable "instance_configs" {
  default = {
    web-prod  = { env = "prod",    size = "t3.medium", enabled = true }
    api-prod  = { env = "prod",    size = "t3.large",  enabled = true }
    web-dev   = { env = "dev",     size = "t3.small",  enabled = true }
    api-dev   = { env = "dev",     size = "t3.micro",  enabled = false }  # Disabled
  }
}

locals {
  # Filter to enabled instances only
  enabled_instances = {
    for name, config in var.instance_configs : name => config
    if config.enabled == true
  }

  # Filter to production instances
  prod_instances = {
    for name, config in var.instance_configs : name => config
    if config.env == "prod"
  }
}

resource "aws_instance" "service" {
  for_each = local.enabled_instances

  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value.size

  tags = {
    Name = each.key
    Env  = each.value.env
  }
}
```

## Data Source Filters

```hcl
# Filter AWS AMIs by criteria

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Filter existing VPCs
data "aws_vpcs" "tagged_prod" {
  tags = {
    Environment = "production"
    Managed     = "opentofu"
  }
}

# Filter subnets by VPC and tag
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }

  tags = {
    Type = "private"
  }
}
```

## Filtering with Multiple Conditions

```hcl
locals {
  security_groups = [
    { name = "web-sg",  port = 80,   env = "prod", public = true },
    { name = "api-sg",  port = 8080, env = "prod", public = false },
    { name = "db-sg",   port = 5432, env = "prod", public = false },
    { name = "web-sg",  port = 80,   env = "dev",  public = true }
  ]

  # Multiple conditions: prod AND public
  prod_public_sgs = [
    for sg in local.security_groups : sg
    if sg.env == "prod" && sg.public == true
  ]

  # OR condition
  web_or_api_sgs = [
    for sg in local.security_groups : sg
    if sg.name == "web-sg" || sg.name == "api-sg"
  ]
}
```

## Filtering with try() for Error-Safe Selection

```hcl
variable "server_configs" {
  default = {
    web = { ami = "ami-12345678", extra_disk = true }
    api = { ami = "ami-87654321" }  # No extra_disk field
  }
}

locals {
  # Filter to configs that have extra_disk defined
  servers_with_disk = {
    for name, config in var.server_configs : name => config
    if try(config.extra_disk != null, false)  # Only include if extra_disk field exists
  }
}
```

## Filtering Resource Outputs

```hcl
# Get all EC2 instances, filter to only those with a specific tag
data "aws_instances" "web" {
  instance_tags = {
    Role = "web-server"
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

output "running_web_servers" {
  value = data.aws_instances.web.ids
}
```

## Practical: Filter to Non-Default Resources

```hcl
variable "route_tables" {
  default = {
    main    = { is_main = true,  routes = [] }
    public  = { is_main = false, routes = ["0.0.0.0/0"] }
    private = { is_main = false, routes = [] }
  }
}

locals {
  # Only manage non-main route tables (can't delete the main one)
  managed_route_tables = {
    for name, rt in var.route_tables : name => rt
    if !rt.is_main
  }
}
```

## Conclusion

Filtering in OpenTofu uses for expressions with `if` conditions for collection filtering, provider-specific data source `filter` blocks for querying existing cloud resources, and `try()` to handle optional attributes safely while building filtered collections. Combine multiple conditions with `&&` and `||`. Filter early in `locals` blocks to create clean, pre-filtered collections that your resources and modules can consume without inline conditions.
