# How to Create IAM Roles for Federated Access in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Federation, SAML, OIDC, Security

Description: Learn how to create IAM roles for federated access in Terraform using SAML, OIDC, and custom identity brokers for single sign-on to AWS resources.

---

Federation allows users to authenticate with an external identity provider (IdP) and then access AWS resources without needing a dedicated IAM user. This is the standard approach for organizations that use corporate directories like Active Directory, identity platforms like Okta or Azure AD, or OIDC providers like GitHub or Google. Instead of creating and managing IAM users for every employee, you create IAM roles that federated users assume after authenticating with their corporate credentials.

This guide covers creating IAM roles for all major federation patterns in Terraform, including SAML, OIDC, and custom identity broker setups.

## Understanding Federation Types

AWS supports several federation mechanisms:

- **SAML 2.0 federation**: Used with enterprise identity providers like Okta, Azure AD, PingFederate, and ADFS. Users authenticate with the IdP, which sends a SAML assertion to AWS STS.
- **OIDC federation**: Used with web identity providers like Google, GitHub, and Amazon Cognito. Applications exchange an OIDC token for temporary AWS credentials.
- **Custom identity broker**: For identity providers that do not support SAML or OIDC natively, a custom broker application handles authentication and calls STS.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- An identity provider configured (Okta, Azure AD, etc.)
- AWS CLI configured with valid credentials

## SAML Federation Setup

SAML is the most common federation method for enterprise SSO to AWS.

### Step 1: Create the SAML Identity Provider

```hcl
# Create the SAML provider using metadata from your IdP
resource "aws_iam_saml_provider" "corporate" {
  name                   = "CorporateIdP"
  saml_metadata_document = file("${path.module}/saml-metadata.xml")

  tags = {
    IdP       = "Okta"
    ManagedBy = "terraform"
  }
}
```

### Step 2: Create Federated Roles

```hcl
# Trust policy for SAML federation
data "aws_iam_policy_document" "saml_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_saml_provider.corporate.arn]
    }

    actions = ["sts:AssumeRoleWithSAML"]

    # Required condition for AWS console access
    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}

# Admin role for SAML-authenticated administrators
resource "aws_iam_role" "saml_admin" {
  name               = "saml-admin-role"
  assume_role_policy = data.aws_iam_policy_document.saml_trust.json
  max_session_duration = 43200  # 12 hours

  tags = {
    FederationType = "SAML"
    AccessLevel    = "admin"
  }
}

resource "aws_iam_role_policy_attachment" "saml_admin" {
  role       = aws_iam_role.saml_admin.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Developer role for SAML-authenticated developers
resource "aws_iam_role" "saml_developer" {
  name               = "saml-developer-role"
  assume_role_policy = data.aws_iam_policy_document.saml_trust.json
  max_session_duration = 43200

  tags = {
    FederationType = "SAML"
    AccessLevel    = "developer"
  }
}

resource "aws_iam_role_policy_attachment" "saml_developer" {
  role       = aws_iam_role.saml_developer.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Read-only role for SAML-authenticated viewers
resource "aws_iam_role" "saml_readonly" {
  name               = "saml-readonly-role"
  assume_role_policy = data.aws_iam_policy_document.saml_trust.json
  max_session_duration = 43200

  tags = {
    FederationType = "SAML"
    AccessLevel    = "readonly"
  }
}

resource "aws_iam_role_policy_attachment" "saml_readonly" {
  role       = aws_iam_role.saml_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

### Restricting SAML Roles by Group

You can use SAML attributes to restrict which IdP groups can assume specific roles.

```hcl
data "aws_iam_policy_document" "saml_group_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_saml_provider.corporate.arn]
    }

    actions = ["sts:AssumeRoleWithSAML"]

    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }

    # Only allow users in the AWS-Admins group
    condition {
      test     = "StringEquals"
      variable = "SAML:sub_type"
      values   = ["persistent"]
    }
  }
}
```

## OIDC Federation Setup

OIDC federation is used for applications and CI/CD systems.

### Amazon Cognito Integration

```hcl
# Create a Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "app-user-pool"
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "app-client"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "app-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.app.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

