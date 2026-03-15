# How to Create VPC Endpoints for S3 and DynamoDB with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC Endpoint, S3, DynamoDB, Networking, Infrastructure as Code

Description: Learn how to create Gateway VPC Endpoints for S3 and DynamoDB with Terraform to enable private, cost-effective access to AWS services without traversing the internet.

---

VPC Endpoints allow your resources within a VPC to communicate with AWS services without sending traffic over the public internet. Gateway VPC Endpoints for S3 and DynamoDB are free to use and provide a secure, high-performance path to these frequently used services. In this guide, we will set up both Gateway VPC Endpoints using Terraform with proper policies and route table configurations.

## Why Use VPC Endpoints?

Without VPC Endpoints, traffic from your private subnets to S3 or DynamoDB must travel through a NAT Gateway, which incurs data processing charges. VPC Endpoints eliminate this cost while also improving security by keeping traffic within the AWS network. For organizations processing large volumes of data with S3 or DynamoDB, the cost savings can be substantial.

Additionally, VPC Endpoints allow you to apply endpoint policies that restrict which buckets or tables can be accessed, providing fine-grained access control beyond what IAM policies alone offer.

## Prerequisites

You need Terraform 1.0 or later, an existing VPC with route tables, and appropriate AWS credentials. We will reference an existing VPC configuration throughout this guide.

## Basic VPC Setup

Let us start with a VPC foundation that our endpoints will be attached to.

