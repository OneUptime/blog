# How to Create Network Load Balancer with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, NLB, Load Balancing, Networking

Description: Step-by-step guide to creating AWS Network Load Balancers with Terraform, covering TCP/UDP listeners, TLS termination, static IPs, cross-zone load balancing, and target groups.

---

Network Load Balancers (NLBs) operate at Layer 4 (TCP/UDP) and are built for extreme performance. They can handle millions of requests per second with ultra-low latency, preserve the client's source IP, and support static IP addresses. If your workload needs raw throughput, static IPs for firewall allowlisting, or non-HTTP protocols, NLBs are the right choice.

Let's build an NLB from scratch in Terraform, covering the common patterns you'll need in production.

## When to Choose NLB Over ALB

Quick decision guide:

- **NLB** - TCP/UDP traffic, static IPs needed, extreme performance, gRPC without HTTP/2, game servers, IoT backends
- **ALB** - HTTP/HTTPS routing, path-based routing, host-based routing, WebSocket, standard web applications

## Basic NLB Setup

An NLB needs the load balancer itself, a target group, and at least one listener.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Network Load Balancer
resource "aws_lb" "main" {
  name               = "app-nlb"
  internal           = false
  load_balancer_type = "network"

  # Deploy across multiple availability zones
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]

  # Enable cross-zone load balancing for even distribution
  enable_cross_zone_load_balancing = true

  # Enable deletion protection for production
  enable_deletion_protection = false

  tags = {
    Name        = "app-nlb"
    Environment = var.environment
  }
}

# Target group for TCP traffic
resource "aws_lb_target_group" "app" {
  name_prefix = "app-"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  # TCP health check
  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  # Connection draining timeout
  deregistration_delay = 60

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "app-tg"
  }
}

# TCP listener on port 80
resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## NLB with Static Elastic IPs

One of the biggest advantages of NLBs is the ability to assign Elastic IPs for static addresses. This is critical when clients need to allowlist your IP addresses.

```hcl
# Allocate Elastic IPs for each AZ
resource "aws_eip" "nlb_a" {
  domain = "vpc"
  tags   = { Name = "nlb-eip-a" }
}

resource "aws_eip" "nlb_b" {
  domain = "vpc"
  tags   = { Name = "nlb-eip-b" }
}

resource "aws_eip" "nlb_c" {
  domain = "vpc"
  tags   = { Name = "nlb-eip-c" }
}

# NLB with subnet mappings for static IPs
resource "aws_lb" "static_ip" {
  name               = "static-nlb"
  internal           = false
  load_balancer_type = "network"

  # Use subnet_mapping instead of subnets to assign EIPs
  subnet_mapping {
    subnet_id     = aws_subnet.public_a.id
    allocation_id = aws_eip.nlb_a.id
  }

  subnet_mapping {
    subnet_id     = aws_subnet.public_b.id
    allocation_id = aws_eip.nlb_b.id
  }

  subnet_mapping {
    subnet_id     = aws_subnet.public_c.id
    allocation_id = aws_eip.nlb_c.id
  }

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "static-nlb"
  }
}

# Output the static IPs for documentation or client configuration
output "nlb_static_ips" {
  value = [
    aws_eip.nlb_a.public_ip,
    aws_eip.nlb_b.public_ip,
    aws_eip.nlb_c.public_ip,
  ]
  description = "Static IP addresses of the NLB"
}
```

## TLS Termination

NLBs can handle TLS termination for TCP traffic, offloading the encryption work from your backend instances.

```hcl
# TLS listener with ACM certificate
resource "aws_lb_listener" "tls" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "TLS"

  # TLS certificate from ACM
  certificate_arn = aws_acm_certificate.main.arn

  # TLS security policy
  ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Additional certificates for other domains
resource "aws_lb_listener_certificate" "additional" {
  listener_arn    = aws_lb_listener.tls.arn
  certificate_arn = aws_acm_certificate.additional.arn
}

# ACM certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "app.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

## TCP and UDP Listeners

NLBs support TCP, UDP, TCP_UDP, and TLS protocols.

```hcl
# TCP listener for application traffic
resource "aws_lb_listener" "tcp_app" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp_app.arn
  }
}

