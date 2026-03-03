# How to Create Reusable Terraform Modules for Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, ALB, Load Balancer, Networking

Description: Build a reusable Terraform module for AWS Application Load Balancers with target groups, listeners, SSL certificates, and health check configuration.

---

Application Load Balancers are one of the more configuration-heavy resources in AWS. Between the load balancer itself, target groups, listeners, listener rules, SSL certificates, security groups, and access logging, a production ALB can easily require 8-10 Terraform resource blocks. Wrapping this in a module saves significant effort and ensures consistency across your services.

This post builds an ALB module from scratch that handles the most common use cases while staying flexible enough for edge cases.

## What the Module Should Handle

A typical ALB setup includes:

- The ALB resource (internal or internet-facing)
- HTTP listener that redirects to HTTPS
- HTTPS listener with a default target group
- One or more target groups with health checks
- SSL certificate from ACM
- Access logging to S3
- Security group configuration

## Module Structure

```text
modules/alb/
  main.tf
  listeners.tf
  target_groups.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/alb/variables.tf

variable "name" {
  description = "Name of the ALB"
  type        = string
}

variable "internal" {
  description = "Whether the ALB is internal (true) or internet-facing (false)"
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "VPC ID for target groups"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the ALB (must be in at least 2 AZs)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS listener"
  type        = string
}

variable "idle_timeout" {
  description = "Idle timeout in seconds"
  type        = number
  default     = 60
}

variable "enable_access_logs" {
  description = "Enable ALB access logging to S3"
  type        = bool
  default     = false
}

variable "access_logs_bucket" {
  description = "S3 bucket for access logs"
  type        = string
  default     = ""
}

variable "target_groups" {
  description = "Target groups to create"
  type = list(object({
    name                 = string
    port                 = number
    protocol             = optional(string, "HTTP")
    target_type          = optional(string, "ip")
    deregistration_delay = optional(number, 30)

    health_check = optional(object({
      path                = optional(string, "/health")
      port                = optional(string, "traffic-port")
      protocol            = optional(string, "HTTP")
      healthy_threshold   = optional(number, 3)
      unhealthy_threshold = optional(number, 3)
      interval            = optional(number, 30)
      timeout             = optional(number, 5)
      matcher             = optional(string, "200")
    }), {})
  }))
  default = []
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## ALB Resource

```hcl
# modules/alb/main.tf

resource "aws_lb" "this" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  idle_timeout = var.idle_timeout

  # Enable deletion protection in production
  enable_deletion_protection = false

  # Access logging
  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []

    content {
      bucket  = var.access_logs_bucket
      prefix  = var.name
      enabled = true
    }
  }

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}
```

## Target Groups

```hcl
# modules/alb/target_groups.tf

resource "aws_lb_target_group" "this" {
  count = length(var.target_groups)

  name                 = var.target_groups[count.index].name
  port                 = var.target_groups[count.index].port
  protocol             = var.target_groups[count.index].protocol
  target_type          = var.target_groups[count.index].target_type
  vpc_id               = var.vpc_id
  deregistration_delay = var.target_groups[count.index].deregistration_delay

  health_check {
    path                = var.target_groups[count.index].health_check.path
    port                = var.target_groups[count.index].health_check.port
    protocol            = var.target_groups[count.index].health_check.protocol
    healthy_threshold   = var.target_groups[count.index].health_check.healthy_threshold
    unhealthy_threshold = var.target_groups[count.index].health_check.unhealthy_threshold
    interval            = var.target_groups[count.index].health_check.interval
    timeout             = var.target_groups[count.index].health_check.timeout
    matcher             = var.target_groups[count.index].health_check.matcher
  }

  tags = merge(
    var.tags,
    {
      Name = var.target_groups[count.index].name
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}
```

## Listeners

```hcl
# modules/alb/listeners.tf

# HTTP listener - redirects everything to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = var.tags
}

# HTTPS listener - forwards to the first target group by default
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = length(aws_lb_target_group.this) > 0 ? aws_lb_target_group.this[0].arn : null
  }

  tags = var.tags
}
```

## Outputs

```hcl
# modules/alb/outputs.tf

output "arn" {
  description = "ARN of the ALB"
  value       = aws_lb.this.arn
}

output "dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.this.dns_name
}

output "zone_id" {
  description = "Hosted zone ID of the ALB (for Route53 aliases)"
  value       = aws_lb.this.zone_id
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "target_group_arns" {
  description = "ARNs of the target groups"
  value       = aws_lb_target_group.this[*].arn
}
```

## Usage Example

```hcl
module "api_alb" {
  source = "./modules/alb"

  name       = "api-alb"
  internal   = false
  vpc_id     = module.vpc.id
  subnet_ids = module.vpc.public_subnet_ids

  security_group_ids = [module.alb_sg.id]
  certificate_arn    = aws_acm_certificate.api.arn

  target_groups = [
    {
      name        = "api-service"
      port        = 8080
      target_type = "ip"

      health_check = {
        path    = "/health"
        matcher = "200"
      }
    },
    {
      name        = "admin-service"
      port        = 8081
      target_type = "ip"

      health_check = {
        path    = "/admin/health"
        matcher = "200"
      }
    }
  ]

  # Enable access logging
  enable_access_logs = true
  access_logs_bucket = module.alb_logs_bucket.bucket_id

  tags = {
    Environment = "production"
    Service     = "api"
  }
}
```

## Adding Path-Based Routing

After creating the ALB with the module, you can add listener rules for path-based routing:

```hcl
# Route /admin/* to the admin target group
resource "aws_lb_listener_rule" "admin" {
  listener_arn = module.api_alb.https_listener_arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = module.api_alb.target_group_arns[1]
  }

  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }
}
```

You could also build listener rules into the module, but keeping them outside gives callers more flexibility without making the module overly complex.

## SSL Policy Choices

The module uses `ELBSecurityPolicy-TLS13-1-2-2021-06` by default, which requires TLS 1.2 or 1.3. If you need to support older clients, you can make the SSL policy a variable, but think carefully before downgrading since TLS 1.0 and 1.1 have known vulnerabilities.

## Connection to Other Modules

This ALB module works well in combination with other modules. Use the [security group module](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-security-groups/view) to create the ALB's security group, and the [DNS records module](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-dns-records/view) to create a Route53 alias record pointing to the ALB.
