# How to Create Application Load Balancers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, ALB, Networking, Load Balancing

Description: Complete guide to creating and configuring AWS Application Load Balancers with Terraform, including listeners, target groups, path-based routing, SSL, and WAF integration.

---

Application Load Balancers (ALBs) are the front door for most web applications on AWS. They handle SSL termination, path-based routing, health checks, and traffic distribution across your backend services. Setting them up with Terraform gives you repeatable, version-controlled load balancer configurations that you can deploy across environments.

This guide covers everything from a basic ALB to advanced setups with multiple target groups, SSL certificates, redirect rules, and WAF integration.

## Basic ALB Setup

An ALB needs three things: the load balancer itself, at least one target group, and at least one listener.

Start with the security group.

```hcl
# Security group for the ALB
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  description = "Security group for the Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.name}-alb-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

Now create the ALB.

```hcl
# The Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.name}-alb"
  internal           = false                # Internet-facing
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids  # Must be in public subnets

  # Enable deletion protection for production
  enable_deletion_protection = var.environment == "production"

  # Access logs to S3
  access_logs {
    bucket  = var.access_logs_bucket
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name        = "${var.name}-alb"
    Environment = var.environment
  }
}
```

## Target Groups

Target groups define where the ALB sends traffic. You can target EC2 instances, IP addresses, or Lambda functions.

```hcl
# Target group for the web application
resource "aws_lb_target_group" "app" {
  name_prefix = "app-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Use "instance" for EC2, "ip" for Fargate/ECS

  # Health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  # Deregistration delay - how long to wait before removing targets
  deregistration_delay = 30

  # Stickiness - keep a user on the same target
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400  # 24 hours
    enabled         = false   # Enable if your app needs session affinity
  }

  tags = {
    Name = "${var.name}-app-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Listeners

Listeners check for connection requests and route them to target groups.

### HTTP Listener with Redirect to HTTPS

```hcl
# HTTP listener - redirect all traffic to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
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
}
```

### HTTPS Listener

```hcl
# HTTPS listener - forward to the app target group
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # Modern TLS
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Path-Based Routing

Route different URL paths to different target groups.

```hcl
# Target group for the API service
resource "aws_lb_target_group" "api" {
  name_prefix = "api-"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path    = "/api/health"
    matcher = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Target group for static assets
resource "aws_lb_target_group" "static" {
  name_prefix = "stat-"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path    = "/"
    matcher = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Route /api/* to the API target group
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Route /static/* to the static assets target group
resource "aws_lb_listener_rule" "static" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.static.arn
  }

  condition {
    path_pattern {
      values = ["/static/*", "/assets/*"]
    }
  }
}
```

## Host-Based Routing

Route traffic based on the hostname in the request.

```hcl
# Route api.example.com to the API target group
resource "aws_lb_listener_rule" "api_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = ["api.example.com", "api.*.example.com"]
    }
  }
}
```

## Weighted Target Groups

Distribute traffic across multiple target groups for blue-green or canary deployments.

```hcl
# Weighted forwarding - send 90% to blue, 10% to green
resource "aws_lb_listener_rule" "weighted" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = 90
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = 10
      }

      stickiness {
        enabled  = true
        duration = 600  # 10 minutes
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Using Dynamic Blocks for Rules

When you have many routing rules, use dynamic blocks to keep the configuration clean.

```hcl
variable "routing_rules" {
  type = map(object({
    priority    = number
    path        = list(string)
    target_port = number
  }))
  default = {
    api = {
      priority    = 100
      path        = ["/api/*"]
      target_port = 3000
    }
    admin = {
      priority    = 200
      path        = ["/admin/*"]
      target_port = 4000
    }
    webhooks = {
      priority    = 300
      path        = ["/webhooks/*"]
      target_port = 5000
    }
  }
}

# Create target groups dynamically
resource "aws_lb_target_group" "services" {
  for_each = var.routing_rules

  name_prefix = substr(each.key, 0, 6)
  port        = each.value.target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path = "/health"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create listener rules dynamically
resource "aws_lb_listener_rule" "services" {
  for_each = var.routing_rules

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    path_pattern {
      values = each.value.path
    }
  }
}
```

For more on dynamic blocks, see our guide on [Terraform dynamic blocks](https://oneuptime.com/blog/post/2026-02-12-terraform-dynamic-blocks-for-repeated-configuration/view).

## SSL Certificate Management

Use ACM for SSL certificates.

```hcl
# Request a certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Wait for validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Outputs

```hcl
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer (for Route 53 alias records)"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}
```

## DNS Record

Point your domain to the ALB.

```hcl
resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Monitoring

ALBs produce CloudWatch metrics for request count, latency, error rates, and active connections. Monitor these closely after deployments. For comprehensive alerting that goes beyond CloudWatch, consider [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) for real-time visibility into your load balancer's health.

Key metrics to watch:
- `HTTPCode_Target_5XX_Count` - Backend errors
- `TargetResponseTime` - How fast your backend responds
- `HealthyHostCount` - Number of healthy targets
- `RequestCount` - Traffic volume

## Wrapping Up

ALBs are foundational for web applications on AWS. Terraform makes it straightforward to define complex routing rules, SSL termination, and target group configurations in code. Start with a simple HTTP-to-HTTPS redirect and a single target group, then add path-based routing and weighted targets as your architecture evolves.

For the VPC underneath your ALB, check out our guide on the [Terraform AWS VPC module](https://oneuptime.com/blog/post/2026-02-12-terraform-aws-vpc-module/view). For the database layer, see the [Terraform AWS RDS module](https://oneuptime.com/blog/post/2026-02-12-terraform-aws-rds-module/view).
