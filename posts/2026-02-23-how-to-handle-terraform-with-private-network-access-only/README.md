# How to Handle Terraform with Private Network Access Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Networking, Security, Private Network, VPC

Description: Run Terraform in private network environments with no public internet access using VPC endpoints, provider mirrors, and air-gapped deployment patterns.

---

Many organizations require that infrastructure management happens entirely within private networks. No public internet access from the CI/CD runners, no downloading providers from the public registry, and no API calls that leave the AWS network. This is common in financial services, healthcare, government, and any environment handling sensitive data.

Running Terraform in this kind of locked-down environment is absolutely possible, but it requires some upfront setup. This guide covers how to configure Terraform to work without any public internet access.

## Understanding What Terraform Needs from the Network

During normal operation, Terraform makes outbound connections for three purposes:

1. **Provider downloads**: `terraform init` fetches provider binaries from registry.terraform.io
2. **Module downloads**: `terraform init` fetches modules from registries or git repositories
3. **API calls**: Terraform talks to cloud provider APIs (e.g., ec2.amazonaws.com, s3.amazonaws.com)

In a private network setup, you need an alternative for each of these.

## Set Up VPC Endpoints for AWS APIs

AWS VPC endpoints let Terraform talk to AWS services without leaving the AWS network. You need endpoints for every AWS service your Terraform configuration uses:

```hcl
# List of AWS services you use in Terraform
locals {
  interface_endpoints = [
    "ec2",
    "ec2messages",
    "elasticloadbalancing",
    "sts",
    "logs",
    "monitoring",
    "kms",
    "secretsmanager",
    "ssm",
    "ssmmessages",
    "rds",
    "lambda",
    "ecs",
    "ecr.api",
    "ecr.dkr",
    "elasticfilesystem",
    "sns",
    "sqs",
    "events",
  ]
}

# Security group for all VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project}-vpc-endpoints"
  description = "Allow HTTPS from VPC to VPC endpoints"
  vpc_id      = aws_vpc.private.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.private.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.private.cidr_block]
  }

  tags = { Name = "${var.project}-vpc-endpoints-sg" }
}

# Create interface endpoints for each service
resource "aws_vpc_endpoint" "interface" {
  for_each = toset(local.interface_endpoints)

  vpc_id              = aws_vpc.private.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = { Name = "${var.project}-${each.value}-endpoint" }
}

# Gateway endpoints for S3 and DynamoDB (free, and needed for state)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.private.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = aws_route_table.private[*].id

  tags = { Name = "${var.project}-s3-endpoint" }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.private.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = aws_route_table.private[*].id

  tags = { Name = "${var.project}-dynamodb-endpoint" }
}
```

## Set Up a Provider Filesystem Mirror

Without internet access, `terraform init` cannot download providers from the public registry. Set up a local filesystem mirror instead.

First, on a machine that does have internet access, mirror the providers you need:

```bash
# On an internet-connected machine
mkdir -p /tmp/terraform-providers

# Mirror the providers you use
terraform providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  /tmp/terraform-providers

# Transfer the mirror to your private network (via S3, scp, etc.)
aws s3 sync /tmp/terraform-providers s3://internal-terraform-providers/
```

On the private network CI/CD runner, configure Terraform to use the local mirror:

```hcl
# ~/.terraformrc on the CI/CD runner
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }

  # No direct installation - everything must come from the mirror
}
```

Populate the mirror from S3 during runner setup:

```bash
#!/bin/bash
# setup-terraform-mirror.sh - Run as part of CI/CD runner bootstrap

# Sync providers from internal S3 bucket
aws s3 sync s3://internal-terraform-providers/ /opt/terraform/providers/

# Verify the mirror
ls -la /opt/terraform/providers/registry.terraform.io/
```

## Handle Module Sources

Modules also need to be available without internet access. Several options:

### Option 1: Local Module Paths

```hcl
# Use relative paths for in-repo modules
module "vpc" {
  source = "../../modules/vpc"
  # ...
}
```

### Option 2: Internal Git Repository

```hcl
# Use an internal git server
module "vpc" {
  source = "git::ssh://git@internal-git.company.com/terraform-modules/vpc.git?ref=v1.2.0"
  # ...
}
```

### Option 3: Private Terraform Registry

If you use Terraform Enterprise or a self-hosted registry:

```hcl
module "vpc" {
  source  = "app.terraform.internal.company.com/myorg/vpc/aws"
  version = "1.2.0"
}
```

## Configure the State Backend for Private Access

Your state backend needs to be accessible from the private network. With S3, the VPC endpoint handles this:

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-private"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/your-key-id"
    dynamodb_table = "terraform-locks"

    # No special config needed - S3 VPC endpoint handles routing
  }
}
```

Make sure the S3 VPC endpoint policy allows access to the state bucket:

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.private.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = aws_route_table.private[*].id

  # Restrict to only the buckets we need
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::terraform-state-private",
          "arn:aws:s3:::terraform-state-private/*",
          "arn:aws:s3:::internal-terraform-providers",
          "arn:aws:s3:::internal-terraform-providers/*"
        ]
      }
    ]
  })
}
```

## CI/CD Pipeline for Private Networks

Here is a complete CI/CD pipeline that works in a private network:

```yaml
# GitHub Actions self-hosted runner in private VPC
name: Terraform Apply
on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: [self-hosted, private-vpc]
    env:
      TF_CLI_CONFIG_FILE: /opt/terraform/terraform.rc

    steps:
      - uses: actions/checkout@v4

      - name: Sync Provider Mirror
        run: |
          aws s3 sync s3://internal-terraform-providers/ /opt/terraform/providers/ \
            --endpoint-url https://s3.us-east-1.amazonaws.com

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=plan.tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply plan.tfplan
```

## Testing Private Network Connectivity

Verify that your VPC endpoints are working correctly:

```bash
#!/bin/bash
# test-vpc-endpoints.sh - Verify all required endpoints are accessible

echo "Testing S3 endpoint..."
aws s3 ls s3://terraform-state-private/ --region us-east-1 && echo "OK" || echo "FAIL"

echo "Testing STS endpoint..."
aws sts get-caller-identity && echo "OK" || echo "FAIL"

echo "Testing EC2 endpoint..."
aws ec2 describe-regions --region us-east-1 && echo "OK" || echo "FAIL"

echo "Testing KMS endpoint..."
aws kms list-keys --region us-east-1 --max-items 1 && echo "OK" || echo "FAIL"

echo "Testing provider mirror..."
ls /opt/terraform/providers/registry.terraform.io/hashicorp/ && echo "OK" || echo "FAIL"
```

## DNS Configuration

Private DNS must be enabled on your VPC endpoints so that standard AWS SDK URLs resolve to the endpoint IPs:

```hcl
resource "aws_vpc_endpoint" "sts" {
  vpc_id              = aws_vpc.private.id
  service_name        = "com.amazonaws.${var.region}.sts"
  vpc_endpoint_type   = "Interface"
  # This is critical - enables sts.us-east-1.amazonaws.com to resolve
  # to the VPC endpoint private IP
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]
}
```

## Summary

Running Terraform in a private network requires setting up VPC endpoints for AWS API access, a filesystem mirror for provider binaries, and local or internal sources for modules. The initial setup takes some effort, but once in place it provides a much stronger security posture than running Terraform with public internet access. Every API call stays within the AWS network, and every dependency comes from a controlled internal source.

For related networking topics, see [how to implement network segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-network-segmentation-with-terraform/view) and [how to implement zero trust networking with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-zero-trust-networking-with-terraform/view).
