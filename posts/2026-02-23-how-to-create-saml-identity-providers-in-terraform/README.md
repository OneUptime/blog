# How to Create SAML Identity Providers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, SAML, SSO, Federation, Security

Description: Learn how to create SAML identity providers in AWS using Terraform for enterprise SSO with Okta, Azure AD, ADFS, and other SAML 2.0 providers.

---

SAML (Security Assertion Markup Language) is the most widely used federation protocol for enterprise single sign-on (SSO) to AWS. It allows employees to use their corporate credentials from identity providers like Okta, Azure Active Directory, PingFederate, or Active Directory Federation Services (ADFS) to access the AWS Management Console and AWS APIs without dedicated IAM users.

This guide covers creating SAML identity providers in Terraform, configuring federated roles, mapping IdP groups to AWS roles, and managing the complete SAML federation lifecycle.

## How SAML Federation Works with AWS

The SAML SSO flow to AWS works as follows:

1. A user accesses the identity provider's portal (e.g., Okta dashboard).
2. The user selects the AWS application.
3. The IdP authenticates the user and generates a SAML assertion containing the user's attributes and the roles they can assume.
4. The browser posts the SAML assertion to the AWS sign-in endpoint.
5. AWS validates the assertion against the registered SAML provider.
6. If valid, AWS creates a temporary session and the user lands in the AWS console with the appropriate role.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM administrative permissions
- A SAML 2.0 compatible identity provider (Okta, Azure AD, ADFS, etc.)
- The SAML metadata XML document from your identity provider
- AWS CLI configured with valid credentials

## Creating the SAML Identity Provider

The first step is to register your identity provider with AWS using its metadata document.

```hcl
# Create the SAML provider from the IdP metadata
resource "aws_iam_saml_provider" "corporate_idp" {
  name                   = "CorporateIdP"
  saml_metadata_document = file("${path.module}/metadata/idp-metadata.xml")

  tags = {
    IdentityProvider = "Okta"
    Environment      = "production"
    ManagedBy        = "terraform"
  }
}

# Output the provider ARN for IdP configuration
output "saml_provider_arn" {
  value       = aws_iam_saml_provider.corporate_idp.arn
  description = "ARN of the SAML provider for IdP configuration"
}
```

The metadata XML document contains the IdP's public certificate, SSO endpoint URLs, and entity ID. You get this document from your IdP's configuration panel.

## Storing Metadata Securely

Instead of storing metadata as a file, you can retrieve it from S3 or a parameter.

```hcl
# Store metadata in S3 and reference it
data "aws_s3_object" "saml_metadata" {
  bucket = "infra-config"
  key    = "saml/idp-metadata.xml"
}

resource "aws_iam_saml_provider" "from_s3" {
  name                   = "CorporateIdP"
  saml_metadata_document = data.aws_s3_object.saml_metadata.body
}
```

## Creating Federated Roles

After creating the SAML provider, create IAM roles that federated users will assume.

### Standard Trust Policy

```hcl
# Trust policy that allows SAML federation
data "aws_iam_policy_document" "saml_trust_policy" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_saml_provider.corporate_idp.arn]
    }

    actions = ["sts:AssumeRoleWithSAML"]

    # Required for AWS console access
    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}
```

### Creating Multiple Roles for Different Access Levels

```hcl
# Define the role hierarchy
variable "saml_roles" {
  type = map(object({
    managed_policy_arns  = list(string)
    max_session_hours    = number
    description          = string
  }))
  default = {
    admin = {
      managed_policy_arns = ["arn:aws:iam::aws:policy/AdministratorAccess"]
      max_session_hours   = 4
      description         = "Full administrative access for platform team"
    }
    power-user = {
      managed_policy_arns = ["arn:aws:iam::aws:policy/PowerUserAccess"]
      max_session_hours   = 8
      description         = "Power user access for developers"
    }
    developer = {
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess",
        "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
        "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess",
      ]
      max_session_hours = 12
      description       = "Read access for developers with CloudWatch access"
    }
    readonly = {
      managed_policy_arns = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
      max_session_hours   = 12
      description         = "Read-only access for auditors and reviewers"
    }
    security-audit = {
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/SecurityAudit",
        "arn:aws:iam::aws:policy/IAMReadOnlyAccess",
      ]
      max_session_hours = 8
      description       = "Security audit access for security team"
    }
  }
}

# Create roles for each access level
resource "aws_iam_role" "saml_roles" {
  for_each = var.saml_roles

  name               = "saml-${each.key}"
  description        = each.value.description
  assume_role_policy = data.aws_iam_policy_document.saml_trust_policy.json
  max_session_duration = each.value.max_session_hours * 3600

  tags = {
    FederationType = "SAML"
    AccessLevel    = each.key
    ManagedBy      = "terraform"
  }
}

# Flatten role-policy pairs for attachment
locals {
  saml_role_policies = flatten([
    for role_name, config in var.saml_roles : [
      for arn in config.managed_policy_arns : {
        role       = role_name
        policy_arn = arn
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "saml_roles" {
  for_each = {
    for pair in local.saml_role_policies :
    "${pair.role}-${pair.policy_arn}" => pair
  }

  role       = aws_iam_role.saml_roles[each.value.role].name
  policy_arn = each.value.policy_arn
}
```

