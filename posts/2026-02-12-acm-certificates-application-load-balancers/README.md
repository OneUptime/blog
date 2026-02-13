# How to Set Up ACM Certificates with Application Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, ALB, SSL, Load Balancing

Description: Learn how to configure ACM SSL/TLS certificates with Application Load Balancers for HTTPS termination, including multiple certificates, redirects, and security policies.

---

Application Load Balancers handle HTTPS termination so your backend services don't have to deal with certificates. You attach an ACM certificate to the ALB, configure an HTTPS listener, and the ALB handles encryption/decryption for all traffic. Your backend instances communicate with the ALB over HTTP internally, simplifying your application setup.

This guide covers attaching certificates to ALBs, configuring HTTPS listeners, handling HTTP-to-HTTPS redirects, and managing multiple domains on a single load balancer.

## Basic Setup: HTTPS Listener with ACM

The process is: create an ACM certificate, validate it, then attach it to your ALB's HTTPS listener.

First, make sure you have a validated certificate. Unlike CloudFront, ALBs use certificates from the same region as the ALB.

```bash
# Request a certificate (same region as your ALB)
CERT_ARN=$(aws acm request-certificate \
  --domain-name "app.example.com" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

# After DNS validation completes, create the HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123" \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn="$CERT_ARN" \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn="arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-targets/abc123"
```

And add an HTTP listener that redirects to HTTPS.

```bash
# Create HTTP to HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123" \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }
  }]'
```

## Terraform Configuration

Here's a complete Terraform setup with certificate, ALB, and proper listeners.

```hcl
# ACM certificate (same region as ALB)
resource "aws_acm_certificate" "app" {
  domain_name               = "app.example.com"
  subject_alternative_names = ["api.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "app" {
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.app.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP redirect listener
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

# Target group
resource "aws_lb_target_group" "app" {
  name     = "app-targets"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}
```

## Multiple Certificates on One ALB

A single ALB can serve multiple domains with different certificates. ALB uses SNI to determine which certificate to present based on the requested hostname.

The first certificate is the default (attached to the listener). Additional certificates are added as listener certificates.

```bash
# Add an additional certificate to the HTTPS listener
aws elbv2 add-listener-certificates \
  --listener-arn "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc123/def456" \
  --certificates CertificateArn="arn:aws:acm:us-east-1:123456789012:certificate/second-cert-789"
```

In Terraform:

```hcl
# Additional certificate for a different domain
resource "aws_acm_certificate" "api" {
  domain_name       = "api.different-domain.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Attach additional certificate to the listener
resource "aws_lb_listener_certificate" "api" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate.api.arn
}
```

ALBs support up to 25 certificates per listener through SNI. That's enough for most multi-tenant setups.

## Host-Based Routing

With multiple certificates, you'll typically want to route traffic to different target groups based on the hostname.

```hcl
# Route api.example.com to the API target group
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = ["api.example.com"]
    }
  }
}

# Route app.example.com to the web app target group
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    host_header {
      values = ["app.example.com"]
    }
  }
}
```

## SSL Security Policies

The SSL policy determines which TLS versions and cipher suites your ALB supports. AWS provides predefined policies. Here are the ones you should consider.

**ELBSecurityPolicy-TLS13-1-2-2021-06** - Recommended. Supports TLS 1.2 and 1.3 with modern ciphers.

**ELBSecurityPolicy-TLS13-1-3-2021-06** - TLS 1.3 only. Use this if all your clients support TLS 1.3.

**ELBSecurityPolicy-2016-08** - The default. Supports TLS 1.0+. Don't use this for new deployments.

```bash
# List available SSL policies
aws elbv2 describe-ssl-policies \
  --query 'SslPolicies[*].{Name:Name,Protocols:SslProtocols}' \
  --output table

# Update the SSL policy on an existing listener
aws elbv2 modify-listener \
  --listener-arn "arn:aws:elasticloadbalancing:..." \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06
```

## Backend Communication

After HTTPS termination at the ALB, traffic to your backend instances is typically HTTP. If you need encryption all the way to the backend (end-to-end encryption), configure the target group for HTTPS.

```hcl
# Target group with HTTPS backend
resource "aws_lb_target_group" "encrypted_backend" {
  name     = "encrypted-backend"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = var.vpc_id

  health_check {
    path     = "/health"
    protocol = "HTTPS"
    port     = 443
  }
}
```

For most internal workloads, HTTP between ALB and backend is fine since it's within your VPC. End-to-end encryption adds complexity and slight latency. Use it when compliance requires it.

## Security Group Configuration

Your ALB security group should allow inbound HTTPS (and HTTP for redirects) and outbound to your backend targets.

```hcl
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = var.vpc_id

  # Allow HTTPS from the internet
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTP for redirect
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow traffic to backend instances
  egress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

# Backend instances only accept traffic from the ALB
resource "aws_security_group" "backend" {
  name_prefix = "backend-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
}
```

## Monitoring Certificate Status

Keep tabs on your certificate to catch issues before they cause outages.

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,InUseBy:InUseBy}'

# Check the listener's current certificate
aws elbv2 describe-listener-certificates \
  --listener-arn "arn:aws:elasticloadbalancing:..." \
  --query 'Certificates[*].CertificateArn'
```

## Wrapping Up

ACM certificates with ALBs are the standard way to handle HTTPS for web applications on AWS. The setup is straightforward: create a validated certificate, attach it to an HTTPS listener, add an HTTP redirect, and pick a modern TLS security policy. Use multiple certificates with SNI for multi-domain setups, and let ACM handle renewal automatically. For the full certificate lifecycle guide, check out [requesting and managing ACM certificates](https://oneuptime.com/blog/post/2026-02-12-request-manage-ssl-tls-certificates-acm/view).
