# How to Use Locals for Computed Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Locals, Computed Values, Infrastructure as Code

Description: Learn how to use Terraform locals to compute derived values from variables, data sources, and other resources for cleaner and more maintainable infrastructure configurations.

---

Terraform locals are not just for naming static values. Their real strength is computing new values from existing inputs - variables, data sources, resource attributes, and other locals. When you compute values in locals rather than inline, your resource blocks stay clean and your logic stays centralized.

This post covers practical patterns for computing values in Terraform locals, from simple derivations to multi-step transformations.

## What Are Computed Locals?

A computed local is a local value whose expression depends on other values in your configuration. Instead of hardcoding a value, you derive it from inputs.

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "project" {
  type    = string
  default = "payments"
}

locals {
  # Computed from two variables
  resource_prefix = "${var.project}-${var.environment}"

  # Computed from another local
  log_group_name = "/ecs/${local.resource_prefix}/app"

  # Computed from a data source
  account_id = data.aws_caller_identity.current.account_id

  # Computed using a function
  is_production = var.environment == "production"
}
```

Terraform evaluates these during the plan phase and substitutes the computed values wherever they are referenced.

## Computing Values from Data Sources

Data sources fetch information about existing infrastructure. Locals let you process that information into forms your resources can use.

```hcl
# Fetch the current AWS account details
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Fetch available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Extract values from data sources
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Compute a list of AZ names to use (limit to 3)
  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  # Compute subnet CIDRs based on the number of AZs
  public_subnet_cidrs = [
    for i, az in local.azs : cidrsubnet("10.0.0.0/16", 8, i)
  ]

  private_subnet_cidrs = [
    for i, az in local.azs : cidrsubnet("10.0.0.0/16", 8, i + 100)
  ]
}

# Use the computed values in resources
resource "aws_subnet" "public" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${local.resource_prefix}-public-${local.azs[count.index]}"
  }
}

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${local.resource_prefix}-private-${local.azs[count.index]}"
  }
}
```

The subnet CIDRs are computed from the VPC CIDR and the number of available zones. If AWS adds or removes an AZ, the configuration adapts automatically.

## Computing Tags Dynamically

Tags are one of the most common use cases for computed locals. You often want a base set of tags that includes computed values like timestamps or account IDs.

```hcl
data "aws_caller_identity" "current" {}

locals {
  # Base tags that every resource gets
  base_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    AccountId   = data.aws_caller_identity.current.account_id
    Workspace   = terraform.workspace
  }

  # Compute cost allocation tags
  cost_tags = {
    CostCenter  = var.environment == "production" ? "PROD-001" : "DEV-001"
    BillingTeam = var.team
  }

  # Merge base and cost tags into a single map
  common_tags = merge(local.base_tags, local.cost_tags)
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Merge common tags with resource-specific tags
  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-app"
    Role = "application-server"
  })
}
```

## Computing CIDR Blocks and Network Values

Networking configurations involve lots of computed values. Locals keep the math in one place.

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_count" {
  type    = number
  default = 3
}

locals {
  # Compute subnet CIDRs using cidrsubnet function
  # cidrsubnet(prefix, newbits, netnum) carves subnets from a CIDR block
  public_cidrs = [
    for i in range(var.subnet_count) : cidrsubnet(var.vpc_cidr, 8, i)
  ]
  # Result: ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]

  private_cidrs = [
    for i in range(var.subnet_count) : cidrsubnet(var.vpc_cidr, 8, i + 10)
  ]
  # Result: ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  database_cidrs = [
    for i in range(var.subnet_count) : cidrsubnet(var.vpc_cidr, 8, i + 20)
  ]
  # Result: ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]

  # Compute the total number of subnets
  total_subnets = length(local.public_cidrs) + length(local.private_cidrs) + length(local.database_cidrs)
}
```

If you later change `vpc_cidr` or `subnet_count`, all the CIDR calculations update automatically.

## Computing Resource Names with Conventions

Many organizations have strict naming conventions. Computing names in locals ensures consistency.

