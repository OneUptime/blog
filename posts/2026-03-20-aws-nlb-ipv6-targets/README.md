# How to Configure AWS NLB with IPv6 Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, NLB, IPv6, Network Load Balancer, Dual-Stack, Cloud

Description: A guide to configuring AWS Network Load Balancer with IPv6 support, including dual-stack listeners and IPv6 target registration.

AWS Network Load Balancer (NLB) supports IPv6 through dual-stack mode, enabling it to accept connections from IPv6 clients and forward traffic to IPv6 targets. NLB operates at Layer 4 and can preserve the client source IP for same-family connections, including IPv6 clients reaching IPv6 targets.

## NLB IPv6 Terraform Configuration

```hcl
# VPC with IPv6

resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
}

# Public subnets with IPv6
resource "aws_subnet" "public_a" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.1.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1a"
  map_public_ip_on_launch         = true
}

# Security group for the NLB
resource "aws_security_group" "nlb" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port        = 443
    to_port          = 443
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

# Network Load Balancer with dual-stack
resource "aws_lb" "nlb" {
  name               = "main-nlb"
  internal           = false
  load_balancer_type = "network"

  # Enable dual-stack for NLB
  ip_address_type = "dualstack"
  security_groups = [aws_security_group.nlb.id]

  subnet_mapping {
    subnet_id = aws_subnet.public_a.id
    # Optionally assign specific Elastic IPs
  }
}

# TCP Listener - accepts both IPv4 and IPv6 in dualstack mode
resource "aws_lb_listener" "tcp_443" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# Target group for instances
resource "aws_lb_target_group" "main" {
  name        = "main-nlb-tg"
  port        = 443
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"
  # Registered instances must have a primary IPv6 address
  ip_address_type = "ipv6"

  health_check {
    protocol = "TCP"
    port     = 443
    interval = 10
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}
```

## IPv6 IP-Type Target Groups

For registering specific IPv6 target addresses:

```hcl
# Target group with IP type (supports IPv6 targets)
resource "aws_lb_target_group" "ipv6_targets" {
  name        = "ipv6-tg"
  port        = 80
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id

  # IP type allows direct IPv4 and IPv6 address registration
  target_type = "ip"

  # Specify IPv6 address family
  ip_address_type = "ipv6"
}

# Register an IPv6 target
resource "aws_lb_target_group_attachment" "ipv6_target" {
  target_group_arn = aws_lb_target_group.ipv6_targets.arn
  target_id        = "2001:db8::10"   # Example only; use an IPv6 address from your VPC or peered VPC CIDR
  port             = 80
  availability_zone = "all"
}
```

## AWS CLI: Configure NLB with IPv6

```bash
# Create NLB with dual-stack
aws elbv2 create-load-balancer \
  --name main-nlb \
  --type network \
  --ip-address-type dualstack \
  --subnets subnet-12345 subnet-67890

# Create IPv6 target group
aws elbv2 create-target-group \
  --name ipv6-tg \
  --protocol TCP \
  --port 443 \
  --vpc-id vpc-12345 \
  --target-type ip \
  --ip-address-type ipv6

# Register IPv6 target
# Use an IPv6 address from your VPC or peered VPC CIDR
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=2001:db8::10,Port=443
```

## NLB Source IP Preservation with IPv6

NLB can preserve the client source IP for same-family connections. With dual-stack NLBs, IPv6 client IP preservation works for IPv6 clients reaching IPv6 targets, but IPv4-to-IPv6 or IPv6-to-IPv4 translation replaces the client IP with an NLB address:

```bash
# On IPv6 targets, IPv6 clients appear directly in access logs
# /var/log/nginx/access.log
# 2001:db8::client - - [20/Mar/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 1234

# NLB does not add X-Forwarded-For headers.
# For IPv4-to-IPv6 or IPv6-to-IPv4 translation, use Proxy Protocol v2
# if the application needs the original client IP.
```

## Security Groups for IPv6 NLB Targets

When the NLB has an associated security group, reference that security group from the targets. This works even when client IP preservation is enabled:

```hcl
resource "aws_security_group" "target" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.nlb.id]
  }
}
```

## Verifying NLB IPv6

```bash
# Check NLB has AAAA DNS record
dig AAAA main-nlb-xxx.elb.amazonaws.com

# Test TCP over IPv6
nc -6 -w 5 main-nlb-xxx.elb.amazonaws.com 443 && echo "Connected"

# Test HTTP over IPv6
curl -6 -v https://main-nlb-xxx.elb.amazonaws.com/
```

AWS NLB's dual-stack mode is ideal for Layer 4 services that need to preserve the real IPv6 client source address for IPv6 clients, such as syslog receivers, custom TCP protocols, and applications that use source IP for authentication.
