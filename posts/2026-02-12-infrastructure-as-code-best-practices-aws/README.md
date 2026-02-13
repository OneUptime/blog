# How to Implement Infrastructure as Code Best Practices on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Infrastructure as Code, Terraform, CloudFormation, DevOps

Description: Learn infrastructure as code best practices on AWS using Terraform and CloudFormation, covering state management, modular design, testing, and drift detection.

---

If you're still clicking around in the AWS console to create resources, stop. Infrastructure as Code isn't optional anymore - it's how professional teams manage cloud environments. Manual changes lead to configuration drift, undocumented dependencies, and that one engineer who's the only person who knows how the production VPC is set up.

IaC gives you version control, repeatability, peer review, and the ability to tear down and recreate your entire infrastructure in minutes. On AWS, your main options are CloudFormation (AWS-native) and Terraform (multi-cloud). Let's cover best practices for both.

## Project Structure

How you organize your IaC code matters as much as the code itself. Here's a structure that scales.

```
infrastructure/
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      main.tf
      terraform.tfvars
      backend.tf
    staging/
      main.tf
      terraform.tfvars
      backend.tf
    production/
      main.tf
      terraform.tfvars
      backend.tf
```

Each environment uses the same modules with different variables. When you fix a bug in the networking module, it flows to all environments through your deployment pipeline.

## Remote State Management

Never store Terraform state locally. Use an S3 backend with DynamoDB locking.

This configuration sets up secure remote state storage.

```hcl
# backend.tf - in each environment directory
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
    dynamodb_table = "terraform-state-lock"
  }
}
```

The S3 bucket and DynamoDB table should be created separately - ideally with their own CloudFormation stack.

```yaml
# state-backend.yaml - Bootstrap CloudFormation template
AWSTemplateFormatVersion: '2010-09-09'
Description: Terraform state backend resources

Resources:
  StateBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub "${AWS::AccountId}-terraform-state"
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  LockTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: terraform-state-lock
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: LockID
          AttributeType: S
      KeySchema:
        - AttributeName: LockID
          KeyType: HASH
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
```

## Writing Reusable Modules

Good modules are the foundation of maintainable IaC. They should be focused, configurable, and well-documented.

Here's a networking module that creates a production-ready VPC.

```hcl
# modules/networking/variables.tf
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create public and private subnets in each AZ
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.environment}-public-${var.availability_zones[count.index]}"
    Environment = var.environment
    Tier        = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.environment}-private-${var.availability_zones[count.index]}"
    Environment = var.environment
    Tier        = "private"
  }
}

# modules/networking/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}
```

## Tagging Strategy

Consistent tagging is essential for cost management, security, and operations. Enforce it with default tags.

```hcl
# In your environment's main.tf
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "terraform"
      Team        = "platform"
      CostCenter  = "engineering"
      Repository  = "github.com/myorg/infrastructure"
    }
  }
}
```

## Testing Infrastructure Code

You test your application code. Your infrastructure code deserves the same treatment.

This script validates Terraform configurations before applying them.

```bash
#!/bin/bash
# scripts/validate.sh - Run before every PR merge

set -euo pipefail

ENVIRONMENT=${1:-dev}
WORKING_DIR="environments/${ENVIRONMENT}"

echo "Validating Terraform for ${ENVIRONMENT}..."

# Format check
echo "Checking formatting..."
terraform -chdir="${WORKING_DIR}" fmt -check -recursive

# Initialize
terraform -chdir="${WORKING_DIR}" init -backend=false

# Validate syntax
echo "Validating configuration..."
terraform -chdir="${WORKING_DIR}" validate

# Security scan with tfsec
echo "Running security scan..."
tfsec "${WORKING_DIR}" --minimum-severity HIGH

# Cost estimation with Infracost
echo "Estimating cost impact..."
infracost breakdown --path "${WORKING_DIR}" --format table

# Plan (in CI, save the plan for apply step)
echo "Generating plan..."
terraform -chdir="${WORKING_DIR}" plan -out=tfplan

echo "Validation complete!"
```

For more advanced testing, use Terratest to validate your infrastructure actually works.

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCModule(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "environment":        "test",
            "vpc_cidr":          "10.99.0.0/16",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    })

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Verify outputs
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    publicSubnets := terraform.OutputList(t, terraformOptions, "public_subnet_ids")
    assert.Equal(t, 2, len(publicSubnets))

    privateSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Equal(t, 2, len(privateSubnets))
}
```

## Drift Detection

Infrastructure drift - when actual resources differ from your IaC definitions - is a constant problem. Set up automated drift detection.

```python
import boto3
import json
import subprocess
import os

def detect_terraform_drift(event, context):
    """Run terraform plan to detect configuration drift."""
    sns = boto3.client('sns')

    # Run terraform plan and check for changes
    result = subprocess.run(
        ['terraform', 'plan', '-detailed-exitcode', '-no-color'],
        cwd='/opt/terraform/environments/production',
        capture_output=True,
        text=True,
        timeout=300
    )

    # Exit code 2 means changes detected (drift)
    if result.returncode == 2:
        drift_details = result.stdout

        sns.publish(
            TopicArn=os.environ['ALERT_TOPIC'],
            Subject='Infrastructure Drift Detected in Production',
            Message=f"Terraform detected configuration drift:\n\n{drift_details[:4000]}"
        )

        return {
            'drift_detected': True,
            'details': drift_details[:1000]
        }
    elif result.returncode == 0:
        return {'drift_detected': False, 'message': 'No drift detected'}
    else:
        # Error occurred
        raise Exception(f"Terraform plan failed: {result.stderr}")
```

## State File Security

Your Terraform state file contains sensitive data - resource IDs, configuration details, and sometimes even passwords. Protect it.

```hcl
# S3 bucket policy that restricts state access
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

## Key Principles

Here's what separates good IaC from a mess: use modules for reusability, variables for configurability, outputs for composability. Review infrastructure changes in pull requests just like application code. Never make manual changes - if something needs to change, change the code. Run automated security scans on every PR. Keep your state secure and backed up.

Infrastructure as Code is a discipline, not just a tool. Treat your infrastructure repository with the same care and rigor as your application code, and you'll save yourself countless hours of debugging, firefighting, and rebuilding.

For CI/CD pipeline integration, check out [CI/CD best practices on AWS](https://oneuptime.com/blog/post/2026-02-12-ci-cd-best-practices-aws/view). For multi-account infrastructure management, see [multi-account strategy on AWS](https://oneuptime.com/blog/post/2026-02-12-multi-account-strategy-aws/view).
