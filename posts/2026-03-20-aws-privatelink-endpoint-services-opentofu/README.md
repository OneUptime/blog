# How to Create AWS PrivateLink Endpoint Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, PrivateLink, VPC Endpoint Services, Private Connectivity, SaaS, Infrastructure as Code

Description: Learn how to create AWS PrivateLink endpoint services with OpenTofu to expose internal NLB-backed services privately to other VPCs and AWS accounts without public internet exposure.

## Introduction

AWS PrivateLink allows you to expose services to other VPCs or AWS accounts via private IP addresses without VPC peering, internet gateways, or NAT. Service providers create endpoint services backed by Network Load Balancers; consumers create VPC Interface Endpoints to access the service. Traffic never leaves the AWS network.

## Prerequisites

- OpenTofu v1.6+
- A Network Load Balancer backing the service
- AWS credentials with EC2 and VPC permissions

## Step 1: Create Service Provider NLB

```hcl
resource "aws_lb" "service" {
  name               = "${var.project_name}-service-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "${var.project_name}-service-nlb"
  }
}

resource "aws_lb_target_group" "service" {
  name        = "${var.project_name}-service-tg"
  port        = 443
  protocol    = "TLS"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled  = true
    protocol = "HTTPS"
    path     = "/health"
    port     = "443"
  }
}

resource "aws_lb_listener" "service" {
  load_balancer_arn = aws_lb.service.arn
  port              = "443"
  protocol          = "TLS"
  certificate_arn   = var.acm_certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }
}
```

## Step 2: Create VPC Endpoint Service (Provider Side)

```hcl
resource "aws_vpc_endpoint_service" "main" {
  acceptance_required        = true   # Require manual approval for new connections
  network_load_balancer_arns = [aws_lb.service.arn]

  # Allowed principals (AWS accounts or IAM ARNs)
  # Use "*" only if you intentionally want any AWS principal to discover the service
  allowed_principals = [
    "arn:aws:iam::${var.consumer_account_id}:root"
  ]

  # Private DNS name requires domain ownership verification before consumers can use it
  private_dns_name = "service.${var.domain_name}"

  tags = {
    Name = "${var.project_name}-endpoint-service"
  }
}

output "service_name" {
  value       = aws_vpc_endpoint_service.main.service_name
  description = "Service name to share with consumers: e.g., com.amazonaws.vpce.us-east-1.vpce-svc-xxx"
}

output "service_id" {
  value       = aws_vpc_endpoint_service.main.id
  description = "Service ID for provider-side acceptance and status checks"
}
```

## Step 3: Accept Connection Requests (Provider Side)

```bash
# Review pending connection requests for this endpoint service
aws ec2 describe-vpc-endpoint-connections \
  --filters Name=service-id,Values=<service-id> Name=vpc-endpoint-state,Values=pendingAcceptance

# Accept a specific pending connection request
aws ec2 accept-vpc-endpoint-connections \
  --service-id <service-id> \
  --vpc-endpoint-ids <vpce-id>
```

## Step 4: Create Interface Endpoint (Consumer Side)

```hcl
# Consumer VPC creates an interface endpoint to connect to the service
resource "aws_vpc_endpoint" "service" {
  vpc_id              = var.consumer_vpc_id
  service_name        = var.endpoint_service_name  # From provider output
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.consumer_private_subnet_ids
  security_group_ids  = [aws_security_group.endpoint.id]

  tags = {
    Name = "${var.project_name}-service-endpoint"
  }
}

resource "aws_vpc_endpoint_private_dns" "service" {
  vpc_endpoint_id     = aws_vpc_endpoint.service.id
  private_dns_enabled = true  # Requires the provider private DNS name to be verified
}

resource "aws_security_group" "endpoint" {
  name        = "${var.project_name}-endpoint-sg"
  description = "Security group for PrivateLink endpoint"
  vpc_id      = var.consumer_vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.consumer_vpc_cidr]
    description = "Allow HTTPS from VPC"
  }
}

output "endpoint_dns" {
  value = aws_vpc_endpoint.service.dns_entry[0].dns_name
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check endpoint service state
aws ec2 describe-vpc-endpoint-service-configurations \
  --service-ids <service-id> \
  --query 'ServiceConfigurations[0].ServiceState' \
  --output text
```

## Conclusion

PrivateLink is the recommended architecture for SaaS providers and internal platform teams exposing services to multiple consumer VPCs or accounts. It's more secure than VPC peering because consumers can only access the specific service endpoint, not the entire provider VPC network. Use `acceptance_required = true` in production to control which consumers can connect, and review pending connection requests via the AWS console or `describe-vpc-endpoint-connections` API.