# UDP listener for game server or DNS
resource "aws_lb_listener" "udp" {
  load_balancer_arn = aws_lb.main.arn
  port              = 5000
  protocol          = "UDP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.udp_app.arn
  }
}

# TCP_UDP listener for services that need both
resource "aws_lb_listener" "tcp_udp" {
  load_balancer_arn = aws_lb.main.arn
  port              = 53
  protocol          = "TCP_UDP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dns.arn
  }
}

# UDP target group
resource "aws_lb_target_group" "udp_app" {
  name_prefix = "udp-"
  port        = 5000
  protocol    = "UDP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "TCP"      # Health checks are always TCP or HTTP
    port                = 8080       # Check a TCP port even for UDP targets
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }
}
```

Note that even for UDP target groups, health checks must use TCP or HTTP/HTTPS protocols.

## IP-Based Target Group

For targets outside your VPC, or for containers with dynamic port mapping, use IP-based target groups.

```hcl
# IP-based target group
resource "aws_lb_target_group" "ip_targets" {
  name_prefix = "ip-"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  # Preserve client IP when using IP target type
  preserve_client_ip = true

  # Sticky sessions based on source IP
  stickiness {
    enabled = true
    type    = "source_ip"
  }
}

# Register specific IP targets
resource "aws_lb_target_group_attachment" "ip_target_1" {
  target_group_arn = aws_lb_target_group.ip_targets.arn
  target_id        = "10.0.1.100"  # IP address of the target
  port             = 8080
}

resource "aws_lb_target_group_attachment" "ip_target_2" {
  target_group_arn = aws_lb_target_group.ip_targets.arn
  target_id        = "10.0.2.100"
  port             = 8080
}
```

## Internal NLB

For service-to-service communication within your VPC, use an internal NLB.

```hcl
# Internal NLB for private services
resource "aws_lb" "internal" {
  name               = "internal-nlb"
  internal           = true  # Not internet-facing
  load_balancer_type = "network"

  subnets = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
  ]

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "internal-nlb"
  }
}

# Private DNS record for the internal NLB
resource "aws_route53_record" "internal" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api.internal.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.internal.dns_name
    zone_id                = aws_lb.internal.zone_id
    evaluate_target_health = true
  }
}
```

## NLB Access Logging

NLB supports access logging to S3 for auditing and troubleshooting.

```hcl
# S3 bucket for NLB access logs
resource "aws_s3_bucket" "nlb_logs" {
  bucket_prefix = "nlb-access-logs-"
}

# Bucket policy allowing NLB to write logs
resource "aws_s3_bucket_policy" "nlb_logs" {
  bucket = aws_s3_bucket.nlb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.nlb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.nlb_logs.arn
      }
    ]
  })
}

# NLB with access logging enabled
resource "aws_lb" "logged" {
  name               = "logged-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = var.public_subnet_ids

  access_logs {
    bucket  = aws_s3_bucket.nlb_logs.id
    prefix  = "nlb"
    enabled = true
  }

  tags = {
    Name = "logged-nlb"
  }
}
```

## Proxy Protocol v2

Enable Proxy Protocol v2 to preserve client connection information when the NLB passes traffic to your targets.

```hcl
# Target group with proxy protocol v2
resource "aws_lb_target_group" "proxy_protocol" {
  name_prefix          = "proxy-"
  port                 = 8080
  protocol             = "TCP"
  vpc_id               = aws_vpc.main.id
  proxy_protocol_v2    = true  # Enable Proxy Protocol v2

  health_check {
    enabled             = true
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }
}
```

Your backend application needs to support Proxy Protocol v2 to parse the client information from the protocol header.

## Summary

NLBs are the go-to for Layer 4 load balancing on AWS. Use them when you need static IPs, extreme performance, UDP support, or client IP preservation. The key configuration decisions are: static IPs via subnet mappings, TLS termination at the NLB vs pass-through to backends, cross-zone load balancing for even distribution, and health check protocol selection for non-TCP targets.

For HTTP-level load balancing, see our existing guide on [creating Application Load Balancers with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-application-load-balancers-with-terraform/view). For more on target groups, check [creating target groups with Terraform](https://oneuptime.com/blog/post/2026-02-23-create-target-groups-with-terraform/view).
