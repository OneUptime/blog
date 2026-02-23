# How to Configure SSL Termination on Load Balancer with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, SSL, TLS, Load Balancer, AWS, ACM, HTTPS, Security

Description: Learn how to configure SSL/TLS termination on AWS Application Load Balancers with Terraform using ACM certificates and modern security policies.

---

SSL termination on a load balancer handles the encryption and decryption of HTTPS traffic at the load balancer level, so your backend instances only deal with unencrypted HTTP traffic. This offloads the CPU-intensive TLS processing from your application servers and simplifies certificate management by centralizing it at the load balancer. Terraform combined with AWS Certificate Manager (ACM) makes it straightforward to provision certificates and configure HTTPS listeners.

## Why SSL Termination at the Load Balancer

Performing SSL termination at the load balancer offers several advantages. Your backend instances do not need to manage certificates or handle TLS handshakes. You can use AWS Certificate Manager for free public certificates that auto-renew. Centralized certificate management means you update certificates in one place rather than on every server. You also gain the ability to inspect and route traffic based on HTTP headers after decryption.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a registered domain name, and a Route 53 hosted zone (for DNS validation of ACM certificates).

## Provisioning an ACM Certificate

Start by requesting an SSL/TLS certificate from ACM:

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

# Reference the hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Request an ACM certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "app.example.com"
  validation_method = "DNS"

  # Include additional subject alternative names
  subject_alternative_names = [
    "*.app.example.com",
    "api.example.com",
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "app-certificate"
  }
}

# Create DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Creating the Load Balancer

Set up the ALB with security groups:

```hcl
# VPC and subnets (assuming they exist)
data "aws_vpc" "main" {
  tags = { Name = "main-vpc" }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

# Security group for the ALB
resource "aws_security_group" "alb" {
  name   = "alb-ssl-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP for redirect"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "alb-ssl-sg" }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ssl-termination-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  tags = { Name = "ssl-termination-alb" }
}

# Target group (HTTP because SSL is terminated at the ALB)
resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.main.id

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

  tags = { Name = "app-tg" }
}
```

## Configuring the HTTPS Listener

Create the HTTPS listener with the ACM certificate:

```hcl
# HTTPS listener with SSL termination
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"

  # Use the validated ACM certificate
  certificate_arn = aws_acm_certificate_validation.main.certificate_arn

  # TLS security policy
  ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP listener that redirects to HTTPS
resource "aws_lb_listener" "http_redirect" {
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

## Choosing the Right SSL Policy

AWS provides several predefined SSL policies. Here are the recommended options:

```hcl
# For maximum security (TLS 1.3 only)
# ssl_policy = "ELBSecurityPolicy-TLS13-1-3-2021-06"

# For TLS 1.2 and 1.3 (recommended for most use cases)
# ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"

# For backward compatibility (supports TLS 1.0+)
# ssl_policy = "ELBSecurityPolicy-2016-08"

# FIPS compliant
# ssl_policy = "ELBSecurityPolicy-TLS13-1-2-FIPS-2023-04"
```

## Adding Additional Certificates

For serving multiple domains from the same ALB, add additional certificates:

```hcl
# Additional certificate for another domain
resource "aws_acm_certificate" "api" {
  domain_name       = "api.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "api-certificate" }
}

# Add the certificate to the HTTPS listener
resource "aws_lb_listener_certificate" "api" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate.api.arn
}
```

The ALB uses Server Name Indication (SNI) to select the correct certificate based on the hostname in the TLS handshake.

## End-to-End Encryption (Re-encryption)

If you need encryption between the ALB and your backends:

```hcl
# Target group with HTTPS (re-encryption to backends)
resource "aws_lb_target_group" "app_encrypted" {
  name     = "app-encrypted-tg"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = data.aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTPS"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "app-encrypted-tg" }
}
```

## DNS Configuration

Point your domain to the ALB:

```hcl
# Route 53 alias record pointing to the ALB
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Outputs

```hcl
output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}
```

## Monitoring SSL Termination

Monitor your SSL/TLS setup with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-ssl-termination-on-load-balancer-with-terraform/view) to track certificate expiration dates, TLS handshake errors, and HTTPS response times.

## Best Practices

Always redirect HTTP to HTTPS. Use the latest TLS security policy that meets your compatibility requirements. Enable access logging on the ALB. Use ACM for certificate management since it handles renewals automatically. Add certificate expiration monitoring as a safety net. Consider end-to-end encryption for sensitive data.

## Conclusion

SSL termination on a load balancer with Terraform provides a clean, automated approach to HTTPS configuration. By leveraging ACM for certificates and Terraform for infrastructure, you get auto-renewing certificates, centralized TLS management, and consistent configuration across environments. This setup ensures your applications are served securely while keeping the complexity away from your backend servers.