## Multi-Account SAML Setup

In an AWS Organization, you typically register the same SAML provider in every account and create account-specific roles.

```hcl
# Variables for multi-account setup
variable "accounts" {
  type = map(object({
    id          = string
    environment = string
    roles       = list(string)
  }))
  default = {
    development = {
      id          = "111111111111"
      environment = "dev"
      roles       = ["admin", "developer", "readonly"]
    }
    staging = {
      id          = "222222222222"
      environment = "staging"
      roles       = ["admin", "developer", "readonly"]
    }
    production = {
      id          = "333333333333"
      environment = "prod"
      roles       = ["admin", "readonly", "security-audit"]
    }
  }
}

# Provider for each account
provider "aws" {
  alias  = "dev"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/OrganizationAccountAccessRole"
  }
}

# Create SAML provider in the dev account
resource "aws_iam_saml_provider" "dev" {
  provider               = aws.dev
  name                   = "CorporateIdP"
  saml_metadata_document = file("${path.module}/metadata/idp-metadata.xml")
}
```

## Adding Custom Policies to Federated Roles

Federated roles often need custom policies beyond AWS managed policies.

```hcl
# Custom developer policy with specific resource access
resource "aws_iam_policy" "saml_developer_custom" {
  name = "saml-developer-custom-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSpecificS3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::dev-artifacts-*",
          "arn:aws:s3:::dev-artifacts-*/*",
        ]
      },
      {
        Sid    = "AllowCloudWatchDashboards"
        Effect = "Allow"
        Action = [
          "cloudwatch:GetDashboard",
          "cloudwatch:ListDashboards",
          "cloudwatch:GetMetricData",
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowSSMSessionManager"
        Effect = "Allow"
        Action = [
          "ssm:StartSession",
          "ssm:TerminateSession",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ssm:ResourceTag/Environment" = "development"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "developer_custom" {
  role       = aws_iam_role.saml_roles["developer"].name
  policy_arn = aws_iam_policy.saml_developer_custom.arn
}
```

## Updating SAML Metadata

When your IdP's certificate is about to expire or the configuration changes, you need to update the metadata document. Terraform handles this cleanly.

```hcl
# The metadata file is the source of truth
# Simply update the file and run terraform apply
resource "aws_iam_saml_provider" "corporate_idp" {
  name                   = "CorporateIdP"
  saml_metadata_document = file("${path.module}/metadata/idp-metadata.xml")
}
```

When you update the metadata file and run `terraform apply`, Terraform detects the change and updates the provider in-place. This is a non-disruptive operation - existing sessions continue to work.

## SAML Provider with Terraform Remote State

In multi-team environments, share the SAML provider ARN via remote state.

```hcl
# In the identity module
output "saml_provider_arn" {
  value = aws_iam_saml_provider.corporate_idp.arn
}

# In another module that needs to create federated roles
data "terraform_remote_state" "identity" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "identity/terraform.tfstate"
    region = "us-east-1"
  }
}

data "aws_iam_policy_document" "trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [data.terraform_remote_state.identity.outputs.saml_provider_arn]
    }
    actions = ["sts:AssumeRoleWithSAML"]
    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}
```

## IdP Configuration Reference

For your IdP configuration, you need the following values from AWS:

```hcl
# Values to configure in your identity provider
output "idp_configuration" {
  value = {
    # The SAML provider ARN (used as audience restriction in some IdPs)
    provider_arn = aws_iam_saml_provider.corporate_idp.arn

    # The AWS SAML sign-in URL
    sign_in_url = "https://signin.aws.amazon.com/saml"

    # Role ARNs that users can assume (format: role_arn,provider_arn)
    role_mappings = {
      for name, role in aws_iam_role.saml_roles :
      name => "${role.arn},${aws_iam_saml_provider.corporate_idp.arn}"
    }
  }
}
```

## Best Practices

1. **Store metadata in version control.** Track changes to the SAML metadata document alongside your Terraform code.
2. **Plan for certificate rotation.** SAML metadata includes certificates that expire. Set reminders to update the metadata before expiration.
3. **Use short session durations for admin roles.** Admin access should expire quickly.
4. **Map IdP groups to specific roles.** Configure your IdP to include group membership in the SAML assertion and map groups to roles.
5. **Test federation in a sandbox first.** SAML misconfigurations can lock users out. Always test in a non-production account.
6. **Monitor with CloudTrail.** Track all `AssumeRoleWithSAML` events.
7. **Have a break-glass account.** Keep at least one IAM user with console access in case federation fails.

For related topics, see [How to Create IAM Roles for Federated Access in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-federated-access-in-terraform/view) and [How to Create OIDC Identity Providers in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-oidc-identity-providers-in-terraform/view).

## Conclusion

SAML identity providers are the foundation of enterprise SSO to AWS. By managing SAML providers and federated roles with Terraform, you get version control, peer review, and consistent configuration across all your AWS accounts. The key steps are registering the SAML provider with its metadata document, creating roles with SAML trust policies, mapping those roles to IdP groups, and keeping the metadata up to date as certificates rotate. With this infrastructure in place, your organization can provide secure, auditable access to AWS without managing individual IAM users.
