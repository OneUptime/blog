# How to Configure PrivateLink Services with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PrivateLink, AWS, Networking, VPC, Security, NLB

Description: Learn how to configure AWS PrivateLink services with Terraform to expose your applications privately to other VPCs and accounts without public internet exposure.

---

AWS PrivateLink enables you to expose a service running in your VPC to other VPCs without requiring the traffic to cross the public internet. Consumers connect to your service through an interface VPC endpoint, and the traffic flows entirely within the AWS network. This is the same technology that powers VPC endpoints for AWS services, but you can use it for your own applications. Terraform makes it easy to set up both the service provider side (the endpoint service) and the consumer side (the VPC endpoint).

## How PrivateLink Works

The architecture consists of two sides. The service provider creates a Network Load Balancer (NLB) in front of their application and registers it as a VPC endpoint service. The service consumer creates a VPC endpoint that connects to the endpoint service. AWS creates an elastic network interface (ENI) in the consumer's VPC subnet with a private IP address. Traffic from the consumer flows through this ENI to the NLB in the provider's VPC.

The key advantage is that the provider's VPC and the consumer's VPC do not need overlapping CIDR ranges, peering connections, or any other connectivity. PrivateLink handles everything.

## Prerequisites

You need Terraform 1.0 or later, AWS accounts for both provider and consumer (or a single account for testing), and a Network Load Balancer fronting your service.

## Service Provider Configuration

First, set up the service provider side with an NLB and an endpoint service:

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

# VPC for the service provider
resource "aws_vpc" "provider" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "provider-vpc" }
}

# Private subnets for the NLB
resource "aws_subnet" "provider_a" {
  vpc_id            = aws_vpc.provider.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "provider-subnet-a" }
}

resource "aws_subnet" "provider_b" {
  vpc_id            = aws_vpc.provider.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "provider-subnet-b" }
}

# Network Load Balancer for the service
resource "aws_lb" "service" {
  name               = "privatelink-nlb"
  internal           = true
  load_balancer_type = "network"

  subnets = [
    aws_subnet.provider_a.id,
    aws_subnet.provider_b.id,
  ]

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "privatelink-nlb"
  }
}

# Target group for the service
resource "aws_lb_target_group" "service" {
  name     = "privatelink-tg"
  port     = 80
  protocol = "TCP"
  vpc_id   = aws_vpc.provider.id

  health_check {
    enabled             = true
    interval            = 30
    port                = "traffic-port"
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }

  tags = {
    Name = "privatelink-tg"
  }
}

# NLB listener
resource "aws_lb_listener" "service" {
  load_balancer_arn = aws_lb.service.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }
}
```

## Creating the VPC Endpoint Service

Now register the NLB as a VPC endpoint service:

```hcl
# Create the VPC endpoint service (PrivateLink service)
resource "aws_vpc_endpoint_service" "main" {
  # The NLB ARNs that back this service
  network_load_balancer_arns = [aws_lb.service.arn]

  # Require manual acceptance of connection requests
  acceptance_required = true

  # Allowed principals (AWS account IDs or ARNs)
  allowed_principals = [
    "arn:aws:iam::222222222222:root",
    "arn:aws:iam::333333333333:root",
  ]

  tags = {
    Name = "my-privatelink-service"
  }
}

# Output the service name for consumers to use
output "endpoint_service_name" {
  description = "The service name consumers need to create their endpoint"
  value       = aws_vpc_endpoint_service.main.service_name
}

output "endpoint_service_type" {
  description = "The type of service"
  value       = aws_vpc_endpoint_service.main.service_type
}
```

The `acceptance_required` parameter determines whether the provider must manually accept each consumer's connection request. Set it to `true` for better security control.

## Configuring Allowed Principals

You can control which AWS accounts can create endpoints to your service:

```hcl
# Separate resource for managing allowed principals
resource "aws_vpc_endpoint_service_allowed_principal" "consumer_1" {
  vpc_endpoint_service_id = aws_vpc_endpoint_service.main.id
  principal_arn           = "arn:aws:iam::222222222222:root"
}

