# How to Create Service Endpoints with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC Endpoint, AWS, Networking, PrivateLink, Security

Description: Learn how to create VPC service endpoints with Terraform to securely access AWS services without traversing the public internet.

---

VPC service endpoints allow your resources within a VPC to communicate with AWS services like S3, DynamoDB, and others without requiring an internet gateway, NAT device, or VPN connection. Traffic between your VPC and the AWS service stays within the Amazon network, improving security and reducing data transfer costs. Terraform makes it straightforward to create and manage these endpoints as part of your infrastructure code.

## Types of VPC Endpoints

AWS provides two types of VPC endpoints. Gateway endpoints work with S3 and DynamoDB. They are free and are added as route table entries. Interface endpoints (powered by AWS PrivateLink) work with most other AWS services. They create elastic network interfaces (ENIs) in your subnets with private IP addresses.

Understanding the difference is important because they are configured differently in Terraform.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with subnets where you want to create endpoints.

## Setting Up the Foundation

Configure the provider and create a basic VPC:

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

# Create a VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}

# Create private subnets
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "private-subnet-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "private-subnet-b" }
}

# Route table for private subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "private-route-table"
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}
```

## Creating a Gateway Endpoint for S3

Gateway endpoints are the simplest to set up. They add a prefix list entry to your route table:

```hcl
# Gateway endpoint for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"

  # Gateway type for S3
  vpc_endpoint_type = "Gateway"

  # Associate with route tables
  route_table_ids = [
    aws_route_table.private.id,
  ]

  # Optional: restrict access with a policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3Access"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::my-bucket",
          "arn:aws:s3:::my-bucket/*",
        ]
      }
    ]
  })

  tags = {
    Name = "s3-gateway-endpoint"
  }
}
```

## Creating a Gateway Endpoint for DynamoDB

DynamoDB also supports gateway endpoints:

```hcl
# Gateway endpoint for DynamoDB
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"

  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    aws_route_table.private.id,
  ]

  tags = {
    Name = "dynamodb-gateway-endpoint"
  }
}
```

## Creating Interface Endpoints

Interface endpoints create ENIs in your subnets. They require a security group and can optionally enable private DNS:

```hcl
# Security group for interface endpoints
resource "aws_security_group" "vpc_endpoint" {
  name   = "vpc-endpoint-sg"
  vpc_id = aws_vpc.main.id

  # Allow HTTPS from the VPC
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Allow HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vpc-endpoint-sg"
  }
}

# Interface endpoint for SSM (Systems Manager)
resource "aws_vpc_endpoint" "ssm" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.ssm"
  vpc_endpoint_type = "Interface"

  # Place ENIs in the private subnets
  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
  ]

  # Attach security group
  security_group_ids = [
    aws_security_group.vpc_endpoint.id,
  ]

  # Enable private DNS so the default service
  # endpoint resolves to the VPC endpoint
  private_dns_enabled = true

  tags = {
    Name = "ssm-interface-endpoint"
  }
}

# Interface endpoint for SSM Messages
resource "aws_vpc_endpoint" "ssm_messages" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.ssmmessages"
  vpc_endpoint_type = "Interface"

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
  ]

  security_group_ids = [
    aws_security_group.vpc_endpoint.id,
  ]

  private_dns_enabled = true

  tags = {
    Name = "ssm-messages-interface-endpoint"
  }
}

# Interface endpoint for EC2 Messages (needed for SSM)
resource "aws_vpc_endpoint" "ec2_messages" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.ec2messages"
  vpc_endpoint_type = "Interface"

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
  ]

  security_group_ids = [
    aws_security_group.vpc_endpoint.id,
  ]

  private_dns_enabled = true

  tags = {
    Name = "ec2-messages-interface-endpoint"
  }
}
```

## Creating Multiple Endpoints with For-Each

When you need many endpoints, use `for_each` to keep your code DRY:

```hcl
# Define the interface endpoints you need
variable "interface_endpoints" {
  description = "List of AWS service endpoints to create"
  type        = list(string)
  default = [
    "com.amazonaws.us-east-1.ssm",
    "com.amazonaws.us-east-1.ssmmessages",
    "com.amazonaws.us-east-1.ec2messages",
    "com.amazonaws.us-east-1.logs",
    "com.amazonaws.us-east-1.monitoring",
    "com.amazonaws.us-east-1.sts",
    "com.amazonaws.us-east-1.ecr.api",
    "com.amazonaws.us-east-1.ecr.dkr",
    "com.amazonaws.us-east-1.secretsmanager",
    "com.amazonaws.us-east-1.kms",
  ]
}

# Create all interface endpoints
resource "aws_vpc_endpoint" "interface" {
  for_each = toset(var.interface_endpoints)

  vpc_id            = aws_vpc.main.id
  service_name      = each.value
  vpc_endpoint_type = "Interface"

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
  ]

  security_group_ids = [
    aws_security_group.vpc_endpoint.id,
  ]

  private_dns_enabled = true

  tags = {
    Name = "${replace(each.value, "com.amazonaws.us-east-1.", "")}-endpoint"
  }
}
```

## Endpoint Policies

You can attach IAM-like policies to endpoints to restrict access:

```hcl
# Interface endpoint with a restrictive policy
resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type = "Interface"

  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = true

  # Restrict which secrets can be accessed through this endpoint
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSpecificSecrets"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["secretsmanager:GetSecretValue"]
        Resource  = "arn:aws:secretsmanager:us-east-1:111111111111:secret:prod/*"
      }
    ]
  })

  tags = {
    Name = "secrets-manager-endpoint"
  }
}
```

## Outputs

Export useful information about your endpoints:

```hcl
output "s3_endpoint_id" {
  description = "ID of the S3 gateway endpoint"
  value       = aws_vpc_endpoint.s3.id
}

output "ssm_endpoint_dns" {
  description = "DNS entries for the SSM interface endpoint"
  value       = aws_vpc_endpoint.ssm.dns_entry
}
```

## Monitoring VPC Endpoints

Monitor your VPC endpoints to ensure they are functioning correctly. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-service-endpoints-with-terraform/view) to track connectivity and ensure services within your private subnets can reach AWS services through the endpoints without issues.

## Best Practices

Always use gateway endpoints for S3 and DynamoDB because they are free. Use interface endpoints for services that require them. Apply restrictive endpoint policies. Use private DNS so your existing code works without modification. Place interface endpoints in multiple AZs for high availability.

## Conclusion

VPC service endpoints with Terraform provide a secure, cost-effective way to access AWS services from private subnets. By keeping traffic on the AWS network, you reduce exposure to the public internet and potentially lower data transfer costs. Managing endpoints as Terraform code ensures consistency and makes it easy to add new endpoints as your service needs evolve.
