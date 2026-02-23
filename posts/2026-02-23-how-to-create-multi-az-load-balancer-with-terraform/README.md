# How to Create Multi-AZ Load Balancer with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Load Balancer, ALB, AWS, High Availability, Multi-AZ, Networking

Description: Learn how to create a highly available multi-AZ Application Load Balancer with Terraform, including target groups, health checks, and listener rules.

---

A multi-AZ load balancer distributes incoming traffic across targets in multiple availability zones, providing high availability and fault tolerance. If one AZ experiences issues, the load balancer automatically routes traffic to healthy targets in the remaining AZs. AWS Application Load Balancers (ALBs) are designed to work across AZs natively. Terraform makes it easy to set up the complete load balancing infrastructure including the ALB, target groups, listeners, and health checks.

## Why Multi-AZ Load Balancing

Deploying your load balancer in a single availability zone means that an AZ outage takes down your entire application. A multi-AZ setup ensures that your application remains accessible even when an entire AZ goes offline. The ALB automatically detects unhealthy targets and stops sending traffic to them, while continuing to distribute traffic to healthy targets in other AZs.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a VPC spanning multiple availability zones, and application instances or containers to serve as targets.

## Setting Up the VPC Infrastructure

Create a VPC with public and private subnets across three AZs:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "lb-vpc" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

# Public subnets across 3 AZs (for the ALB)
resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Private subnets across 3 AZs (for targets)
resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "public-rt" }
}

# Associate public subnets with the route table
resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Creating the Application Load Balancer

Deploy the ALB across multiple AZs:

```hcl
# Security group for the ALB
resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = aws_vpc.main.id

  # Allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP"
  }

  # Allow HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "alb-sg" }
}

# Application Load Balancer spanning multiple AZs
resource "aws_lb" "main" {
  name               = "multi-az-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]

  # Deploy across all public subnets (multiple AZs)
  subnets = aws_subnet.public[*].id

  # Enable cross-zone load balancing
  enable_cross_zone_load_balancing = true

  # Enable deletion protection in production
  enable_deletion_protection = false

  # Access logging
  access_logs {
    bucket  = aws_s3_bucket.lb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name        = "multi-az-alb"
    Environment = "production"
  }
}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "lb_logs" {
  bucket = "my-alb-access-logs"
}
```

## Creating Target Groups

Define target groups with health checks:

```hcl
# Primary target group
resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  # Target type can be "instance", "ip", or "lambda"
  target_type = "instance"

  # Health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  # Stickiness for session affinity
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  # Deregistration delay
  deregistration_delay = 300

  tags = {
    Name = "app-target-group"
  }
}

# Secondary target group for blue-green deployments
resource "aws_lb_target_group" "app_green" {
  name     = "app-green-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "app-green-target-group"
  }
}
```

## Configuring Listeners

Set up HTTP and HTTPS listeners:

```hcl
# HTTPS listener (primary)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP listener (redirect to HTTPS)
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

## Adding Listener Rules

Create path-based and host-based routing rules:

```hcl
# Path-based routing for API traffic
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Host-based routing
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    host_header {
      values = ["admin.example.com"]
    }
  }
}

# Weighted routing between blue and green
resource "aws_lb_listener_rule" "weighted" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 300

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.app.arn
        weight = 90
      }

      target_group {
        arn    = aws_lb_target_group.app_green.arn
        weight = 10
      }

      stickiness {
        enabled  = true
        duration = 600
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

## Registering Targets

Register EC2 instances as targets:

```hcl
# Security group for application instances
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "app-sg" }
}

# Application instances across AZs
resource "aws_instance" "app" {
  count = 3

  ami                    = "ami-0c02fb55956c7d316"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.private[count.index].id
  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name = "app-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Register instances with the target group
resource "aws_lb_target_group_attachment" "app" {
  count = 3

  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app[count.index].id
  port             = 80
}
```

## Outputs

```hcl
output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB for Route 53 alias records"
  value       = aws_lb.main.zone_id
}

output "target_group_arn" {
  description = "ARN of the primary target group"
  value       = aws_lb_target_group.app.arn
}
```

## Monitoring Your Multi-AZ Load Balancer

Monitor ALB health, request counts, and error rates with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-multi-az-load-balancer-with-terraform/view) to ensure your multi-AZ setup delivers consistent performance and rapid failover.

## Best Practices

Always deploy ALBs across at least two AZs, preferably three. Enable cross-zone load balancing for even traffic distribution. Use HTTPS listeners with modern TLS policies. Configure health checks with appropriate thresholds to balance between quick detection and false positives. Enable access logging for troubleshooting and compliance.

## Conclusion

A multi-AZ Application Load Balancer with Terraform provides highly available, fault-tolerant traffic distribution for your applications. By spanning multiple availability zones and using proper health checks, your application stays accessible even during AZ failures. Terraform makes this setup reproducible, version-controlled, and easy to extend with additional listener rules and target groups.
