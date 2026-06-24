# How to Authenticate with AWS Using IAM Roles in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM Roles, Authentication, Security

Description: Learn how to configure OpenTofu to authenticate with AWS using IAM roles via assume_role, EC2 instance profiles, and ECS task roles for secure, credential-free deployments.

## Introduction

IAM role authentication is the most secure way to give OpenTofu access to AWS. Rather than embedding static access keys in configuration or environment variables, you delegate trust to an IAM role, which can be assumed by another trusted principal or exposed to workloads through EC2 instance profiles and ECS task roles.

## Assuming a Role via the Provider

The simplest form is using `assume_role` in the provider configuration:

```hcl
provider "aws" {
  region = "us-east-1"

  assume_role {
    # The ARN of the role to assume
    role_arn = "arn:aws:iam::123456789012:role/OpenTofuDeployRole"

    # A name to identify this session in CloudTrail logs
    session_name = "opentofu-deploy"

    # Optional: set the session duration for the temporary credentials
    duration = "1h"
  }
}
```

OpenTofu uses the caller's current credentials to call `sts:AssumeRole` and then uses the temporary credentials for all API calls.

## Creating the IAM Role (Trust Policy)

The deploy role must have a trust policy that allows your CI/CD environment to assume it:

```hcl
# The role that OpenTofu will assume

resource "aws_iam_role" "opentofu_deploy" {
  name = "OpenTofuDeployRole"

  # Trust policy: who can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          # Allow callers from the trusted AWS account
          AWS = "arn:aws:iam::111111111111:root"
        }
        Action    = "sts:AssumeRole"
        Condition = {
          ArnEquals = {
            # Restrict assumption to a specific role in that account
            "aws:PrincipalArn" = "arn:aws:iam::111111111111:role/CI-Runner-Role"
          }
        }
      }
    ]
  })
}

# Attach permissions to the deploy role
resource "aws_iam_role_policy" "opentofu_deploy" {
  name = "OpenTofuDeployPolicy"
  role = aws_iam_role.opentofu_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:*", "s3:*", "rds:*", "iam:GetRole", "iam:ListRoles"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "us-east-1"
          }
        }
      }
    ]
  })
}
```

If the caller is in another AWS account, that caller also needs an identity-based policy that allows `sts:AssumeRole` on this role.

## Using an EC2 Instance Profile

When OpenTofu runs on an EC2 instance, attach an instance profile and the provider automatically uses it:

```hcl
# Create the instance profile for the CI/CD server
resource "aws_iam_instance_profile" "ci_runner" {
  name = "ci-runner-profile"
  role = aws_iam_role.ci_runner.name
}

resource "aws_instance" "ci_runner" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.medium"
  iam_instance_profile = aws_iam_instance_profile.ci_runner.name

  # No static credentials needed - the instance role provides access
}
```

In the OpenTofu configuration running on that instance:

```hcl
provider "aws" {
  region = "us-east-1"

  # No credentials configured here
  # OpenTofu automatically uses the EC2 metadata service for credentials
}
```

## Cross-Account Role Assumption

Deploy to multiple AWS accounts from a single management account:

```hcl
# Management account provider (uses the runner's current credentials)
provider "aws" {
  alias  = "management"
  region = "us-east-1"
}

# Production account provider (assumes a role in the prod account)
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::PROD_ACCOUNT_ID:role/OpenTofuDeployRole"
    session_name = "opentofu-cross-account"
  }
}

# Resources deployed to the production account
resource "aws_s3_bucket" "prod_data" {
  provider = aws.production
  bucket   = "prod-data-bucket"
}
```

## Conclusion

IAM role authentication replaces long-lived access keys in your OpenTofu configuration with temporary credentials. Whether you use EC2 instance profiles, ECS task roles, or cross-account assume_role, the pattern is the same: delegate trust to a role and let AWS handle temporary credential rotation automatically.
