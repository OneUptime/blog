# How to Configure AWS NLB with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, NLB, Network Load Balancer, Dualstack, Load Balancing, TCP

Description: Configure an AWS Network Load Balancer in dualstack mode for IPv6 TCP/UDP load balancing, including target group configuration and static IP assignments.

## Introduction

AWS Network Load Balancers support IPv6 through the same "dualstack" mechanism as ALBs, but with different capabilities: NLBs operate at Layer 4 (TCP/UDP/TLS), can preserve client source IP addresses depending on target group configuration, can use security groups, and support static IP assignments per availability zone. NLB dualstack enables IPv6 clients to connect to TCP/TLS services backed by IPv4 or IPv6 targets, while dualstack UDP listeners require IPv6 target groups.

## Create Dualstack NLB

```bash
# Create NLB with dualstack mode
# The selected subnets must have associated IPv6 CIDR blocks.
# If you want NLB-level filtering, specify security groups at creation time.

aws elbv2 create-load-balancer \
    --name my-dualstack-nlb \
    --type network \
    --scheme internet-facing \
    --ip-address-type dualstack \
    --subnets subnet-pub-a subnet-pub-b \
    --security-groups sg-0123456789abcdef0

# Or convert existing NLB to dualstack
NLB_ARN="arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/my-nlb/50dc6c495c0c9188"
aws elbv2 set-ip-address-type \
    --load-balancer-arn "$NLB_ARN" \
    --ip-address-type dualstack

# Get the NLB DNS name (includes both A and AAAA records)
aws elbv2 describe-load-balancers \
    --names my-dualstack-nlb \
    --query "LoadBalancers[0].{DNSName:DNSName, IpType:IpAddressType}"
```

## Terraform NLB with IPv6

```hcl
# nlb_ipv6.tf

resource "aws_lb" "nlb" {
  name               = "main-nlb"
  internal           = false
  load_balancer_type = "network"
  ip_address_type    = "dualstack"
  security_groups    = [aws_security_group.nlb.id]

  # NLBs in specific subnets
  subnet_mapping {
    subnet_id = aws_subnet.public_a.id
  }
  subnet_mapping {
    subnet_id = aws_subnet.public_b.id
  }

  # NLBs can use security groups when you associate them at creation time.
  # Target security groups can then reference the NLB security group.

  enable_deletion_protection = false

  tags = { Name = "main-nlb" }
}

# TCP target group
resource "aws_lb_target_group" "tcp_443" {
  name        = "tcp-targets-443"
  port        = 443
  protocol    = "TCP"
  target_type = "instance"
  vpc_id      = aws_vpc.main.id

  # Client IP preservation (NLB feature)
  preserve_client_ip = true

  health_check {
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 10
  }
}

# TCP target group
resource "aws_lb_target_group" "tcp_80" {
  name        = "tcp-targets-80"
  port        = 80
  protocol    = "TCP"
  target_type = "instance"
  vpc_id      = aws_vpc.main.id

  preserve_client_ip = true

  health_check {
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 10
  }
}

# TLS listener (NLB handles TLS termination)
resource "aws_lb_listener" "tls" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = "443"
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp_443.arn
  }
}

# TCP listener (no TLS termination)
resource "aws_lb_listener" "tcp_80" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = "80"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp_80.arn
  }
}
```

## NLB Source IP Preservation with IPv6

```hcl
# With the instance target groups above, IPv4 client addresses are preserved by default.
# IPv6 clients to IPv4 instance targets are translated, so backends see the NLB's private IPv4.
# Associate a security group with the NLB and reference it from the target security group.

resource "aws_security_group" "nlb" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "Allow IPv4 and IPv6 clients to reach the NLB"
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "Allow outbound traffic to targets and health checks"
  }
}

resource "aws_security_group" "nlb_target" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.nlb.id]
    description     = "Allow traffic from the NLB"
  }
}
```

## UDP Load Balancing with IPv6 (NLB Only)

```hcl
# NLB supports UDP - ALB does not
# For a dualstack NLB, UDP listeners require an IPv6 target group.
# For UDP source IP preservation with IPv6 clients, enable prefix for IPv6 source NAT on the NLB.
resource "aws_lb_listener" "udp_dns" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = "53"
  protocol          = "UDP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dns.arn
  }
}

resource "aws_lb_target_group" "dns" {
  name            = "dns-targets"
  port            = 53
  protocol        = "UDP"
  target_type     = "ip"
  ip_address_type = "ipv6"
  vpc_id          = aws_vpc.main.id

  health_check {
    protocol = "TCP"
    port     = 53
  }
}
```

## Conclusion

AWS NLBs with `ip_address_type = "dualstack"` accept IPv6 client connections at Layer 4. TCP and TLS listeners can forward to IPv4 or IPv6 targets, while dualstack UDP listeners require IPv6 target groups. Client IP preservation depends on the target group type, protocol, and whether the connection is translated between IPv4 and IPv6. NLBs can use security groups when you associate them at creation time, and the NLB DNS name includes both A and AAAA records when dualstack is enabled so clients can use IPv6 with IPv4 fallback.
