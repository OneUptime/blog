# How to Configure AWS PrivateLink with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, PrivateLink, AWS, VPC Endpoints, Networking, Infrastructure as Code

Description: Learn how to configure AWS PrivateLink using OpenTofu - creating interface VPC endpoints for AWS services and custom services, and gateway endpoints for S3 and DynamoDB.

## Introduction

AWS PrivateLink enables private connectivity to supported AWS services and custom services without traffic leaving the AWS network. In this guide, the PrivateLink pieces are interface endpoints (ENI-based, for most supported services and custom endpoint services). Gateway endpoints are a separate VPC endpoint type that is route-table based and used for S3 and DynamoDB. AWS also supports Gateway Load Balancer endpoints for virtual appliances.

## Interface Endpoints for AWS Services

```hcl
# Common AWS services to access privately

locals {
  interface_endpoints = {
    ssm        = "com.amazonaws.${var.aws_region}.ssm"
    ssm_messages = "com.amazonaws.${var.aws_region}.ssmmessages"
    ec2_messages = "com.amazonaws.${var.aws_region}.ec2messages"
    secrets_manager = "com.amazonaws.${var.aws_region}.secretsmanager"
    ecr_api    = "com.amazonaws.${var.aws_region}.ecr.api"
    ecr_dkr    = "com.amazonaws.${var.aws_region}.ecr.dkr"
    logs       = "com.amazonaws.${var.aws_region}.logs"
    monitoring = "com.amazonaws.${var.aws_region}.monitoring"
    sts        = "com.amazonaws.${var.aws_region}.sts"
    kms        = "com.amazonaws.${var.aws_region}.kms"
  }
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.main.id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true  # Override public DNS with private endpoint

  tags = {
    Name        = each.key
    Environment = var.environment
  }
}
```

## Gateway Endpoints (S3 and DynamoDB - Free)

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
      Resource = concat(
        [for bucket in var.allowed_buckets : "arn:aws:s3:::${bucket}"],
        [for bucket in var.allowed_buckets : "arn:aws:s3:::${bucket}/*"]
      )
    }]
  })

  tags = { Name = "s3-gateway-endpoint" }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = { Name = "dynamodb-gateway-endpoint" }
}
```

## Security Group for Interface Endpoints

```hcl
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.environment}-vpc-endpoints-sg"
  description = "Security group for VPC interface endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  tags = { Name = "${var.environment}-vpc-endpoints-sg" }
}
```

## Custom PrivateLink Service (Expose Your Own Service)

```hcl
# Internal NLB fronting your service
resource "aws_lb" "service" {
  name               = "${var.environment}-private-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids
}

# VPC Endpoint Service
resource "aws_vpc_endpoint_service" "main" {
  acceptance_required        = true  # Approve consumer connections
  network_load_balancer_arns = [aws_lb.service.arn]

  # Allow specific AWS accounts to create endpoints
  allowed_principals = var.consumer_account_arns

  tags = {
    Name        = "${var.environment}-endpoint-service"
    Environment = var.environment
  }
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "endpoint_notifications" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["vpce.amazonaws.com"]
    }

    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.endpoint_notifications.arn]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [aws_vpc_endpoint_service.main.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic" "endpoint_notifications" {
  name   = "${var.environment}-endpoint-notifications"
  policy = data.aws_iam_policy_document.endpoint_notifications.json
}

# Notify when connection request comes in
resource "aws_vpc_endpoint_connection_notification" "main" {
  vpc_endpoint_service_id     = aws_vpc_endpoint_service.main.id
  connection_notification_arn = aws_sns_topic.endpoint_notifications.arn
  connection_events           = ["Accept", "Connect", "Delete", "Reject"]
}
```

## Consumer Side: Connect to Custom Service

```hcl
# In the consumer account's VPC
resource "aws_vpc_endpoint" "custom_service" {
  vpc_id              = aws_vpc.consumer.id
  service_name        = var.provider_endpoint_service_name
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.consumer_subnet_ids
  security_group_ids  = [aws_security_group.consumer_endpoint.id]
  private_dns_enabled = false  # Use endpoint-specific DNS unless the provider has configured verified private DNS

  tags = { Name = "custom-service-endpoint" }
}
```

## Outputs

```hcl
output "s3_endpoint_id" {
  value = aws_vpc_endpoint.s3.id
}

output "ssm_endpoint_dns" {
  value = aws_vpc_endpoint.interface["ssm"].dns_entry[0].dns_name
}

output "endpoint_service_name" {
  value       = aws_vpc_endpoint_service.main.service_name
  description = "Service name for consumers to create endpoints"
}
```

## Conclusion

AWS PrivateLink with OpenTofu enables private connectivity to AWS services through interface endpoints and to custom services through endpoint services. Gateway endpoints for S3 and DynamoDB are separate VPC endpoints that complement PrivateLink, are free, and are useful on private-subnet route tables to avoid NAT Gateway costs. Interface endpoints for SSM, Secrets Manager, ECR, and KMS are essential for private instances that need AWS API access without internet connectivity. For custom services, create an endpoint service backed by an NLB and require acceptance for controlled access.
