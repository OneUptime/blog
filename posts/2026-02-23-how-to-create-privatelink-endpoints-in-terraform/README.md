# How to Create PrivateLink Endpoints in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, PrivateLink, VPC, Networking, Infrastructure as Code

Description: Learn how to create and manage AWS PrivateLink VPC endpoints using Terraform for secure private connectivity to AWS services and your own applications.

---

AWS PrivateLink lets you access AWS services and third-party applications privately, without exposing traffic to the public internet. Instead of routing through an internet gateway or NAT device, PrivateLink creates a private connection between your VPC and the target service using elastic network interfaces within your subnets.

If you are managing infrastructure with Terraform, setting up PrivateLink endpoints becomes straightforward and repeatable. This guide walks through creating both interface and gateway VPC endpoints, configuring security groups, and connecting to endpoint services.

## Prerequisites

Before getting started, you need:

- Terraform 1.0 or later installed
- AWS CLI configured with appropriate credentials
- An existing VPC with subnets
- Basic familiarity with Terraform HCL syntax

## Understanding VPC Endpoint Types

AWS offers two types of VPC endpoints:

**Gateway Endpoints** work with S3 and DynamoDB only. They add a route to your route table that directs traffic to the service through the AWS network.

**Interface Endpoints** use PrivateLink and create an elastic network interface in your subnet with a private IP address. These work with most AWS services and can also connect to endpoint services hosted by other AWS accounts.

## Setting Up the Provider

Start with the basic AWS provider configuration:

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
  region = var.aws_region
}

# Define variables for reuse
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "ID of the VPC where endpoints will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for interface endpoints"
  type        = list(string)
}
```

## Creating a Gateway Endpoint for S3

Gateway endpoints are the simplest to set up. They do not require security groups or subnets - just a route table association:

```hcl
# Look up route tables for the VPC
data "aws_route_tables" "private" {
  vpc_id = var.vpc_id

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Create a gateway endpoint for S3
resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  # Gateway type for S3
  vpc_endpoint_type = "Gateway"

  # Associate with private route tables
  route_table_ids = data.aws_route_tables.private.ids

  # Add a policy to restrict access if needed
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAll"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:*"
        Resource  = "*"
      }
    ]
  })

  tags = {
    Name        = "s3-gateway-endpoint"
    Environment = "production"
  }
}
```

## Creating an Interface Endpoint

Interface endpoints require a security group to control inbound and outbound traffic. Here is how to create one for the SSM service:

```hcl
# Security group for interface endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  description = "Security group for VPC interface endpoints"
  vpc_id      = var.vpc_id

  # Allow HTTPS traffic from the VPC CIDR
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
    description = "Allow HTTPS from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "vpc-endpoints-sg"
  }
}

# Reference the VPC data
data "aws_vpc" "selected" {
  id = var.vpc_id
}

# Create an interface endpoint for SSM
resource "aws_vpc_endpoint" "ssm" {
  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${var.aws_region}.ssm"
  vpc_endpoint_type  = "Interface"

  # Place the ENIs in specified subnets
  subnet_ids         = var.subnet_ids

  # Attach the security group
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  # Enable private DNS so the default service hostname
  # resolves to the private endpoint IP
  private_dns_enabled = true

  tags = {
    Name        = "ssm-interface-endpoint"
    Environment = "production"
  }
}
```

## Creating Multiple Interface Endpoints with a Module

When you need several endpoints, repeating the same configuration gets tedious. Use a `for_each` loop to create them from a list:

```hcl
# Define which services need interface endpoints
variable "interface_endpoint_services" {
  description = "List of AWS services for interface endpoints"
  type        = list(string)
  default = [
    "ssm",
    "ssmmessages",
    "ec2messages",
    "logs",
    "monitoring",
    "ecr.api",
    "ecr.dkr",
    "ecs",
    "ecs-telemetry",
    "secretsmanager"
  ]
}