```hcl
# Configure the AWS provider
provider "aws" {
  region = "us-east-1"
}

# Create the VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}

# Private subnets where resources will use the endpoints
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

# Route table for private subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "private-route-table"
  }
}

# Associate private subnets with the route table
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Creating the S3 Gateway VPC Endpoint

The S3 Gateway Endpoint is the most commonly used VPC endpoint. It adds a route to your route tables that directs S3 traffic through the endpoint instead of through the internet.

```hcl
# Gateway VPC Endpoint for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"

  # Associate with route tables - this automatically adds routes
  route_table_ids = [aws_route_table.private.id]

  tags = {
    Name = "s3-gateway-endpoint"
  }
}
```

When you associate a Gateway Endpoint with a route table, AWS automatically adds a prefix list route that directs S3 traffic through the endpoint. You do not need to manage these routes manually.

## S3 Endpoint with Custom Policy

For better security, restrict the endpoint to specific buckets.

```hcl
# S3 endpoint with a restrictive policy
resource "aws_vpc_endpoint" "s3_restricted" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private.id]

  # Policy restricting access to specific buckets only
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSpecificBuckets"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::my-application-data-bucket",
          "arn:aws:s3:::my-application-data-bucket/*",
          "arn:aws:s3:::my-application-logs-bucket",
          "arn:aws:s3:::my-application-logs-bucket/*"
        ]
      },
      {
        Sid       = "AllowECRAccess"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::prod-us-east-1-starport-layer-bucket/*"
        Condition = {
          StringEquals = {
            "aws:sourceVpc" = aws_vpc.main.id
          }
        }
      }
    ]
  })

  tags = {
    Name = "s3-gateway-endpoint-restricted"
  }
}
```

## Creating the DynamoDB Gateway VPC Endpoint

The DynamoDB endpoint works the same way as the S3 endpoint.

```hcl
# Gateway VPC Endpoint for DynamoDB
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"

  # Associate with the same route tables as S3
  route_table_ids = [aws_route_table.private.id]

  tags = {
    Name = "dynamodb-gateway-endpoint"
  }
}
```

## DynamoDB Endpoint with Custom Policy

Restrict DynamoDB access through the endpoint to specific tables.

```hcl
# DynamoDB endpoint with restrictive policy
resource "aws_vpc_endpoint" "dynamodb_restricted" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private.id]

  # Policy restricting access to specific DynamoDB tables
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSpecificTables"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:us-east-1:*:table/users",
          "arn:aws:dynamodb:us-east-1:*:table/users/index/*",
          "arn:aws:dynamodb:us-east-1:*:table/sessions",
          "arn:aws:dynamodb:us-east-1:*:table/sessions/index/*"
        ]
      }
    ]
  })

  tags = {
    Name = "dynamodb-gateway-endpoint-restricted"
  }
}
```

## Multi-Route Table Configuration

In production environments, you typically have multiple route tables. Attach endpoints to all relevant route tables.

```hcl
# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "public-route-table"
  }
}

# Application tier route table
resource "aws_route_table" "application" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "application-route-table"
  }
}

# Database tier route table
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "database-route-table"
  }
}

# S3 endpoint attached to all route tables
resource "aws_vpc_endpoint" "s3_all_tiers" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"

  # Attach to all route tables that need S3 access
  route_table_ids = [
    aws_route_table.public.id,
    aws_route_table.private.id,
    aws_route_table.application.id,
    aws_route_table.database.id,
  ]

  tags = {
    Name = "s3-endpoint-all-tiers"
  }
}

# DynamoDB endpoint for application and database tiers only
resource "aws_vpc_endpoint" "dynamodb_app_db" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    aws_route_table.application.id,
    aws_route_table.database.id,
  ]

  tags = {
    Name = "dynamodb-endpoint-app-db"
  }
}
```

## S3 Bucket Policy Restricting to VPC Endpoint

For maximum security, configure S3 bucket policies to only allow access from your VPC endpoint.

```hcl
# S3 bucket that only allows access through the VPC endpoint
resource "aws_s3_bucket" "private_data" {
  bucket = "my-private-data-bucket"

  tags = {
    Name = "private-data-bucket"
  }
}

resource "aws_s3_bucket_policy" "vpc_endpoint_only" {
  bucket = aws_s3_bucket.private_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonVPCEndpointAccess"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.private_data.arn,
          "${aws_s3_bucket.private_data.arn}/*"
        ]
        Condition = {
          StringNotEquals = {
            "aws:sourceVpce" = aws_vpc_endpoint.s3.id
          }
        }
      }
    ]
  })
}
```

## Making It Reusable with a Module

Create a reusable module for VPC endpoints.

```hcl
# modules/vpc-endpoints/variables.tf
variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "route_table_ids" {
  description = "List of route table IDs to associate with endpoints"
  type        = list(string)
}

variable "enable_s3_endpoint" {
  description = "Whether to create S3 gateway endpoint"
  type        = bool
  default     = true
}

variable "enable_dynamodb_endpoint" {
  description = "Whether to create DynamoDB gateway endpoint"
  type        = bool
  default     = true
}

# modules/vpc-endpoints/main.tf
resource "aws_vpc_endpoint" "s3" {
  count = var.enable_s3_endpoint ? 1 : 0

  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.route_table_ids

  tags = {
    Name = "s3-gateway-endpoint"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  count = var.enable_dynamodb_endpoint ? 1 : 0

  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.route_table_ids

  tags = {
    Name = "dynamodb-gateway-endpoint"
  }
}
```

## Outputs

```hcl
output "s3_endpoint_id" {
  description = "ID of the S3 VPC endpoint"
  value       = aws_vpc_endpoint.s3.id
}

output "s3_endpoint_prefix_list_id" {
  description = "Prefix list ID of the S3 endpoint for use in security groups"
  value       = aws_vpc_endpoint.s3.prefix_list_id
}

output "dynamodb_endpoint_id" {
  description = "ID of the DynamoDB VPC endpoint"
  value       = aws_vpc_endpoint.dynamodb.id
}

output "dynamodb_endpoint_prefix_list_id" {
  description = "Prefix list ID of the DynamoDB endpoint"
  value       = aws_vpc_endpoint.dynamodb.prefix_list_id
}
```

## Using Prefix Lists in Security Groups

The prefix list IDs from Gateway Endpoints can be used in security groups to explicitly allow outbound traffic to S3 and DynamoDB.

```hcl
# Security group allowing outbound to S3 and DynamoDB via endpoints
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id

  # Allow outbound to S3 via the endpoint prefix list
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.s3.prefix_list_id]
    description     = "HTTPS to S3 via VPC endpoint"
  }

  # Allow outbound to DynamoDB via the endpoint prefix list
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.dynamodb.prefix_list_id]
    description     = "HTTPS to DynamoDB via VPC endpoint"
  }
}
```

## Conclusion

Gateway VPC Endpoints for S3 and DynamoDB are a no-brainer for any AWS VPC. They are free, improve security by keeping traffic within the AWS network, and can significantly reduce NAT Gateway data processing costs. Combined with endpoint policies and bucket policies, they provide a robust security layer for your data access patterns.

For more advanced endpoint configurations, see our guide on [How to Configure Interface VPC Endpoints with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-interface-vpc-endpoints-with-terraform/view).