# Roles for authenticated Cognito users
data "aws_iam_policy_document" "cognito_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.main.id]
    }

    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role" "cognito_authenticated" {
  name               = "cognito-authenticated-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_trust.json
}

# Grant Cognito users access to their own S3 prefix
resource "aws_iam_role_policy" "cognito_user_data" {
  name = "cognito-user-data-access"
  role = aws_iam_role.cognito_authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
      ]
      # Each user can only access their own prefix
      Resource = "arn:aws:s3:::user-data/$${cognito-identity.amazonaws.com:sub}/*"
    }]
  })
}

# Set the roles in the identity pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.cognito_authenticated.arn
  }
}
```

### Google OIDC Federation

```hcl
resource "aws_iam_openid_connect_provider" "google" {
  url = "https://accounts.google.com"

  client_id_list = [
    "your-google-client-id.apps.googleusercontent.com",
  ]

  thumbprint_list = ["08745487e891c19e3078c1f2a07e452950ef36f6"]
}

data "aws_iam_policy_document" "google_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.google.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "accounts.google.com:aud"
      values   = ["your-google-client-id.apps.googleusercontent.com"]
    }
  }
}

resource "aws_iam_role" "google_federated" {
  name               = "google-federated-role"
  assume_role_policy = data.aws_iam_policy_document.google_trust.json
}
```

## Creating Multiple Federation Roles Dynamically

For organizations with many roles, use a map-based approach.

```hcl
variable "federated_roles" {
  type = map(object({
    policy_arns       = list(string)
    max_session_hours = number
  }))
  default = {
    admin = {
      policy_arns       = ["arn:aws:iam::aws:policy/AdministratorAccess"]
      max_session_hours = 4
    }
    developer = {
      policy_arns       = ["arn:aws:iam::aws:policy/PowerUserAccess"]
      max_session_hours = 8
    }
    readonly = {
      policy_arns       = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
      max_session_hours = 12
    }
    security = {
      policy_arns = [
        "arn:aws:iam::aws:policy/SecurityAudit",
        "arn:aws:iam::aws:policy/IAMReadOnlyAccess",
      ]
      max_session_hours = 8
    }
  }
}

# Create roles for each access level
resource "aws_iam_role" "federated_roles" {
  for_each = var.federated_roles

  name               = "federated-${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.saml_trust.json
  max_session_duration = each.value.max_session_hours * 3600
}

# Flatten and attach policies
locals {
  role_policy_pairs = flatten([
    for role_name, config in var.federated_roles : [
      for arn in config.policy_arns : {
        role       = role_name
        policy_arn = arn
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "federated" {
  for_each = {
    for pair in local.role_policy_pairs :
    "${pair.role}-${pair.policy_arn}" => pair
  }

  role       = aws_iam_role.federated_roles[each.value.role].name
  policy_arn = each.value.policy_arn
}
```

## Best Practices

1. **Use SAML for console access.** SAML provides the best experience for interactive AWS console sessions.
2. **Use OIDC for applications and CI/CD.** OIDC tokens are easier to work with programmatically.
3. **Set appropriate session durations.** Admin roles should have shorter sessions than read-only roles.
4. **Map IdP groups to IAM roles.** This ensures access is controlled centrally in your identity provider.
5. **Add conditions to restrict federation.** Use SAML attributes and OIDC claims to narrow who can assume each role.
6. **Monitor federated sessions.** Use CloudTrail to track who is accessing your accounts through federation.

For related topics, see [How to Create SAML Identity Providers in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-saml-identity-providers-in-terraform/view) and [How to Create OIDC Identity Providers in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-oidc-identity-providers-in-terraform/view).

## Conclusion

Federated access eliminates the need for dedicated IAM users while providing centralized access management through your existing identity provider. Whether you use SAML for enterprise SSO, OIDC for application authentication, or Cognito for customer identity, Terraform makes it easy to create and manage the required IAM roles and trust policies. By mapping your organization's roles to AWS IAM roles and adding appropriate conditions, you can provide secure, auditable access to AWS resources for all your users and applications.