resource "aws_vpc_endpoint_service_allowed_principal" "consumer_2" {
  vpc_endpoint_service_id = aws_vpc_endpoint_service.main.id
  principal_arn           = "arn:aws:iam::333333333333:root"
}
```

## Service Consumer Configuration

On the consumer side, create a VPC endpoint that connects to the PrivateLink service:

```hcl
# Consumer VPC
resource "aws_vpc" "consumer" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "consumer-vpc" }
}

# Consumer subnets
resource "aws_subnet" "consumer_a" {
  vpc_id            = aws_vpc.consumer.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "consumer-subnet-a" }
}

resource "aws_subnet" "consumer_b" {
  vpc_id            = aws_vpc.consumer.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "consumer-subnet-b" }
}

# Security group for the VPC endpoint
resource "aws_security_group" "endpoint" {
  name   = "endpoint-sg"
  vpc_id = aws_vpc.consumer.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.consumer.cidr_block]
    description = "Allow HTTP from consumer VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "endpoint-sg" }
}

# VPC endpoint to connect to the PrivateLink service
resource "aws_vpc_endpoint" "consumer" {
  vpc_id            = aws_vpc.consumer.id
  service_name      = aws_vpc_endpoint_service.main.service_name
  vpc_endpoint_type = "Interface"

  subnet_ids = [
    aws_subnet.consumer_a.id,
    aws_subnet.consumer_b.id,
  ]

  security_group_ids = [
    aws_security_group.endpoint.id,
  ]

  # Enable private DNS if the service supports it
  private_dns_enabled = false

  tags = {
    Name = "consumer-endpoint"
  }
}
```

## Accepting Connection Requests

If `acceptance_required` is `true`, you need to accept each connection:

```hcl
# Accept the VPC endpoint connection on the provider side
resource "aws_vpc_endpoint_connection_accepter" "accept" {
  vpc_endpoint_service_id = aws_vpc_endpoint_service.main.id
  vpc_endpoint_id         = aws_vpc_endpoint.consumer.id
}
```

## Private DNS Configuration

You can configure a private DNS name for your PrivateLink service:

```hcl
# Enable private DNS name for the service
resource "aws_vpc_endpoint_service" "main_with_dns" {
  network_load_balancer_arns = [aws_lb.service.arn]
  acceptance_required        = true
  private_dns_name           = "api.example.com"

  tags = {
    Name = "my-privatelink-service"
  }
}
```

After setting the private DNS name, you will need to verify domain ownership by creating a TXT record in your DNS.

## Notifications for Endpoint Events

Set up SNS notifications for endpoint connection events:

```hcl
# SNS topic for endpoint notifications
resource "aws_sns_topic" "endpoint_events" {
  name = "endpoint-connection-events"
}

# Notify when consumers connect or disconnect
resource "aws_vpc_endpoint_connection_notification" "events" {
  vpc_endpoint_service_id     = aws_vpc_endpoint_service.main.id
  connection_notification_arn = aws_sns_topic.endpoint_events.arn
  connection_events           = ["Accept", "Reject", "Delete", "Connect"]
}
```

## Outputs for the Consumer

Provide useful information for the consumer to connect:

```hcl
output "consumer_endpoint_dns" {
  description = "DNS entries for the consumer endpoint"
  value       = aws_vpc_endpoint.consumer.dns_entry
}

output "consumer_endpoint_id" {
  description = "The ID of the consumer VPC endpoint"
  value       = aws_vpc_endpoint.consumer.id
}
```

## Monitoring PrivateLink Services

Monitor your PrivateLink services to ensure they are accessible and performing well. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-privatelink-services-with-terraform/view) to track endpoint health, connection states, and response times across your PrivateLink infrastructure.

## Best Practices

Always use `acceptance_required = true` in production to control who can connect to your service. Use restrictive security groups on both the NLB and the consumer endpoint. Monitor connection notifications to track who is using your service. Use cross-zone load balancing on the NLB for better availability. Regularly review the list of allowed principals.

## Conclusion

AWS PrivateLink with Terraform gives you a secure, private way to expose services to other VPCs and accounts. By keeping all traffic on the AWS network and eliminating the need for VPC peering or internet gateways, PrivateLink provides strong network isolation. Managing this as Terraform code ensures your PrivateLink configuration is version-controlled, repeatable, and easy to audit.
