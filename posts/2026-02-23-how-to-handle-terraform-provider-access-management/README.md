# How to Handle Terraform Provider Access Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Access Management, Security, IAM, DevOps

Description: Learn how to manage Terraform provider access securely across your organization, including credential management, least-privilege access, and multi-account strategies.

---

Terraform providers need credentials to manage your cloud resources. How you handle those credentials determines whether your infrastructure is secure or vulnerable. Poor provider access management leads to overly permissive roles, shared credentials, and security incidents. Good provider access management means least-privilege access, credential rotation, and auditable access patterns.

In this guide, we will cover how to manage Terraform provider access securely at scale.

## The Provider Access Challenge

Every Terraform provider needs some form of authentication. AWS needs access keys or role assumptions. Azure needs service principals. Google Cloud needs service account keys. Managing these credentials across dozens of teams and hundreds of workspaces is a significant security challenge.

The common mistakes include using long-lived access keys stored in CI/CD secrets, sharing a single high-privilege role across all teams, and not rotating credentials regularly.

## Implementing Least-Privilege Provider Access

Start by defining the minimum permissions each team needs:

```hcl
# iam/team-roles.tf
# Create least-privilege IAM roles for each team's Terraform operations

resource "aws_iam_role" "terraform_team" {
  for_each = var.teams

  name = "terraform-${each.key}"

  # Only allow assumption from the team's CI/CD pipeline
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${var.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Only allow from specific repository and branch
            "token.actions.githubusercontent.com:sub" = "repo:${var.org}/${each.value.repo}:ref:refs/heads/main"
          }
        }
      }
    ]
  })

  # Session duration limit
  max_session_duration = 3600  # 1 hour max
}

# Attach team-specific permissions
resource "aws_iam_role_policy" "terraform_team" {
  for_each = var.teams

  name = "terraform-${each.key}-permissions"
  role = aws_iam_role.terraform_team[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow managing resources tagged with the team name
        Effect   = "Allow"
        Action   = each.value.allowed_actions
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Team" = each.key
          }
        }
      },
      {
        # Allow creating new resources with proper tags
        Effect   = "Allow"
        Action   = each.value.create_actions
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestTag/Team" = each.key
          }
        }
      },
      {
        # Allow read access to shared resources
        Effect   = "Allow"
        Action   = ["ec2:Describe*", "iam:Get*", "iam:List*", "s3:List*"]
        Resource = "*"
      }
    ]
  })
}
```

## Using OIDC for Keyless Authentication

Avoid long-lived credentials by using OIDC federation:

```hcl
# iam/oidc-providers.tf
# Set up OIDC providers for keyless authentication

# GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

# GitLab CI OIDC provider
resource "aws_iam_openid_connect_provider" "gitlab" {
  url = "https://gitlab.com"

  client_id_list = ["https://gitlab.com"]

  thumbprint_list = [
    "b3dd7606d2b5a8b4a13771dbecc9ee1cecafa38a"
  ]
}
```

```yaml
# .github/workflows/terraform-oidc.yaml
# Using OIDC for keyless AWS authentication

name: Terraform with OIDC

on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # No static credentials needed
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-backend
          aws-region: us-east-1
          # Role session name for audit trail
          role-session-name: "terraform-${{ github.actor }}-${{ github.run_id }}"

      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

## Multi-Account Access Strategy

For organizations with multiple AWS accounts, implement a hub-and-spoke access model:

```hcl
# iam/cross-account-access.tf
# Hub-and-spoke model for multi-account Terraform access

# In the hub account: create a role that can assume roles in spoke accounts
resource "aws_iam_role" "terraform_hub" {
  name = "terraform-hub"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:*"
          }
        }
      }
    ]
  })
}

# Allow the hub role to assume spoke roles
resource "aws_iam_role_policy" "hub_assume_spoke" {
  name = "assume-spoke-roles"
  role = aws_iam_role.terraform_hub.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = [
          for account_id in var.spoke_account_ids :
          "arn:aws:iam::${account_id}:role/terraform-spoke"
        ]
      }
    ]
  })
}
```

```hcl
# provider-configs/multi-account.tf
# Configure providers for multiple accounts

provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.production_account_id}:role/terraform-spoke"
    session_name = "terraform-production"
  }
}

provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.staging_account_id}:role/terraform-spoke"
    session_name = "terraform-staging"
  }
}

# Use specific providers for each resource
resource "aws_s3_bucket" "production_data" {
  provider = aws.production
  bucket   = "myorg-production-data"
}
```

## Credential Rotation Automation

Automate credential rotation for any long-lived credentials:

```python
# scripts/rotate-credentials.py
# Automated credential rotation for Terraform service accounts

import boto3
from datetime import datetime, timedelta

def rotate_access_keys(iam_user, max_age_days=90):
    """Rotate access keys that are older than max_age_days."""
    iam = boto3.client("iam")

    keys = iam.list_access_keys(UserName=iam_user)["AccessKeyMetadata"]

    for key in keys:
        age = (datetime.utcnow() - key["CreateDate"].replace(tzinfo=None)).days

        if age > max_age_days:
            print(f"Key {key['AccessKeyId']} is {age} days old. Rotating...")

            # Create new key
            new_key = iam.create_access_key(UserName=iam_user)

            # Update the key in secrets manager
            update_secret(
                f"terraform/{iam_user}/access-key",
                new_key["AccessKey"]["AccessKeyId"],
                new_key["AccessKey"]["SecretAccessKey"]
            )

            # Deactivate old key (wait before deleting)
            iam.update_access_key(
                UserName=iam_user,
                AccessKeyId=key["AccessKeyId"],
                Status="Inactive"
            )

            print(f"Rotated key for {iam_user}. Old key deactivated.")

def update_secret(secret_name, access_key_id, secret_access_key):
    """Update credentials in AWS Secrets Manager."""
    sm = boto3.client("secretsmanager")
    sm.update_secret(
        SecretId=secret_name,
        SecretString=json.dumps({
            "access_key_id": access_key_id,
            "secret_access_key": secret_access_key
        })
    )
```

## Provider Version Pinning and Security

Control which provider versions teams can use:

```hcl
# standards/required-versions.tf
# Organization-wide provider version requirements

terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30.0, < 6.0.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80.0, < 4.0.0"
    }
    google = {
      source  = "hashicorp/google"
      version = ">= 5.10.0, < 6.0.0"
    }
  }
}
```

## Monitoring Provider Access

Track and alert on provider access patterns:

```hcl
# monitoring/access-monitoring.tf
# Monitor Terraform provider access for anomalies

resource "aws_cloudwatch_log_metric_filter" "terraform_assume_role" {
  name           = "terraform-role-assumptions"
  pattern        = "{ $.eventName = \"AssumeRole\" && $.requestParameters.roleArn = \"*terraform*\" }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "TerraformRoleAssumptions"
    namespace = "Security/Terraform"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "unusual_access" {
  alarm_name          = "unusual-terraform-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TerraformRoleAssumptions"
  namespace           = "Security/Terraform"
  period              = 3600
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Unusual number of Terraform role assumptions detected"

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}
```

## Best Practices

Use OIDC federation wherever possible. Eliminate long-lived credentials from your CI/CD pipelines. OIDC provides short-lived, automatically rotated tokens.

Implement the principle of least privilege. Each team's Terraform role should only have the permissions needed for the resources they manage. Use tag-based conditions to scope access.

Audit all provider access. Log every role assumption, key usage, and API call made through Terraform. This data is essential for security investigations.

Rotate credentials on a schedule. For any remaining long-lived credentials, automate rotation and set alerts for credentials approaching their age limit.

Separate plan and apply permissions. The CI role that runs terraform plan can have read-only access. Only the apply role needs write access, and it should be protected by additional controls.

## Conclusion

Provider access management is the security foundation of your Terraform operations. By using OIDC for keyless authentication, implementing least-privilege roles, automating credential rotation, and monitoring access patterns, you create a secure environment where teams can manage infrastructure without introducing unnecessary risk. Investing in proper access management upfront prevents the security incidents that come from overly permissive, poorly managed credentials.
