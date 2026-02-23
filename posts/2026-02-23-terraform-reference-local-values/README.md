# How to Reference Local Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Local Values, Infrastructure as Code, DevOps

Description: Learn how to define and reference local values in Terraform using the local prefix to simplify expressions, avoid repetition, and keep configurations clean.

---

Local values in Terraform are like named constants or computed values within your configuration. They let you assign a name to an expression so you can reference it multiple times without repeating yourself. If you have been copy-pasting the same expression across resources, locals are the fix.

This post walks through how to define local values, how to reference them with the `local` prefix, and patterns that make your Terraform code cleaner.

## Defining and Referencing Locals

You define local values inside a `locals` block and reference them with `local.<name>`:

```hcl
# Define local values
locals {
  region      = "us-east-1"
  name_prefix = "myapp-production"
}

# Reference with local.<name>
resource "aws_s3_bucket" "data" {
  bucket = "${local.name_prefix}-data"
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs"
}
```

Notice the subtle difference: the block is `locals` (plural), but the reference is `local` (singular). This trips up newcomers regularly.

## Combining Variables into Locals

One of the most common patterns is combining input variables into a local value that you use throughout the configuration:

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

# Combine variables into reusable local values
locals {
  # Build a consistent naming prefix
  name_prefix = "${var.project_name}-${var.environment}"

  # Build common tags used across all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Team        = var.team
    ManagedBy   = "terraform"
  }
}

# Use the local values in resources
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
  })
}
```

Without locals, you would be writing `"${var.project_name}-${var.environment}"` and the full tags map in every single resource. Locals eliminate that duplication.

## Computed Local Values

Locals can contain any valid Terraform expression, including function calls, conditionals, and loops:

```hcl
variable "environment" {
  type = string
}

variable "base_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

locals {
  # Conditional logic
  is_production = var.environment == "production"

  # Computed values using functions
  subnet_cidrs = [
    cidrsubnet(var.base_cidr, 8, 0),  # 10.0.0.0/24
    cidrsubnet(var.base_cidr, 8, 1),  # 10.0.1.0/24
    cidrsubnet(var.base_cidr, 8, 2),  # 10.0.2.0/24
  ]

  # Conditional expression
  instance_type = local.is_production ? "t3.large" : "t3.micro"
  instance_count = local.is_production ? 3 : 1

  # Derived from other locals
  total_subnets = length(local.subnet_cidrs)
}

resource "aws_instance" "app" {
  count         = local.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.instance_type

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-${count.index}"
  })
}
```

## Locals Referencing Other Locals

Local values can reference other local values. Terraform figures out the evaluation order automatically:

```hcl
locals {
  # First-level locals
  project  = "webapp"
  env      = "staging"

  # Second-level locals that reference the first
  name_prefix = "${local.project}-${local.env}"

  # Third-level locals that reference the second
  bucket_name = "${local.name_prefix}-assets"
  log_group   = "/aws/${local.name_prefix}/app"
}

# All locals are resolved by the time resources use them
resource "aws_s3_bucket" "assets" {
  bucket = local.bucket_name  # "webapp-staging-assets"
}

resource "aws_cloudwatch_log_group" "app" {
  name = local.log_group  # "/aws/webapp-staging/app"
}
```

Just do not create circular references. If local A references local B and local B references local A, Terraform will throw an error.

## Using Locals with for Expressions

Locals are a great place to do data transformation with `for` expressions:

```hcl
variable "services" {
  type = list(object({
    name = string
    port = number
    public = bool
  }))
  default = [
    { name = "web", port = 80, public = true },
    { name = "api", port = 8080, public = true },
    { name = "worker", port = 9090, public = false },
  ]
}

locals {
  # Filter to only public services
  public_services = [for s in var.services : s if s.public]

  # Build a map of service name to port
  service_ports = { for s in var.services : s.name => s.port }

  # Build a set of all ports
  all_ports = toset([for s in var.services : s.port])
}

# Use the transformed data
resource "aws_security_group_rule" "service_ingress" {
  for_each = local.service_ports

  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id
}
```

## Multiple locals Blocks

You can have multiple `locals` blocks in the same configuration or across different files. Terraform merges them all together:

```hcl
# In naming.tf
locals {
  name_prefix = "${var.project}-${var.environment}"
}

# In tags.tf
locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
  }
}

# In networking.tf
locals {
  subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 0),
    cidrsubnet(var.vpc_cidr, 8, 1),
  ]
}
```

All three `locals` blocks are valid, and you can reference `local.name_prefix`, `local.common_tags`, and `local.subnet_cidrs` from anywhere in the configuration.

## Locals vs Variables

A question that comes up often: when should you use a local instead of a variable?

Use a **variable** when the value should be supplied by the caller - someone running `terraform apply` or a parent module. Variables are inputs.

Use a **local** when the value is computed from other values in the configuration. Locals are internal. Nobody outside the configuration can set them.

```hcl
# Variable: the caller decides the environment name
variable "environment" {
  type = string
}

# Local: computed internally, not configurable from outside
locals {
  is_production = var.environment == "production"
}
```

## Locals in Modules

Locals are especially valuable inside modules where you want to keep the module's interface clean while having complex internal logic:

```hcl
# modules/ecs-service/main.tf

variable "service_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "container_port" {
  type = number
}

# Internal computations hidden from the module caller
locals {
  full_name       = "${var.service_name}-${var.environment}"
  log_group_name  = "/ecs/${local.full_name}"
  container_name  = "${var.service_name}-container"

  container_definition = jsonencode([{
    name      = local.container_name
    image     = "${var.service_name}:latest"
    essential = true
    portMappings = [{
      containerPort = var.container_port
      hostPort      = var.container_port
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = local.log_group_name
        "awslogs-region" = "us-east-1"
      }
    }
  }])
}
```

The module caller just provides `service_name`, `environment`, and `container_port`. All the derived naming and configuration logic stays internal as locals.

## Performance Note

Locals are evaluated lazily - Terraform only computes a local value if something actually references it. So there is no performance penalty for defining locals you might not use in every scenario.

## Wrapping Up

The `local.<name>` reference is how you access named expressions in Terraform. Locals help you eliminate repeated expressions, organize complex logic, and keep your resource blocks focused on what matters. The pattern is straightforward: define in a `locals` block, reference with `local.` prefix.

For more on Terraform references, check out [How to Reference Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-input-variables/view) and [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view).
