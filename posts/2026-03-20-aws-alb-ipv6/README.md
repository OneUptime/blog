# How to Configure AWS ALB with IPv6 (Dualstack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, ALB, Application Load Balancer, Dualstack, Load Balancing

Description: Configure an AWS Application Load Balancer in dualstack mode to accept both IPv4 and IPv6 client connections while forwarding traffic to backend targets.

## Introduction

AWS Application Load Balancers support IPv6 through a "dualstack" IP address type, which creates both IPv4 (A record) and IPv6 (AAAA record) DNS entries. When clients connect over IPv6, the ALB handles the connection and forwards traffic to backend targets using IPv4 or IPv6 depending on target group configuration. This enables public IPv6 access without requiring all backend instances to be IPv6-enabled.

## Create Dualstack ALB

```bash
# Create ALB with dualstack (IPv4 + IPv6) mode
# The selected subnets must already have associated IPv6 CIDR blocks.

ALB_ARN=$(aws elbv2 create-load-balancer \
    --name my-dualstack-alb \
    --subnets subnet-0abc1234def567890 subnet-0123456789abcdef0 \
    --security-groups sg-0123456789abcdef0 \
    --scheme internet-facing \
    --type application \
    --ip-address-type dualstack \
    --tags Key=Name,Value=dualstack-alb \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text)

# Or, if updating an existing ALB, set its ARN instead:
# ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/50dc6c495c0c9188"

aws elbv2 set-ip-address-type \
    --load-balancer-arn "$ALB_ARN" \
    --ip-address-type dualstack

# Verify
aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --query "LoadBalancers[0].{Name:LoadBalancerName, Type:Type, IpAddressType:IpAddressType, DNSName:DNSName}"
```

## Terraform ALB with IPv6

```hcl
# alb_ipv6.tf

resource "aws_lb" "main" {
  name               = "main-dualstack-alb"
  internal           = false
  load_balancer_type = "application"

  # Dualstack enables both IPv4 and IPv6
  ip_address_type = "dualstack"

  security_groups = [aws_security_group.alb.id]
  subnets         = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
  ]

  enable_deletion_protection = false

  tags = { Name = "main-alb" }
}

# Security group must allow IPv6 traffic to ALB
resource "aws_security_group" "alb" {
  vpc_id = aws_vpc.main.id
  name   = "alb-sg"

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_lb_target_group" "web" {
  name        = "web-targets"
  port        = 80
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# DNS records - create both A and AAAA ALIAS records for a dualstack ALB
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www"
  type    = "AAAA"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Verify ALB IPv6 Configuration

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --query "LoadBalancers[0].DNSName" \
    --output text)

# Check AAAA record for ALB DNS
dig AAAA "$ALB_DNS"

# Test IPv6 connection using your hostname
curl -6 -I "https://www.example.com/"

# Test with a specific ALB IPv6 address while preserving the hostname for TLS/SNI
IPV6_ADDR=$(dig +short AAAA "$ALB_DNS" | head -1)
curl -6 -I --resolve www.example.com:443:[${IPV6_ADDR}] https://www.example.com/
```

## Conclusion

ALB dualstack mode (`ip_address_type = "dualstack"`) makes the ALB DNS name resolvable with both A and AAAA records, enabling IPv6 clients to connect while maintaining full IPv4 support. The ALB handles IPv6 termination and can forward to IPv4-only backends, making it an effective IPv6 gateway for existing IPv4 workloads. Ensure the ALB's security group includes IPv6 rules for both HTTP (80) and HTTPS (443) - these are separate from IPv4 rules. For a custom Route53 name, create both A and AAAA ALIAS records if you want clients to use both address families.
