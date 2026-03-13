# How to Use Locals to Avoid Repeating Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Local, DRY, Infrastructure as Code, Best Practices

Description: Learn how to use Terraform locals to eliminate repeated expressions across your configuration, keeping your code DRY and reducing the risk of inconsistencies when values change.

---

One of the most common problems in Terraform configurations is repeated expressions. You write the same string interpolation in five different resource blocks, and when something changes, you update four of them and miss the fifth. Locals solve this by giving you a single source of truth for any expression that appears more than once.

This post shows the specific patterns where locals eliminate repetition and the real-world payoff of using them.

## The Repetition Problem

Here is what a Terraform configuration looks like without locals:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name        = "myapp-production-web"
    Environment = "production"
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group" "web" {
  name        = "myapp-production-web-sg"
  description = "Security group for myapp production web servers"

  tags = {
    Name        = "myapp-production-web-sg"
    Environment = "production"
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}

resource "aws_lb" "web" {
  name               = "myapp-production-web-alb"
  internal           = false
  load_balancer_type = "application"

  tags = {
    Name        = "myapp-production-web-alb"
    Environment = "production"
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "myapp-production-logs"

  tags = {
    Name        = "myapp-production-logs"
    Environment = "production"
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}
```

The strings "myapp", "production", and the entire tags block are duplicated everywhere. If the project name changes from "myapp" to "orderservice", you need to update every single occurrence.

## The Fix with Locals

```hcl
locals {
  # Define the naming prefix once
  name_prefix = "${var.project}-${var.environment}"

  # Define common tags once
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web"
  })
}

resource "aws_security_group" "web" {
  name        = "${local.name_prefix}-web-sg"
  description = "Security group for ${local.name_prefix} web servers"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-sg"
  })
}

resource "aws_lb" "web" {
  name               = "${local.name_prefix}-web-alb"
  internal           = false
  load_balancer_type = "application"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-alb"
  })
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-logs"
  })
}
```

Now when the project name or environment changes, it propagates everywhere automatically.

## Repeated CIDR Blocks and Network Values

Network configurations are full of repeated values. VPC CIDRs, subnet ranges, and allowed IP lists show up in security groups, NACLs, and route tables.

```hcl
locals {
  # Define network values once
  vpc_cidr     = "10.0.0.0/16"
  office_cidr  = "203.0.113.0/24"
  vpn_cidr     = "10.8.0.0/16"
  allowed_cidrs = [local.office_cidr, local.vpn_cidr]
}

resource "aws_vpc" "main" {
  cidr_block = local.vpc_cidr

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_security_group" "web" {
  name   = "${local.name_prefix}-web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.allowed_cidrs
    description = "HTTPS from allowed networks"
  }
}

resource "aws_security_group" "bastion" {
  name   = "${local.name_prefix}-bastion-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = local.allowed_cidrs
    description = "SSH from allowed networks"
  }
}

resource "aws_network_acl_rule" "allow_inbound" {
  network_acl_id = aws_network_acl.main.id
  rule_number    = 100
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = local.office_cidr
  from_port      = 443
  to_port        = 443
}
```

Without locals, `"203.0.113.0/24"` and `"10.8.0.0/16"` would appear as raw strings in every security group and NACL rule. When the office IP range changes, you would need to find and replace every occurrence.

## Repeated ARN Patterns

AWS ARNs follow a predictable structure, but they are long and easy to get wrong when typed out multiple times.

```hcl
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Compute ARNs once and reuse
  kms_key_arn    = "arn:aws:kms:${local.region}:${local.account_id}:key/${var.kms_key_id}"
  s3_bucket_arn  = aws_s3_bucket.data.arn
  s3_objects_arn = "${aws_s3_bucket.data.arn}/*"
  sqs_queue_arn  = aws_sqs_queue.main.arn
  sns_topic_arn  = aws_sns_topic.alerts.arn
}

# IAM policy for the application role
resource "aws_iam_role_policy" "app" {
  name = "${local.name_prefix}-app-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = [local.s3_objects_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [local.s3_bucket_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [local.kms_key_arn]
      }
    ]
  })
}

# IAM policy for the CI/CD role - reuses the same ARNs
resource "aws_iam_role_policy" "cicd" {
  name = "${local.name_prefix}-cicd-policy"
  role = aws_iam_role.cicd.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = [local.s3_objects_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [local.sns_topic_arn]
      }
    ]
  })
}
```

## Repeated Environment-Specific Logic

When the same environment-based decision is made in multiple places, consolidate it in a local.

```hcl
locals {
  # Make environment decisions once
  is_production = var.environment == "production"

  instance_type   = local.is_production ? "m5.xlarge" : "t3.micro"
  desired_count   = local.is_production ? 3 : 1
  log_retention   = local.is_production ? 365 : 30
  backup_retention = local.is_production ? 30 : 7
  enable_waf       = local.is_production
  enable_guard_duty = local.is_production
}

# All resources use the centralized decisions
resource "aws_instance" "app" {
  instance_type = local.instance_type
  # ...
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = local.log_retention
}

resource "aws_db_instance" "main" {
  backup_retention_period = local.backup_retention
  # ...
}
```

## Repeated Port and Protocol Definitions

Microservice architectures often reference the same ports and protocols across load balancers, security groups, health checks, and container definitions.

```hcl
locals {
  # Service port definitions - single source of truth
  services = {
    api = {
      port              = 8080
      health_check_path = "/health"
      protocol          = "HTTP"
    }
    web = {
      port              = 3000
      health_check_path = "/"
      protocol          = "HTTP"
    }
    metrics = {
      port              = 9090
      health_check_path = "/metrics"
      protocol          = "HTTP"
    }
  }
}

# Security group uses the port from locals
resource "aws_security_group_rule" "api_ingress" {
  type              = "ingress"
  from_port         = local.services.api.port
  to_port           = local.services.api.port
  protocol          = "tcp"
  security_group_id = aws_security_group.app.id
  cidr_blocks       = [local.vpc_cidr]
}

# Target group uses the same port
resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = local.services.api.port
  protocol    = local.services.api.protocol
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path     = local.services.api.health_check_path
    port     = local.services.api.port
    protocol = local.services.api.protocol
  }
}

# Container definition also uses the same port
resource "aws_ecs_task_definition" "api" {
  family = "${local.name_prefix}-api"

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${var.ecr_repo}:${var.image_tag}"
      portMappings = [
        {
          containerPort = local.services.api.port
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

If the API port changes from 8080 to 9000, you update it in one place and the security group, target group, and container definition all pick up the change.

## The Payoff

Using locals to avoid repetition gives you three concrete benefits:

1. **Fewer bugs.** When a value is defined once, it cannot get out of sync across resources. You will never have a security group pointing to port 8080 while the container listens on 9000 because someone forgot to update one of five places.

2. **Easier refactoring.** Renaming a project, changing an environment tier, or moving to a new IP range becomes a one-line change instead of a search-and-replace across dozens of files.

3. **Better code review.** Reviewers can focus on the logic in locals and trust that the resource blocks are using consistent values. They do not have to manually verify that every occurrence of a repeated value matches.

## Summary

Every time you find yourself copying an expression from one resource block to another, stop and put it in a local. Name prefixes, common tags, CIDR blocks, ARN patterns, port definitions, and environment-specific decisions are all prime candidates. The DRY principle applies to Terraform just as much as it does to application code, and locals are the primary tool for enforcing it.

For more on local values in Terraform, see our guide on [defining local values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-local-values-in-terraform/view).
