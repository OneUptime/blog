# How to Handle Emergency Access Roles with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Azure, GCP, Security, Emergency Access, Infrastructure as Code

Description: Learn how to create and manage emergency access (break-glass) roles using Terraform to ensure you always have a secure fallback for critical situations.

---

Emergency access roles, often called break-glass accounts, are critical safety nets for when normal access mechanisms fail. Whether your identity provider goes down, a misconfigured policy locks everyone out, or you need immediate access during a security incident, having well-prepared emergency access roles can mean the difference between a quick recovery and a prolonged outage. This guide shows you how to implement emergency access patterns across cloud providers using Terraform.

## Understanding Emergency Access

Emergency access roles should be rarely used but always available. They need to bypass conditional access policies, MFA requirements, and federation dependencies. At the same time, their use must be heavily monitored and audited since they typically have elevated privileges.

## Setting Up the Providers

```hcl
# Configure providers for multi-cloud emergency access
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "azuread" {}

provider "google" {
  project = var.gcp_project_id
}

variable "gcp_project_id" {
  type = string
}
```

## AWS Break-Glass IAM User

Create an IAM user that does not depend on federation or SSO:

```hcl
# Create a break-glass IAM user with direct console access
resource "aws_iam_user" "break_glass" {
  name = "break-glass-admin"
  path = "/emergency/"

  tags = {
    Purpose   = "emergency-access"
    ManagedBy = "terraform"
  }
}

# Attach administrator access
resource "aws_iam_user_policy_attachment" "break_glass_admin" {
  user       = aws_iam_user.break_glass.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Enable console access with a strong password
resource "aws_iam_user_login_profile" "break_glass" {
  user                    = aws_iam_user.break_glass.name
  password_length         = 32
  password_reset_required = false
}

# Create access keys for programmatic emergency access
resource "aws_iam_access_key" "break_glass" {
  user = aws_iam_user.break_glass.name
}

# Store credentials securely in AWS Secrets Manager
resource "aws_secretsmanager_secret" "break_glass" {
  name        = "emergency/break-glass-credentials"
  description = "Emergency break-glass admin credentials"

  tags = {
    Purpose = "emergency-access"
  }
}

resource "aws_secretsmanager_secret_version" "break_glass" {
  secret_id = aws_secretsmanager_secret.break_glass.id

  secret_string = jsonencode({
    username          = aws_iam_user.break_glass.name
    console_password  = aws_iam_user_login_profile.break_glass.password
    access_key_id     = aws_iam_access_key.break_glass.id
    secret_access_key = aws_iam_access_key.break_glass.secret
    console_url       = "https://${data.aws_caller_identity.current.account_id}.signin.aws.amazon.com/console"
  })
}

data "aws_caller_identity" "current" {}
```

## AWS Emergency Access Role

Create a role that can be assumed during emergencies without federation:

```hcl
# Create an emergency access role
resource "aws_iam_role" "emergency" {
  name        = "EmergencyAccessRole"
  description = "Emergency access role for break-glass scenarios"
  path        = "/emergency/"

  # Allow the break-glass user and specific trusted principals to assume
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBreakGlassUser"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_user.break_glass.arn
        }
        Action = "sts:AssumeRole"
      },
      {
        Sid    = "AllowTrustedAdmins"
        Effect = "Allow"
        Principal = {
          AWS = var.trusted_admin_arns
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      }
    ]
  })

  max_session_duration = 3600  # 1 hour maximum

  tags = {
    Purpose = "emergency-access"
  }
}

resource "aws_iam_role_policy_attachment" "emergency_admin" {
  role       = aws_iam_role.emergency.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

variable "trusted_admin_arns" {
  type        = list(string)
  description = "ARNs of trusted admin principals"
}
```

## Monitoring Emergency Access Usage

Set up comprehensive monitoring so you know whenever emergency access is used:

