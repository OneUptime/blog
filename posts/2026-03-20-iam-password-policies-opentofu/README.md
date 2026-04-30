# How to Configure IAM Password Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Password Policy, Security, Compliance, Infrastructure as Code

Description: Learn how to configure AWS account-level IAM password policies using OpenTofu to enforce strong passwords, MFA requirements, and password rotation for IAM users.

## Introduction

AWS IAM password policies define requirements for passwords created by IAM users. Setting strong password policies is a security baseline requirement for compliance frameworks like PCI-DSS, SOC 2, CIS AWS Benchmark, and NIST. There is one password policy per AWS account.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions (root or IAM admin)

## Step 1: Configure the Account Password Policy

```hcl
# Account-level password policy for all IAM users

# There is exactly one password policy per AWS account
resource "aws_iam_account_password_policy" "main" {
  # Minimum password length (6-128 characters, recommend 14+)
  minimum_password_length = 14

  # Require at least one uppercase letter (A-Z)
  require_uppercase_characters = true

  # Require at least one lowercase letter (a-z)
  require_lowercase_characters = true

  # Require at least one number (0-9)
  require_numbers = true

  # Require at least one special character
  require_symbols = true

  # Prevent users from reusing their last N passwords
  password_reuse_prevention = 24  # Cannot reuse last 24 passwords

  # Maximum age before password must be changed (1-1095 days)
  max_password_age = 90

  # Allow users to change their own passwords
  allow_users_to_change_password = true

  # If true, an administrator must reset expired passwords
  # Setting this to false allows self-service password changes after expiry
  hard_expiry = false
}
```

## Step 2: Enforce MFA via IAM Policy

```hcl
# Policy that enforces MFA for most actions while still allowing
# MFA enrollment and limited account visibility
# Attach to all IAM users or groups
resource "aws_iam_policy" "require_mfa" {
  name        = "ForceMFAPolicy"
  description = "Force IAM users to use MFA for all actions"
  path        = "/security/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = [
          "iam:GetAccountPasswordPolicy",
          "iam:ListVirtualMFADevices"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowCreateOwnVirtualMFADevice"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice"
        ]
        Resource = "arn:aws:iam::*:mfa/*"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:DeactivateMFADevice",
          "iam:EnableMFADevice",
          "iam:GetMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice"
        ]
        Resource = "arn:aws:iam::*:user/$${aws:username}"
      },
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice",
          "sts:GetSessionToken"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}

# Attach MFA enforcement to all user groups
resource "aws_iam_group_policy_attachment" "mfa_all_users" {
  # Replace these with the IAM groups in your account
  for_each = toset([
    "developers",
    "devops",
    "security"
  ])

  group      = each.value
  policy_arn = aws_iam_policy.require_mfa.arn
}
```

Like AWS's documented Force MFA pattern, this also blocks first-time and expired-password resets during console sign-in unless you explicitly exempt `iam:ChangePassword` and `iam:GetAccountPasswordPolicy`.

## Step 3: Monitor Password Policy Compliance

This assumes AWS Config is already enabled with a configuration recorder and delivery channel.

```hcl
# AWS Config rule to check password policy compliance
resource "aws_config_config_rule" "iam_password_policy" {
  name        = "iam-password-policy"
  description = "Checks that the IAM password policy meets CIS benchmark requirements"

  source {
    owner             = "AWS"
    source_identifier = "IAM_PASSWORD_POLICY"
  }

  input_parameters = jsonencode({
    RequireUppercaseCharacters = "true"
    RequireLowercaseCharacters = "true"
    RequireSymbols             = "true"
    RequireNumbers             = "true"
    MinimumPasswordLength      = "14"
    PasswordReusePrevention    = "24"
    MaxPasswordAge             = "90"
  })
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify the password policy was applied
aws iam get-account-password-policy
```

## Conclusion

A strong IAM password policy is one of the first security baselines to configure in any AWS account. For production accounts, combine the password policy with mandatory MFA enforcement via the ForceMFA policy pattern. Consider moving away from IAM users entirely for production access by using AWS IAM Identity Center (SSO) with your corporate identity provider, which enforces corporate password and MFA policies.