```hcl
variable "app_name" {
  type    = string
  default = "order-api"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "region_code" {
  type    = string
  default = "uw2"  # Short code for us-west-2
}

locals {
  # Company naming convention: {region}-{env}-{app}-{resource}
  name_base = "${var.region_code}-${var.environment}-${var.app_name}"

  # Compute specific resource names
  ec2_name       = "${local.name_base}-ec2"
  rds_identifier = "${local.name_base}-db"
  s3_bucket      = "${local.name_base}-assets"
  sqs_queue      = "${local.name_base}-queue"
  sns_topic      = "${local.name_base}-notifications"
  log_group      = "/aws/ecs/${local.name_base}"

  # Some resources have length limits - compute a truncated version
  # Lambda function names are limited to 64 characters
  lambda_name = substr(local.name_base, 0, min(length(local.name_base), 55))
}

resource "aws_lambda_function" "processor" {
  function_name = "${local.lambda_name}-proc"
  runtime       = "python3.11"
  handler       = "handler.main"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  tags = {
    Name = "${local.lambda_name}-proc"
  }
}
```

## Computing Values with for Expressions

The `for` expression is one of the most powerful tools for computing locals. It lets you transform collections.

```hcl
variable "services" {
  type = map(object({
    port     = number
    protocol = string
    health_check_path = string
  }))
  default = {
    api = {
      port              = 8080
      protocol          = "HTTP"
      health_check_path = "/health"
    }
    web = {
      port              = 3000
      protocol          = "HTTP"
      health_check_path = "/"
    }
    grpc = {
      port              = 50051
      protocol          = "HTTP"
      health_check_path = "/grpc.health.v1.Health/Check"
    }
  }
}

locals {
  # Compute a list of all ports for security group rules
  service_ports = [for name, svc in var.services : svc.port]
  # Result: [8080, 3000, 50051]

  # Compute service names as an uppercase list
  service_names_upper = [for name, svc in var.services : upper(name)]
  # Result: ["API", "WEB", "GRPC"]

  # Compute a filtered map of HTTP-only services
  http_services = {
    for name, svc in var.services : name => svc
    if svc.protocol == "HTTP"
  }

  # Compute target group ARN map after resources are created
  # (This uses resource references in locals)
}
```

## Computing Values from Multiple Sources

Sometimes you need to combine data from different places - variables, data sources, and resource outputs.

```hcl
data "aws_vpc" "existing" {
  id = var.vpc_id
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  tags = {
    Tier = "private"
  }
}

locals {
  # Combine VPC data with user input
  vpc_cidr       = data.aws_vpc.existing.cidr_block
  private_subnet_ids = data.aws_subnets.private.ids

  # Compute the number of tasks based on environment and available subnets
  desired_count = min(
    var.environment == "production" ? 6 : 2,
    length(local.private_subnet_ids)
  )

  # Compute container definitions from variables and data sources
  container_environment = [
    {
      name  = "APP_ENV"
      value = var.environment
    },
    {
      name  = "VPC_CIDR"
      value = local.vpc_cidr
    },
    {
      name  = "AWS_REGION"
      value = data.aws_region.current.name
    }
  ]
}

resource "aws_ecs_service" "app" {
  name            = "${var.project}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = local.desired_count

  network_configuration {
    subnets = local.private_subnet_ids
  }
}
```

## Debugging Computed Locals

When a computed local does not produce the value you expect, use `output` blocks to inspect it:

```hcl
# Temporary outputs for debugging computed locals
output "debug_public_cidrs" {
  value = local.public_cidrs
}

output "debug_common_tags" {
  value = local.common_tags
}

output "debug_desired_count" {
  value = local.desired_count
}
```

Run `terraform plan` and the outputs section will show the computed values. Remove these debug outputs before merging your code.

You can also use `terraform console` to test expressions interactively:

```bash
# Start the Terraform console
terraform console

# Test local values
> local.resource_prefix
"payments-dev"

> local.public_cidrs
["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
```

## Summary

Computed locals are the backbone of well-structured Terraform configurations. Use them to derive network CIDRs from base blocks, build resource names from conventions, transform data source results into usable formats, compute tags by merging multiple sources, and calculate counts and sizes based on environment and available infrastructure. The pattern is always the same: put the computation logic in locals, and keep resource blocks focused on what they provision rather than how values are calculated.

For more on locals and variables, see our guide on [Terraform local values and variables](https://oneuptime.com/blog/post/2026-02-12-terraform-local-values-and-variables/view).