```hcl
# CloudTrail event rule for break-glass user activity
resource "aws_cloudwatch_event_rule" "break_glass_usage" {
  name        = "break-glass-account-usage"
  description = "Detect any activity from break-glass accounts"

  event_pattern = jsonencode({
    detail-type = ["AWS API Call via CloudTrail", "AWS Console Sign In via CloudTrail"]
    detail = {
      userIdentity = {
        arn = [
          aws_iam_user.break_glass.arn,
          aws_iam_role.emergency.arn
        ]
      }
    }
  })
}

# Send alerts to SNS
resource "aws_sns_topic" "emergency_alerts" {
  name = "emergency-access-alerts"
}

resource "aws_cloudwatch_event_target" "break_glass_alert" {
  rule      = aws_cloudwatch_event_rule.break_glass_usage.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.emergency_alerts.arn
}

# Subscribe the security team
resource "aws_sns_topic_subscription" "security_email" {
  topic_arn = aws_sns_topic.emergency_alerts.arn
  protocol  = "email"
  endpoint  = var.security_email
}

variable "security_email" {
  type        = string
  description = "Security team email for emergency access alerts"
}

# Create a CloudWatch alarm for any break-glass console login
resource "aws_cloudwatch_log_metric_filter" "break_glass_login" {
  name           = "break-glass-console-login"
  pattern        = "{ $.userIdentity.userName = \"break-glass-admin\" }"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name      = "BreakGlassLogin"
    namespace = "Security/EmergencyAccess"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "break_glass_login" {
  alarm_name          = "break-glass-login-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BreakGlassLogin"
  namespace           = "Security/EmergencyAccess"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Break-glass account login detected - verify this was authorized"
  alarm_actions       = [aws_sns_topic.emergency_alerts.arn]
}
```

## Azure Break-Glass Account

```hcl
# Create an Azure AD break-glass account
resource "azuread_user" "break_glass_1" {
  user_principal_name = "emergency-admin-1@${var.azure_domain}"
  display_name        = "Emergency Admin 1"
  password            = var.break_glass_password_1

  force_password_change = false
  account_enabled       = true
}

resource "azuread_user" "break_glass_2" {
  user_principal_name = "emergency-admin-2@${var.azure_domain}"
  display_name        = "Emergency Admin 2"
  password            = var.break_glass_password_2

  force_password_change = false
  account_enabled       = true
}

# Assign Global Administrator role
data "azuread_directory_role" "global_admin" {
  display_name = "Global Administrator"
}

resource "azuread_directory_role_assignment" "break_glass_1" {
  role_id             = data.azuread_directory_role.global_admin.template_id
  principal_object_id = azuread_user.break_glass_1.object_id
}

resource "azuread_directory_role_assignment" "break_glass_2" {
  role_id             = data.azuread_directory_role.global_admin.template_id
  principal_object_id = azuread_user.break_glass_2.object_id
}

variable "azure_domain" {
  type = string
}

variable "break_glass_password_1" {
  type      = string
  sensitive = true
}

variable "break_glass_password_2" {
  type      = string
  sensitive = true
}
```

## GCP Emergency Access

```hcl
# Create a GCP service account for emergency access
resource "google_service_account" "emergency" {
  account_id   = "emergency-access"
  display_name = "Emergency Access Service Account"
  description  = "Break-glass service account for emergencies"
  project      = var.gcp_project_id
}

# Grant organization-level admin access
resource "google_organization_iam_member" "emergency_admin" {
  org_id = var.gcp_organization_id
  role   = "roles/resourcemanager.organizationAdmin"
  member = "serviceAccount:${google_service_account.emergency.email}"
}

variable "gcp_organization_id" {
  type = string
}
```

## Emergency Access Procedures as Code

Document your emergency procedures alongside the infrastructure:

```hcl
# Store emergency procedures in a versioned location
resource "aws_s3_object" "emergency_procedures" {
  bucket  = aws_s3_bucket.emergency.id
  key     = "procedures/emergency-access-runbook.md"
  content = <<-EOT
    # Emergency Access Procedures

    ## When to Use Break-Glass Access
    1. Identity provider outage
    2. Complete SSO failure
    3. Active security incident requiring immediate access
    4. Account lockout due to policy misconfiguration

    ## Steps
    1. Retrieve credentials from Secrets Manager
    2. Log in using break-glass credentials
    3. Perform necessary emergency actions
    4. Document all actions taken
    5. Notify the security team
    6. Rotate break-glass credentials after use
  EOT
}

resource "aws_s3_bucket" "emergency" {
  bucket = "emergency-access-procedures-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "emergency" {
  bucket = aws_s3_bucket.emergency.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Best Practices

Create at least two break-glass accounts to avoid a single point of failure. Exclude break-glass accounts from all Conditional Access policies, MFA requirements, and federation dependencies. Store credentials in a secure, offline location such as a physical safe in addition to any digital storage. Monitor every use of break-glass accounts with immediate alerts to the security team. Rotate break-glass credentials after every use and on a regular schedule. Test your break-glass procedures regularly to ensure they still work. Document clear procedures for when and how to use emergency access.

For setting up the monitoring infrastructure to detect emergency access usage, check out our guide on [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ec2-in-terraform/view).

## Conclusion

Emergency access roles managed through Terraform ensure that your break-glass procedures are consistent, documented, and version-controlled. By automating the creation of emergency accounts, monitoring rules, and alert pipelines, you reduce the risk of being locked out of your own infrastructure while maintaining the security controls that keep unauthorized access at bay.
