# How to Configure AWS ALB Dualstack IP Address Type for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, ALB, IPv6, Dual-Stack, Load Balancer, Cloud

Description: A guide to configuring AWS Application Load Balancer with dualstack IP address type to accept both IPv4 and IPv6 client connections.

AWS Application Load Balancer (ALB) supports dual-stack mode, allowing it to accept connections from both IPv4 and IPv6 clients. When `ip_address_type` is set to `dualstack`, AWS provides both an A record and a AAAA record for the ALB DNS name.

## Prerequisites

- A VPC with IPv6 CIDR block assigned
- Subnets with IPv6 CIDR blocks
- For internet-facing ALBs, an internet gateway and subnet route tables that route IPv6 traffic (`::/0`)
- Security groups and network ACLs that allow IPv6 traffic

## Enabling Dual-Stack via AWS Console

1. Navigate to EC2 → Load Balancers
2. Select your ALB
3. On the **Network mapping** tab, choose **Edit IP address type**
4. Set **IP address type** to `dualstack`
5. Save the changes

## Terraform Configuration

```hcl
# Enable IPv6 on the VPC

resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true

  tags = {
    Name = "main-vpc"
  }
}

# Subnets must have IPv6 CIDRs for dualstack ALB
resource "aws_subnet" "public_a" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.1.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1a"
  map_public_ip_on_launch         = true
}

resource "aws_subnet" "public_b" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.2.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 2)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1b"
  map_public_ip_on_launch         = true
}

# Internet gateway and IPv4/IPv6 routes for internet-facing access
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# Application Load Balancer with dual-stack
resource "aws_lb" "main" {
  name               = "main-alb"
  internal           = false
  load_balancer_type = "application"

  # Enable dual-stack (IPv4 + IPv6)
  ip_address_type = "dualstack"

  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id
  ]

  security_groups = [aws_security_group.alb.id]
}

# Security group must allow IPv6 traffic
resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = aws_vpc.main.id

  # Allow HTTP from IPv4 and IPv6
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # Allow HTTPS from IPv4 and IPv6
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
```

## AWS CLI Configuration

```bash
# Change an existing ALB to dualstack
aws elbv2 set-ip-address-type \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/main-alb/1234567890 \
  --ip-address-type dualstack

# Verify the change
aws elbv2 describe-load-balancers \
  --load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:... \
  --query 'LoadBalancers[].IpAddressType'
```

## Verifying Dual-Stack ALB

After your ALB listener and healthy targets are in place, verify IPv4 and IPv6 connectivity:

```bash
# Verify ALB has AAAA record
dig AAAA main-alb-123456789.us-east-1.elb.amazonaws.com

# Test IPv6 connectivity
curl -6 https://main-alb-123456789.us-east-1.elb.amazonaws.com/health

# Verify both IPv4 and IPv6 return the same response
curl -4 https://your-domain.com/health
curl -6 https://your-domain.com/health
```

## Target Group Considerations

Targets (EC2 instances) can be IPv4 even when ALB is dual-stack:

```hcl
resource "aws_lb_target_group" "main" {
  name     = "main-tg"
  port     = 80
  protocol = "HTTP"

  # Target type - IPv4 targets work with dual-stack ALB
  target_type = "instance"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}
```

**Note**: For IP-type target groups, set `ip_address_type = "ipv6"` and register IPv6 target addresses. IPv6 target groups can be used only with a dual-stack load balancer.

AWS ALB's dual-stack mode requires only a few focused changes - setting `ip_address_type = "dualstack"`, using IPv6-enabled subnets, and ensuring routing, security groups, and network ACLs allow IPv6 traffic - making it one of the easiest ways to add IPv6 support to existing workloads.
