# How to Use Dynamic Blocks for Security Group Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Security Groups, AWS, Infrastructure as Code, Networking

Description: Learn how to use Terraform dynamic blocks to manage AWS security group rules from variable-driven configurations for cleaner, more maintainable code.

---

Security groups are one of the first places where Terraform configurations start to get unwieldy. A typical application needs rules for HTTP, HTTPS, SSH, database access, monitoring ports, and more. Writing each rule as a separate inline block or separate resource gets repetitive fast. Dynamic blocks let you define your rules as data and generate the actual Terraform configuration from that data.

## The Traditional Approach and Its Problems

Here is what a security group looks like without dynamic blocks:

```hcl
# This works but does not scale
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "App port from ALB"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "SSH from internal"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }
}
```

The problems with this approach are obvious. Adding or removing rules means editing the resource definition. Different environments need different rules, which means duplicating the entire resource or using count-based conditionals on each block. And it is easy to make mistakes when copying rule blocks.

## Defining Rules as Data

The first step is to define your security group rules as a variable:

```hcl
# variables.tf
variable "app_ingress_rules" {
  description = "Ingress rules for the application security group"
  type = list(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    security_groups = optional(list(string), [])
    description     = string
  }))
}

variable "app_egress_rules" {
  description = "Egress rules for the application security group"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "All outbound traffic"
    }
  ]
}
```

Then provide values in environment-specific tfvars files:

```hcl
# environments/dev.tfvars
app_ingress_rules = [
  {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  },
  {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  },
  {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
    description = "SSH from internal networks"
  },
  {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "App port from internal"
  }
]
```

```hcl
# environments/prod.tfvars
app_ingress_rules = [
  {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS only"
  },
  {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "App port from internal only"
  }
  # No SSH, no HTTP in production
]
```

## Applying Dynamic Blocks

Now use dynamic blocks to generate the rules:

```hcl
# security_groups.tf
resource "aws_security_group" "app" {
  name        = "${var.environment}-app-sg"
  description = "Security group for the application"
  vpc_id      = aws_vpc.main.id

  # Generate ingress rules from the variable
  dynamic "ingress" {
    for_each = var.app_ingress_rules

    content {
      from_port       = ingress.value.from_port
      to_port         = ingress.value.to_port
      protocol        = ingress.value.protocol
      cidr_blocks     = ingress.value.cidr_blocks
      security_groups = ingress.value.security_groups
      description     = ingress.value.description
    }
  }

  # Generate egress rules from the variable
  dynamic "egress" {
    for_each = var.app_egress_rules

    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = {
    Name        = "${var.environment}-app-sg"
    Environment = var.environment
  }
}
```

## Using Maps for Named Rules

If you want to reference specific rules by name, use a map instead of a list:

```hcl
variable "security_rules" {
  description = "Named security group rules"
  type = map(object({
    type            = string  # "ingress" or "egress"
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    security_groups = optional(list(string), [])
    description     = string
  }))
  default = {
    http_in = {
      type        = "ingress"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP inbound"
    }
    https_in = {
      type        = "ingress"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS inbound"
    }
    all_out = {
      type        = "egress"
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "All outbound"
    }
  }
}

locals {
  # Split rules into ingress and egress
  ingress_rules = {
    for name, rule in var.security_rules : name => rule
    if rule.type == "ingress"
  }

  egress_rules = {
    for name, rule in var.security_rules : name => rule
    if rule.type == "egress"
  }
}

resource "aws_security_group" "app" {
  name        = "${var.environment}-app-sg"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.ingress_rules

    content {
      from_port       = ingress.value.from_port
      to_port         = ingress.value.to_port
      protocol        = ingress.value.protocol
      cidr_blocks     = ingress.value.cidr_blocks
      security_groups = ingress.value.security_groups
      description     = "${ingress.key}: ${ingress.value.description}"
    }
  }

  dynamic "egress" {
    for_each = local.egress_rules

    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = "${egress.key}: ${egress.value.description}"
    }
  }

  tags = {
    Name = "${var.environment}-app-sg"
  }
}
```

## Building a Security Group Module

Wrap this pattern into a reusable module:

```hcl
# modules/security-group/variables.tf
variable "name" {
  description = "Name of the security group"
  type        = string
}

variable "description" {
  description = "Description of the security group"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "ingress_rules" {
  description = "List of ingress rules"
  type = list(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    security_groups = optional(list(string), [])
    self            = optional(bool, false)
    description     = string
  }))
  default = []
}

variable "egress_rules" {
  description = "List of egress rules"
  type = list(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    description     = string
  }))
  default = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "All outbound"
    }
  ]
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/security-group/main.tf
resource "aws_security_group" "this" {
  name        = var.name
  description = var.description
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port        = ingress.value.from_port
      to_port          = ingress.value.to_port
      protocol         = ingress.value.protocol
      cidr_blocks      = ingress.value.cidr_blocks
      ipv6_cidr_blocks = ingress.value.ipv6_cidr_blocks
      security_groups  = ingress.value.security_groups
      self             = ingress.value.self
      description      = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = var.egress_rules

    content {
      from_port        = egress.value.from_port
      to_port          = egress.value.to_port
      protocol         = egress.value.protocol
      cidr_blocks      = egress.value.cidr_blocks
      ipv6_cidr_blocks = egress.value.ipv6_cidr_blocks
      description      = egress.value.description
    }
  }

  tags = merge(var.tags, {
    Name = var.name
  })

  lifecycle {
    create_before_destroy = true
  }
}

output "id" {
  value = aws_security_group.this.id
}

output "arn" {
  value = aws_security_group.this.arn
}
```

Use the module:

```hcl
# main.tf
module "web_sg" {
  source = "./modules/security-group"

  name   = "${terraform.workspace}-web-sg"
  vpc_id = aws_vpc.main.id

  ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]

  tags = {
    Environment = terraform.workspace
    Service     = "web"
  }
}

module "db_sg" {
  source = "./modules/security-group"

  name        = "${terraform.workspace}-db-sg"
  description = "Database security group"
  vpc_id      = aws_vpc.main.id

  ingress_rules = [
    {
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [module.web_sg.id]
      description     = "PostgreSQL from web servers"
    }
  ]

  tags = {
    Environment = terraform.workspace
    Service     = "database"
  }
}
```

## Combining Static and Dynamic Rules

Sometimes you have rules that are always present plus environment-specific rules:

```hcl
locals {
  # Rules that always exist
  base_rules = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]

  # Environment-specific rules
  env_rules = {
    dev = [
      {
        from_port   = 22
        to_port     = 22
        protocol    = "tcp"
        cidr_blocks = ["10.0.0.0/8"]
        description = "SSH for debugging"
      },
      {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP for testing"
      }
    ]
    prod = []  # No extra rules in production
  }

  # Merge base rules with environment rules
  all_ingress_rules = concat(
    local.base_rules,
    lookup(local.env_rules, terraform.workspace, [])
  )
}

resource "aws_security_group" "app" {
  name   = "${terraform.workspace}-app-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.all_ingress_rules

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
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

## Summary

Dynamic blocks transform security group management from a copy-paste exercise into a clean, data-driven configuration. Define your rules as variables, split them by type, and let dynamic blocks do the repetitive work. The result is security group configurations that are easier to audit, easier to change per environment, and much less likely to contain mistakes. For more on dynamic blocks, see our post on [dynamic blocks with for_each](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-with-for-each-in-terraform/view).