# Create interface endpoints for each service
resource "aws_vpc_endpoint" "interface_endpoints" {
  for_each = toset(var.interface_endpoint_services)

  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${var.aws_region}.${each.value}"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  # Enable private DNS for all interface endpoints
  private_dns_enabled = true

  tags = {
    Name    = "${each.value}-endpoint"
    Service = each.value
  }
}
```

This approach keeps your code clean and makes it easy to add or remove services from the list.

## Creating a PrivateLink Endpoint Service

If you want to expose your own application to other VPCs or AWS accounts through PrivateLink, you create an endpoint service backed by a Network Load Balancer:

```hcl
# Reference your existing NLB
data "aws_lb" "app_nlb" {
  name = "my-application-nlb"
}

# Create the endpoint service
resource "aws_vpc_endpoint_service" "app_service" {
  # Disable acceptance so connections are auto-approved
  acceptance_required = false

  # Attach the NLB as the backing resource
  network_load_balancer_arns = [data.aws_lb.app_nlb.arn]

  tags = {
    Name = "my-app-endpoint-service"
  }
}

# Allow specific AWS accounts to connect
resource "aws_vpc_endpoint_service_allowed_principal" "allowed_accounts" {
  vpc_endpoint_service_id = aws_vpc_endpoint_service.app_service.id
  principal_arn           = "arn:aws:iam::123456789012:root"
}

# Output the service name for consumers
output "endpoint_service_name" {
  description = "Service name for consumers to connect to"
  value       = aws_vpc_endpoint_service.app_service.service_name
}
```

## Connecting to a Third-Party Endpoint Service

To connect to an endpoint service from another account or a third-party provider:

```hcl
# Connect to a third-party endpoint service
resource "aws_vpc_endpoint" "third_party" {
  vpc_id             = var.vpc_id
  service_name       = var.third_party_service_name
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  # Private DNS may not be available for third-party services
  private_dns_enabled = false

  tags = {
    Name = "third-party-endpoint"
  }
}

variable "third_party_service_name" {
  description = "The service name provided by the third-party"
  type        = string
}
```

## Adding an Endpoint Policy

You can restrict what actions are allowed through a VPC endpoint by attaching a policy:

```hcl
# Interface endpoint with a restrictive policy
resource "aws_vpc_endpoint" "s3_restricted" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.private.ids

  # Only allow access to a specific bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSpecificBucket"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-application-bucket",
          "arn:aws:s3:::my-application-bucket/*"
        ]
      }
    ]
  })

  tags = {
    Name = "s3-restricted-endpoint"
  }
}
```

## Useful Outputs

Expose endpoint information for other modules or debugging:

```hcl
# Output endpoint DNS entries
output "ssm_endpoint_dns" {
  description = "DNS entries for the SSM endpoint"
  value       = aws_vpc_endpoint.ssm.dns_entry
}

# Output all interface endpoint IDs
output "interface_endpoint_ids" {
  description = "Map of service name to endpoint ID"
  value = {
    for k, v in aws_vpc_endpoint.interface_endpoints : k => v.id
  }
}
```

## Monitoring and Troubleshooting

Once your endpoints are deployed, you should monitor them through OneUptime to track connectivity issues and response times. Set up alerts for endpoint state changes so you know immediately if a PrivateLink connection goes down. You can learn more about monitoring infrastructure at https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudtrail-trails-in-terraform/view for audit logging of endpoint usage.

Common issues to watch for:

- DNS resolution failing because `private_dns_enabled` was not set
- Security group rules blocking port 443
- Subnet availability zone mismatches with the endpoint service
- Endpoint policies that are too restrictive

## Wrapping Up

PrivateLink endpoints are a fundamental building block for secure AWS architectures. By managing them with Terraform, you get consistent deployments across environments and a clear record of what endpoints exist and how they are configured. The `for_each` pattern shown above scales well as your endpoint count grows, and endpoint policies give you fine-grained control over service access.

Start with the services your workloads actually need, and expand from there. Not every service requires an endpoint - focus on those that handle sensitive data or need to stay off the public internet.
