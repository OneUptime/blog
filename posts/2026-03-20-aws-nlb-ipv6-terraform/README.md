# How to Configure AWS NLB with IPv6 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, NLB, Load Balancer, Networking

Description: A guide to creating an AWS Network Load Balancer with IPv6 support using Terraform for TCP/UDP workloads.

The AWS Network Load Balancer (NLB) operates at Layer 4 and supports both IPv4 and IPv6 via its `dualstack` IP address type. NLBs are ideal for TCP/UDP workloads requiring ultra-low latency, static IPs, or TLS passthrough.

## Step 1: Create a VPC and Public Subnets with IPv6

```hcl
# vpc.tf - VPC with IPv6 CIDR

data "aws_availability_zones" "available" {}

resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
  tags = { Name = "main-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

resource "aws_subnet" "public" {
  count                           = 2
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.${count.index + 1}.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index)
  availability_zone               = data.aws_availability_zones.available.names[count.index]
  assign_ipv6_address_on_creation = true
  tags = { Name = "public-${count.index}" }
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

  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Step 2: Create the Dual-Stack NLB

```hcl
# nlb.tf - Network Load Balancer with dualstack IPv6
resource "aws_lb" "nlb" {
  name               = "main-nlb"
  internal           = false
  load_balancer_type = "network"

  # Subnets with IPv6 CIDRs
  subnets = aws_subnet.public[*].id

  # Enable both IPv4 and IPv6
  ip_address_type = "dualstack"

  # Security groups are optional for NLBs; this example omits them
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "main-nlb"
  }
}

output "nlb_dns_name" {
  value = aws_lb.nlb.dns_name
}
```

## Step 3: Create a TCP Target Group

```hcl
# target-group.tf - TCP target group for NLB
resource "aws_lb_target_group" "tcp" {
  name     = "tcp-tg"
  port     = 443
  protocol = "TCP"
  vpc_id   = aws_vpc.main.id

  # This example registers targets by private IPv4 address.
  # For IPv6 backend targets, set ip_address_type = "ipv6" and register IPv6 addresses.
  target_type     = "ip"
  ip_address_type = "ipv4"

  health_check {
    protocol            = "TCP"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 10
    interval            = 30
  }

  tags = {
    Name = "tcp-target-group"
  }
}
```

## Step 4: Create a TCP Listener

```hcl
# listener.tf - TCP listener on port 443
resource "aws_lb_listener" "tcp_443" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp.arn
  }
}
```

## Step 5: Register EC2 Instance Targets

```hcl
# target-registration.tf - Register instances by IP address
resource "aws_lb_target_group_attachment" "app" {
  count            = length(aws_instance.app)
  target_group_arn = aws_lb_target_group.tcp.arn

  # Register the instance's private IPv4 address in this IPv4 target group
  target_id = aws_instance.app[count.index].private_ip
  port      = 443
}
```

## Step 6: Verify IPv6 Resolution

```bash
terraform apply

# Check NLB DNS resolves to both A and AAAA records
NLB_DNS=$(terraform output -raw nlb_dns_name)
dig A "$NLB_DNS"
dig AAAA "$NLB_DNS"

# If your backend speaks HTTPS, test end-to-end over IPv6
curl -6 -k -v "https://$NLB_DNS/"
```

## IPv6 Client IP Preservation

Client IP preservation with NLB depends on the target type, protocol, and whether traffic stays in the same IP family:
- **Target type `instance`**: Client IP preservation is enabled by default
- **Target type `ip`** with `TCP` or `TLS`: Client IP preservation is disabled by default; enable `preserve_client_ip.enabled` if you need it
- **Dual-stack translation**: Client IP preservation only works when the client and target use the same IP version, so IPv6-to-IPv4 and IPv4-to-IPv6 flows show the NLB node IP at the target

NLBs are the recommended choice for latency-sensitive TCP/UDP workloads that need IPv6 support, providing optional static IPv4 addresses via Elastic IP assignment and client IP preservation when the target group configuration supports it.
