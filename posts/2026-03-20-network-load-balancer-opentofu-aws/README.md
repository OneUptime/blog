# How to Create a Network Load Balancer with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, Networking, Load Balancer

Description: Learn how to provision an AWS Network Load Balancer (NLB) using OpenTofu, including target groups, listeners, and health checks for high-availability TCP traffic routing.

## Introduction

A Network Load Balancer (NLB) operates at Layer 4 (TCP/UDP) of the OSI model, offering ultra-low latency and the ability to handle millions of requests per second. Unlike Application Load Balancers, NLBs preserve the client source IP and are ideal for latency-sensitive applications. In this guide, you will provision an NLB on AWS using OpenTofu.

## Prerequisites

- OpenTofu installed (v1.6+)
- AWS credentials configured
- An existing VPC with subnets

## Project Structure

```text
nlb-example/
├── main.tf
├── variables.tf
├── outputs.tf
└── terraform.tfvars
```

## Step 1: Configure the AWS Provider

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Define Variables

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID where the NLB will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the NLB"
  type        = list(string)
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 80
}
```

## Step 3: Create the Network Load Balancer

```hcl
# main.tf (continued)

# Create the Network Load Balancer
resource "aws_lb" "main" {
  name               = "my-network-lb"
  internal           = false          # Set to true for internal NLB
  load_balancer_type = "network"      # Specifies NLB (not ALB)
  subnets            = var.subnet_ids

  # Enable deletion protection in production
  enable_deletion_protection = false

  # Enable cross-zone load balancing
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "my-network-lb"
    Environment = "production"
  }
}

# Create a Target Group for the NLB
resource "aws_lb_target_group" "app" {
  name        = "app-target-group"
  port        = var.app_port
  protocol    = "TCP"          # NLB supports TCP, UDP, TLS, TCP_UDP
  vpc_id      = var.vpc_id
  target_type = "instance"     # Can also be "ip" or "alb" (NLB does not support "lambda")

  # Health check configuration
  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30  # Seconds between health checks
  }

  tags = {
    Name = "app-target-group"
  }
}

# Create a Listener on port 80 (TCP)
resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.main.arn
  port              = var.app_port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Step 4: Register Targets

```hcl
# Register EC2 instances with the target group
resource "aws_lb_target_group_attachment" "app" {
  count            = length(var.instance_ids)
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = var.instance_ids[count.index]
  port             = var.app_port
}
```

## Step 5: Define Outputs

```hcl
# outputs.tf
output "nlb_dns_name" {
  description = "The DNS name of the Network Load Balancer"
  value       = aws_lb.main.dns_name
}

output "nlb_arn" {
  description = "The ARN of the Network Load Balancer"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_lb_target_group.app.arn
}
```

## Step 6: Deploy

Run the following commands to deploy your Network Load Balancer:

```bash
# Initialize OpenTofu and download providers
tofu init

# Preview the changes
tofu plan -var-file="terraform.tfvars"

# Apply the configuration
tofu apply -var-file="terraform.tfvars"
```

## Adding TLS Termination

For secure applications, add a TLS listener:

```hcl
resource "aws_lb_listener" "tls" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Conclusion

You have successfully created a Network Load Balancer on AWS using OpenTofu. The NLB provides high-performance Layer 4 load balancing with TCP health checks and cross-zone load balancing enabled. For production workloads, consider enabling deletion protection, adding TLS termination, and integrating with Auto Scaling groups for dynamic target management.
