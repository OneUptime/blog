# Private Link Endpoints with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, OpenTofu, PrivateLink, VPC Endpoints, Security, Networking

Description: Learn how to create and manage AWS PrivateLink VPC endpoints using OpenTofu to access AWS services and third-party APIs without traversing the public internet.

## What is AWS PrivateLink?

AWS PrivateLink allows you to access AWS services and services hosted by other AWS accounts (or AWS Marketplace partners) privately within your VPC, without exposing traffic to the public internet. Traffic stays on the AWS backbone network.

For this guide, we'll use two VPC endpoint types:
- **Interface endpoints** - Uses one or more ENIs in your VPC with private IPs (powered by AWS PrivateLink)
- **Gateway endpoints** - For S3 and DynamoDB; uses route table entries and are not powered by AWS PrivateLink

## Creating an Interface Endpoint

```hcl
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type = "Interface"

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.endpoint_sg.id]

  private_dns_enabled = true

  tags = {
    Name        = "secretsmanager-endpoint"
    Environment = var.environment
  }
}
```

## Security Group for Endpoints

```hcl
resource "aws_security_group" "endpoint_sg" {
  name        = "vpc-endpoint-sg"
  description = "Allow HTTPS to VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = {
    Name = "vpc-endpoint-sg"
  }
}
```

## Gateway Endpoint for S3

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name = "s3-gateway-endpoint"
  }
}
```

## Common Interface Endpoints

```hcl
locals {
  endpoint_services = {
    ssm            = "com.amazonaws.us-east-1.ssm"
    ssmmessages    = "com.amazonaws.us-east-1.ssmmessages"
    ec2messages    = "com.amazonaws.us-east-1.ec2messages"
    logs           = "com.amazonaws.us-east-1.logs"
    ecr_api        = "com.amazonaws.us-east-1.ecr.api"
    ecr_dkr        = "com.amazonaws.us-east-1.ecr.dkr"
    secretsmanager = "com.amazonaws.us-east-1.secretsmanager"
    kms            = "com.amazonaws.us-east-1.kms"
  }
}

resource "aws_vpc_endpoint" "services" {
  for_each = local.endpoint_services

  vpc_id            = aws_vpc.main.id
  service_name      = each.value
  vpc_endpoint_type = "Interface"

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.endpoint_sg.id]

  private_dns_enabled = true

  tags = {
    Name = "${each.key}-endpoint"
  }
}
```

## Endpoint Policy

```hcl
resource "aws_vpc_endpoint" "s3_restricted" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject", "s3:PutObject"]
        Resource  = "arn:aws:s3:::my-secure-bucket/*"
      }
    ]
  })
}
```

## Verifying Endpoint Connectivity

```bash
# From an EC2 instance in the VPC

# Test S3 without internet
curl https://s3.us-east-1.amazonaws.com -I

# Check if private DNS is working
nslookup secretsmanager.us-east-1.amazonaws.com

# Should resolve to a private RFC 1918 address from your VPC subnets
```

## Outputs

```hcl
output "endpoint_ids" {
  value = {
    for k, v in aws_vpc_endpoint.services : k => v.id
  }
}

output "s3_endpoint_id" {
  value = aws_vpc_endpoint.s3.id
}
```

## Best Practices

1. **Enable `private_dns_enabled`** for interface endpoints so applications need no code changes
2. **Create endpoints for SSM** to enable Systems Manager access without a bastion host
3. **Create `ecr.api`, `ecr.dkr`, and the S3 gateway endpoint for ECR** to avoid internet egress for container image pulls
4. **Apply endpoint policies** to restrict which resources can be accessed via the endpoint
5. **Place interface endpoints in each AZ you use** for high availability

## Conclusion

AWS VPC endpoints managed with OpenTofu eliminate internet exposure for AWS API calls from your VPC. By deploying interface endpoints for commonly used services (SSM, Secrets Manager, ECR, CloudWatch Logs) and gateway endpoints where required, you can operate private subnets without NAT gateways and significantly reduce your network attack surface.
