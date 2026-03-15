# How to Configure Interface VPC Endpoints with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC Endpoint, PrivateLink, Networking, Infrastructure as Code

Description: Learn how to configure Interface VPC Endpoints (AWS PrivateLink) with Terraform to securely access AWS services from private subnets without internet connectivity.

---

Interface VPC Endpoints, powered by AWS PrivateLink, create private connections between your VPC and AWS services using elastic network interfaces (ENIs) with private IP addresses. Unlike Gateway Endpoints that modify route tables, Interface Endpoints place ENIs directly in your subnets, allowing services like SQS, SNS, Systems Manager, and many others to be accessed privately. In this guide, we will configure Interface VPC Endpoints using Terraform.

## Gateway vs Interface Endpoints

Gateway Endpoints work only for S3 and DynamoDB and modify route tables. Interface Endpoints work for most AWS services and create ENIs in your subnets. Interface Endpoints cost money (per hour plus per GB of data processed), but they provide DNS-based resolution and can be used with security groups for granular access control.

If you need endpoints for S3 and DynamoDB, check out our guide on [How to Create VPC Endpoints for S3 and DynamoDB with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-vpc-endpoints-for-s3-and-dynamodb-with-terraform/view).

## Prerequisites

You need Terraform 1.0 or later, an AWS account with appropriate permissions, and an existing VPC with private subnets. DNS support and DNS hostnames must be enabled on the VPC for private DNS to work correctly.

## Base VPC Configuration

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC with DNS support enabled (required for private DNS)
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true   # Required for Interface Endpoints
  enable_dns_hostnames = true   # Required for private DNS resolution

  tags = {
    Name = "main-vpc"
  }
}

# Private subnets across multiple AZs for endpoint redundancy
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-subnet-${count.index + 1}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

## Security Group for Interface Endpoints

Interface Endpoints require a security group that allows inbound HTTPS traffic from your VPC.

```hcl
# Security group for all Interface VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for VPC Interface Endpoints"

  # Allow HTTPS from the entire VPC CIDR
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  # Allow all outbound (endpoints need to respond)
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
```

## Creating Common Interface Endpoints

Here are the most commonly needed Interface Endpoints for production workloads.

### Systems Manager Endpoints

These three endpoints enable AWS Systems Manager to manage EC2 instances in private subnets without internet access.

```hcl
# SSM endpoint - for Systems Manager API calls
resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true  # Overrides public DNS for the service

  tags = {
    Name = "ssm-endpoint"
  }
}

# SSM Messages endpoint - for Session Manager connections
resource "aws_vpc_endpoint" "ssm_messages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ssm-messages-endpoint"
  }
}

# EC2 Messages endpoint - required for SSM to communicate with EC2
resource "aws_vpc_endpoint" "ec2_messages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ec2-messages-endpoint"
  }
}
```

### ECR and Docker Endpoints

For pulling container images in private subnets, you need ECR API, ECR Docker, and S3 endpoints.

```hcl
# ECR API endpoint - for ECR API operations
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ecr-api-endpoint"
  }
}

# ECR Docker endpoint - for docker pull/push operations
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ecr-dkr-endpoint"
  }
}
```

### CloudWatch and Logging Endpoints

```hcl
# CloudWatch Logs endpoint - for sending logs privately
resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "cloudwatch-logs-endpoint"
  }
}

# CloudWatch Monitoring endpoint - for sending metrics privately
resource "aws_vpc_endpoint" "cloudwatch_monitoring" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.monitoring"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "cloudwatch-monitoring-endpoint"
  }
}
```

### SQS and SNS Endpoints

```hcl
# SQS endpoint for private queue access
resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.sqs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "sqs-endpoint"
  }
}

# SNS endpoint for private notification access
resource "aws_vpc_endpoint" "sns" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.sns"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "sns-endpoint"
  }
}
```

## Dynamic Endpoint Creation with for_each

For managing many endpoints efficiently, use a map and for_each.

```hcl
# Define all endpoints in a map
locals {
  interface_endpoints = {
    ssm          = "com.amazonaws.us-east-1.ssm"
    ssmmessages  = "com.amazonaws.us-east-1.ssmmessages"
    ec2messages  = "com.amazonaws.us-east-1.ec2messages"
    ecr_api      = "com.amazonaws.us-east-1.ecr.api"
    ecr_dkr      = "com.amazonaws.us-east-1.ecr.dkr"
    logs         = "com.amazonaws.us-east-1.logs"
    monitoring   = "com.amazonaws.us-east-1.monitoring"
    sqs          = "com.amazonaws.us-east-1.sqs"
    sns          = "com.amazonaws.us-east-1.sns"
    sts          = "com.amazonaws.us-east-1.sts"
    kms          = "com.amazonaws.us-east-1.kms"
    secretsmanager = "com.amazonaws.us-east-1.secretsmanager"
  }
}

# Create all Interface Endpoints dynamically
resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.main.id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${each.key}-endpoint"
  }
}
```

## Interface Endpoint with Custom Policy

Restrict what operations can be performed through the endpoint.

```hcl
# Secrets Manager endpoint with restricted policy
resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  # Only allow reading secrets, not creating or deleting
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowReadOnly"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "secrets-manager-endpoint"
  }
}
```

## Outputs for Reference

```hcl
# Output all endpoint IDs and DNS entries
output "endpoint_ids" {
  description = "Map of endpoint names to their IDs"
  value       = { for k, v in aws_vpc_endpoint.interface : k => v.id }
}

output "endpoint_dns_entries" {
  description = "DNS entries for each interface endpoint"
  value       = { for k, v in aws_vpc_endpoint.interface : k => v.dns_entry }
}
```

## Cost Considerations

Interface Endpoints are billed per AZ per hour plus data processing charges. At approximately $0.01 per AZ per hour per endpoint, deploying 12 endpoints across 3 AZs costs roughly $0.36/hour or about $260/month. Weigh this against NAT Gateway costs and security benefits to determine the right approach for your workload.

## Conclusion

Interface VPC Endpoints provide secure, private connectivity to AWS services without requiring internet access. By using Terraform's for_each pattern, you can efficiently manage many endpoints across your infrastructure. Combined with endpoint policies and security groups, they form a critical part of a defense-in-depth network strategy.

For more networking configurations, check out our guide on [How to Create Network Segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-network-segmentation-with-terraform/view).
