# How to Create Network Load Balancer with TLS in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, NLB, TLS, Load Balancer, Networking, Infrastructure as Code

Description: Learn how to create a Network Load Balancer with TLS termination in Terraform, including ACM certificates, target groups, health checks, and cross-zone load balancing.

---

Network Load Balancers (NLBs) operate at Layer 4 and are designed for extreme performance - handling millions of requests per second with ultra-low latency. When combined with TLS termination, NLBs can offload encryption from your backend services while maintaining high throughput. This guide covers creating and configuring an NLB with TLS using Terraform.

## Why NLB with TLS?

NLBs with TLS termination are ideal for scenarios requiring high-performance encrypted connections. Unlike Application Load Balancers, NLBs preserve the source IP address, support static IP addresses and Elastic IPs, and handle volatile workloads with sudden traffic spikes. TLS termination at the NLB means your backend services receive unencrypted traffic, reducing their CPU overhead.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a VPC with public and private subnets, and a domain name for the TLS certificate. We will create everything from scratch in this guide.

## Network Foundation

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC for the NLB
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "nlb-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Public subnets for the NLB
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "nlb-public-${count.index + 1}"
  }
}

# Private subnets for backend instances
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "nlb-private-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "nlb-igw"
  }
}
```

## ACM Certificate

```hcl
# TLS certificate for the NLB
resource "aws_acm_certificate" "nlb" {
  domain_name       = "api.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "nlb-tls-certificate"
  }
}

# DNS validation
data "aws_route53_zone" "main" {
  name         = "example.com"
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.nlb.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "nlb" {
  certificate_arn         = aws_acm_certificate.nlb.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Creating the Network Load Balancer

```hcl
# Network Load Balancer
resource "aws_lb" "main" {
  name               = "main-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.public[*].id

  # Enable cross-zone load balancing for even distribution
  enable_cross_zone_load_balancing = true

  # Enable deletion protection in production
  enable_deletion_protection = false

  tags = {
    Name = "main-nlb"
  }
}

# NLB with Elastic IPs for static IP addresses
resource "aws_eip" "nlb" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "nlb-eip-${count.index + 1}"
  }
}

# NLB with static Elastic IPs per subnet
resource "aws_lb" "static_ip" {
  name               = "static-ip-nlb"
  internal           = false
  load_balancer_type = "network"

  enable_cross_zone_load_balancing = true

  # Map each subnet to an Elastic IP
  dynamic "subnet_mapping" {
    for_each = { for idx, subnet in aws_subnet.public : idx => subnet }
    content {
      subnet_id     = subnet_mapping.value.id
      allocation_id = aws_eip.nlb[subnet_mapping.key].id
    }
  }

  tags = {
    Name = "static-ip-nlb"
  }
}
```

## TLS Listener Configuration

```hcl
# TLS listener on the NLB
resource "aws_lb_listener" "tls" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "TLS"
  certificate_arn   = aws_acm_certificate_validation.nlb.certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # Strong TLS policy

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Additional certificates for multiple domains
resource "aws_lb_listener_certificate" "additional" {
  listener_arn    = aws_lb_listener.tls.arn
  certificate_arn = aws_acm_certificate.additional_domain.arn
}

# TCP listener for non-TLS traffic (optional)
resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_http.arn
  }
}
```

## Target Groups

```hcl
# Target group for TLS-terminated traffic (receives plain TCP)
resource "aws_lb_target_group" "app" {
  name        = "app-tls-tg"
  port        = 8080
  protocol    = "TCP"  # Backend receives unencrypted TCP after TLS termination
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  # Health check configuration
  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 10  # NLB supports 10 or 30 second intervals
  }

  # Deregistration delay - time to drain connections
  deregistration_delay = 300

  # Stickiness (source IP based for NLB)
  stickiness {
    enabled = true
    type    = "source_ip"
  }

  tags = {
    Name = "app-tls-target-group"
  }
}

# Target group for HTTP traffic
resource "aws_lb_target_group" "app_http" {
  name        = "app-http-tg"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "app-http-target-group"
  }
}

# Target group for IP-based targets (useful for ECS/Fargate)
resource "aws_lb_target_group" "ip_based" {
  name        = "ip-based-tg"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"  # Use IP targets for containers

  health_check {
    enabled             = true
    protocol            = "TCP"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 10
  }

  tags = {
    Name = "ip-based-target-group"
  }
}
```

## TLS Passthrough Configuration

If you want the NLB to pass TLS traffic directly to your backend without termination.

```hcl
# TLS passthrough listener
resource "aws_lb_listener" "tls_passthrough" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8443
  protocol          = "TCP"  # Use TCP for passthrough, not TLS

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tls_passthrough.arn
  }
}

# Target group for TLS passthrough
resource "aws_lb_target_group" "tls_passthrough" {
  name        = "tls-passthrough-tg"
  port        = 443
  protocol    = "TCP"  # Backend handles TLS directly
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 10
  }

  tags = {
    Name = "tls-passthrough-tg"
  }
}
```

## DNS Record for the NLB

```hcl
# Route53 alias record pointing to the NLB
resource "aws_route53_record" "nlb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## CloudWatch Alarms for NLB

```hcl
# Monitor unhealthy targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "nlb-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/NetworkELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "NLB has unhealthy targets"

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
```

## Outputs

```hcl
output "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer"
  value       = aws_lb.main.dns_name
}

output "nlb_arn" {
  description = "ARN of the Network Load Balancer"
  value       = aws_lb.main.arn
}

output "nlb_static_ips" {
  description = "Elastic IPs assigned to the NLB"
  value       = aws_eip.nlb[*].public_ip
}

output "custom_domain" {
  description = "Custom domain for the NLB"
  value       = "https://api.example.com"
}
```

## Conclusion

Network Load Balancers with TLS termination provide high-performance encrypted connectivity for your applications. With Terraform, you can automate the complete setup including certificates, listeners, target groups, and DNS records. The combination of static IPs, cross-zone load balancing, and strong TLS policies makes NLBs an excellent choice for production workloads requiring both performance and security.

For related topics, check out our guide on [How to Configure Multi-Region Network Architecture with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-multi-region-network-architecture-with-terraform/view).
