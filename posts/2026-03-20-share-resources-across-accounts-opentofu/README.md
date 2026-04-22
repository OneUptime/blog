# How to Share Resources Across Accounts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Multi-Account, Resource Sharing, AWS RAM, Infrastructure as Code

Description: Learn how to share AWS resources across accounts with OpenTofu using AWS Resource Access Manager (RAM) and cross-account IAM roles.

Sharing resources across AWS accounts - VPC subnets, Transit Gateways, Route 53 Resolver rules, AMIs - avoids resource duplication and reduces costs. AWS Resource Access Manager (RAM) and cross-account IAM roles are the primary mechanisms, and both are manageable with OpenTofu.

## Sharing a VPC Subnet with AWS RAM

```hcl
provider "aws" {
  alias  = "shared_services"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::${var.shared_services_account_id}:role/DeploymentRole"
  }
}

# Create a resource share in the shared services account

resource "aws_ram_resource_share" "vpc_subnets" {
  provider                  = aws.shared_services
  name                      = "vpc-subnet-share"
  allow_external_principals = false  # Only share within the organization

  tags = { ManagedBy = "opentofu" }
}

# Add the subnet to the share
resource "aws_ram_resource_association" "subnet" {
  provider           = aws.shared_services
  resource_share_arn = aws_ram_resource_share.vpc_subnets.arn
  resource_arn       = aws_subnet.shared.arn
}

# Share with the production account
resource "aws_ram_principal_association" "production" {
  provider           = aws.shared_services
  resource_share_arn = aws_ram_resource_share.vpc_subnets.arn
  principal          = var.production_account_id
}
```

## Accessing the Resource Share (Production Account)

For a subnet share within AWS Organizations, there is no invitation to accept. When RAM sharing with AWS Organizations is enabled, the production account gets access automatically after the principal association is created, so do not add an `aws_ram_resource_share_accepter` for this share.

## Sharing an AMI Across Accounts

```hcl
resource "aws_ami_launch_permission" "prod" {
  provider   = aws.shared_services
  image_id   = var.golden_ami_id
  account_id = var.production_account_id
}
```

## Cross-Account S3 Bucket Access

```hcl
resource "aws_s3_bucket_policy" "cross_account" {
  provider = aws.shared_services
  bucket   = aws_s3_bucket.shared_artifacts.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowProductionAccess"
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::${var.production_account_id}:root"
      }
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::${aws_s3_bucket.shared_artifacts.bucket}",
        "arn:aws:s3:::${aws_s3_bucket.shared_artifacts.bucket}/*"
      ]
    }]
  })
}
```

The production account's role or user still needs an identity-based IAM policy that allows the same S3 actions.

## Cross-Account KMS Key Policy

```hcl
resource "aws_kms_key" "shared" {
  provider    = aws.shared_services
  description = "Shared encryption key for cross-account use"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSharedServicesAccount"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.shared_services_account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid    = "AllowProductionAccount"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.production_account_id}:root" }
        Action    = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey"]
        Resource  = "*"
      }
    ]
  })
}
```

The production account's role or user also needs an IAM policy allowing those KMS actions on this key ARN; the key policy alone is not sufficient for cross-account use.

## Conclusion

Cross-account resource sharing in OpenTofu combines AWS RAM for managed sharing (subnets, Transit Gateways, License Manager), resource-based policies plus consumer-account IAM permissions (S3, KMS, ECR) for bucket and key sharing, and AMI launch permissions for shared machine images. Use provider aliases for each account and declare the sharing resources in the account that owns them.
