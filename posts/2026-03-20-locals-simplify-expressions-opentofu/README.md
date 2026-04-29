# How to Use Locals to Simplify Complex Expressions in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local, Expression, HCL, Infrastructure as Code, DevOps

Description: A guide to using local values in OpenTofu to break down complex expressions into readable, maintainable components.

## Introduction

Complex expressions embedded directly in resource arguments are hard to read and maintain. Local values allow you to name intermediate computations, breaking complex logic into readable steps. This guide shows how to use locals to transform complex, nested expressions into clear, self-documenting code.

## Simplifying Complex Conditions

```hcl
# HARD TO READ: Complex inline condition

resource "aws_db_instance" "main" {
  # What does this mean?
  backup_retention_period = var.environment == "prod" ? 30 : (var.environment == "staging" ? 14 : 1)
  deletion_protection     = var.environment == "prod" || (var.environment == "staging" && var.enable_protection)
  multi_az                = var.environment == "prod" || var.force_multi_az
}

# BETTER: Using locals to name the conditions
locals {
  is_production = var.environment == "prod"
  is_staging    = var.environment == "staging"

  # Named values for each setting
  backup_days         = local.is_production ? 30 : local.is_staging ? 14 : 1
  deletion_protection = local.is_production || (local.is_staging && var.enable_protection)
  enable_multi_az     = local.is_production || var.force_multi_az
}

resource "aws_db_instance" "main" {
  backup_retention_period = local.backup_days
  deletion_protection     = local.deletion_protection
  multi_az                = local.enable_multi_az
}
```

## Simplifying Tag Management

```hcl
# MESSY: Tags spread across each resource
resource "aws_vpc" "main" {
  tags = {
    Name        = "${var.project}-${var.environment}-vpc"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "OpenTofu"
    Owner       = var.team
    CostCenter  = var.cost_center
    GitRepo     = var.repository
  }
}

# BETTER: Define tags as locals
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "OpenTofu"
    Owner       = var.team
    CostCenter  = var.cost_center
    GitRepo     = var.repository
  }

  vpc_tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"
    Type = "networking"
  })
}

resource "aws_vpc" "main" {
  tags = local.vpc_tags
}

resource "aws_subnet" "public" {
  count = 3
  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-public-${count.index + 1}"
    Type = "public-subnet"
    Tier = "public"
  })
}
```

## Simplifying Complex For Expressions

```hcl
# MESSY: Complex inline for expression
resource "aws_security_group" "web" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [for az in ["us-east-1a", "us-east-1b", "us-east-1c"] : cidrsubnet("10.0.0.0/16", 8, index(["us-east-1a", "us-east-1b", "us-east-1c"], az))]
  }
}

# BETTER: Break it into steps
locals {
  availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
  vpc_cidr            = "10.0.0.0/16"

  # Compute each subnet CIDR indexed by AZ
  subnet_cidrs_by_az = {
    for i, az in local.availability_zones :
    az => cidrsubnet(local.vpc_cidr, 8, i)
  }

  # Get just the CIDRs as a list
  subnet_cidr_list = values(local.subnet_cidrs_by_az)
}

resource "aws_security_group" "web" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.subnet_cidr_list  # Much cleaner!
  }
}
```

## Simplifying JSON Generation

```hcl
# MESSY: Inline JSON generation
resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([{name = "app", image = "${var.ecr_registry}/app:${var.image_tag}", portMappings = [{containerPort = 8080, protocol = "tcp"}], cpu = var.environment == "prod" ? 512 : 256, memory = var.environment == "prod" ? 1024 : 512, environment = [for k, v in var.app_env : {name = k, value = v}]}])
}

# BETTER: Build the structure in locals
locals {
  is_production = var.environment == "prod"
  name_prefix   = "${var.project}-${var.environment}"

  container_cpu    = local.is_production ? 512 : 256
  container_memory = local.is_production ? 1024 : 512

  app_container = {
    name  = "app"
    image = "${var.ecr_registry}/app:${var.image_tag}"
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    cpu    = local.container_cpu
    memory = local.container_memory
    environment = [
      for k, v in var.app_env :
      { name = k, value = v }
    ]
  }
}

resource "aws_ecs_task_definition" "app" {
  family                = local.name_prefix
  container_definitions = jsonencode([local.app_container])
}
```

## Conclusion

Using local values to break down complex expressions into named, intermediate steps dramatically improves the readability of OpenTofu configurations. Each local value serves as a self-documenting name for a concept, making the intent of the configuration clear. The general rule is: if an expression is more than a simple attribute access or arithmetic, it should be a named local.
