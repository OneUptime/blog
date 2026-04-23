# How to Reference Local Values in OpenTofu Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local, Resource, Reference, Infrastructure as Code, DevOps

Description: A guide to referencing local values in OpenTofu resource configurations to reduce duplication and improve readability.

## Introduction

Once you define local values in a `locals` block, you reference them using the `local.<NAME>` syntax. Local values can be used anywhere an expression is valid - in resource arguments, other locals, outputs, and more.

## Basic Reference Syntax

```hcl
locals {
  name_prefix = "myapp-prod"
  common_tags = {
    ManagedBy = "OpenTofu"
    Project   = "myapp"
  }
}

# Reference with local.<name>

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = merge(
    local.common_tags,  # Reference the local
    {
      Name = "${local.name_prefix}-vpc"  # Interpolate the local
    }
  )
}
```

## Referencing Locals Across Multiple Resources

```hcl
locals {
  environment   = var.environment
  name_prefix   = "${var.project}-${var.environment}"
  is_production = var.environment == "prod"

  common_tags = {
    Environment = local.environment
    Project     = var.project
    ManagedBy   = "OpenTofu"
  }
}

# All resources share these locals
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-vpc" })
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = local.is_production ? "t3.large" : "t3.micro"
  count         = local.is_production ? 3 : 1
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-web-${count.index}" })
}

resource "aws_db_instance" "main" {
  allocated_storage   = local.is_production ? 100 : 20
  engine              = "postgres"
  instance_class      = local.is_production ? "db.r5.large" : "db.t3.micro"
  db_name             = "app"
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true
  multi_az            = local.is_production
  tags                = merge(local.common_tags, { Name = "${local.name_prefix}-db" })
}
```

## Locals Referencing Other Locals

```hcl
# Locals can build on each other
locals {
  # Base values
  project     = var.project_name
  environment = var.environment

  # Built from base values
  name_prefix = "${local.project}-${local.environment}"

  # Built from computed values
  is_production = local.environment == "prod"

  # Built from multiple computed values
  enable_ha      = local.is_production || var.force_ha
  instance_count = local.enable_ha ? 3 : 1

  # Complex computation using other locals
  instance_type = (
    local.is_production
    ? "t3.large"
    : local.environment == "staging"
    ? "t3.small"
    : "t3.micro"
  )
}

resource "aws_launch_template" "web" {
  name_prefix   = "${local.name_prefix}-"
  image_id      = var.ami_id
  instance_type = local.instance_type
}

# Use deeply computed locals
resource "aws_autoscaling_group" "web" {
  min_size           = local.enable_ha ? 2 : 1
  max_size           = local.is_production ? 10 : 3
  desired_capacity   = local.instance_count
  name               = "${local.name_prefix}-asg"
  availability_zones = var.availability_zones

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}
```

## Locals in Dynamic Blocks

```hcl
locals {
  name_prefix = "myapp-prod"

  # Define ingress rules as a local
  ingress_rules = [
    { port = 80,  protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 443, protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 8080, protocol = "tcp", cidr = "10.0.0.0/8" },
  ]
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id
  name   = "${local.name_prefix}-web-sg"

  # Use local in dynamic block
  dynamic "ingress" {
    for_each = local.ingress_rules  # Reference local

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = [ingress.value.cidr]
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

## Locals in Module Arguments

```hcl
locals {
  environment = var.environment

  common_tags = {
    Environment = local.environment
    ManagedBy   = "OpenTofu"
  }

  vpc_cidr = "10.0.0.0/16"
}

# Pass locals to modules
module "vpc" {
  source = "./modules/vpc"

  cidr_block  = local.vpc_cidr  # Pass local to module
  tags        = local.common_tags
  environment = local.environment
}
```

## Conclusion

Referencing local values with `local.<name>` is straightforward, but the power lies in how locals enable you to define a value once and reference it consistently throughout your configuration. This means a single change to a local - like updating the naming convention or tag standards - propagates automatically to all resources that reference it. Use locals thoughtfully for values used more than once or any computed value that benefits from a descriptive name.
