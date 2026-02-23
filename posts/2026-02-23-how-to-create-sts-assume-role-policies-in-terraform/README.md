# How to Create STS Assume Role Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, STS, AssumeRole, Security

Description: Learn how to create STS assume role policies in Terraform for cross-account access, session management, external IDs, and temporary credential workflows.

---

The AWS Security Token Service (STS) provides temporary security credentials through role assumption. The `sts:AssumeRole` API is central to many AWS access patterns, including cross-account access, federated login, service-to-service communication, and CI/CD pipeline authentication. Creating the right policies around STS assume role operations is crucial for both security and functionality.

This guide covers how to create STS assume role policies in Terraform, including trust policies, caller-side policies, session controls, and advanced patterns like chained role assumption.

## Understanding STS AssumeRole

When a principal assumes a role, it calls the `sts:AssumeRole` API. STS validates the request against two policies:

1. **Trust policy (on the role)**: Determines who is allowed to assume the role.
2. **Caller's permissions policy**: Determines whether the caller has permission to call `sts:AssumeRole`.

Both must allow the action for the assumption to succeed.

STS returns temporary credentials that include an access key, secret key, and session token. These credentials expire after a configurable duration.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM and STS permissions
- AWS CLI configured with valid credentials

## Creating a Trust Policy (Role Side)

The trust policy on the role determines who can assume it.

```hcl
# Trust policy allowing a specific role from another account
data "aws_iam_policy_document" "assume_role_trust" {
  statement {
    sid    = "AllowAssumeFromSource"
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::111111111111:role/source-role",
      ]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the assumable role
resource "aws_iam_role" "target_role" {
  name               = "target-assumable-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_trust.json

  # Maximum session duration (1 hour to 12 hours)
  max_session_duration = 3600
}
```

## Creating a Caller-Side Policy

The entity that wants to assume a role needs an `sts:AssumeRole` permission in its own policy.

```hcl
# Policy allowing a role or user to assume specific target roles
resource "aws_iam_policy" "assume_role_policy" {
  name        = "assume-target-roles"
  description = "Allows assuming specific roles in the target account"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowAssumeTargetRoles"
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Resource = [
        "arn:aws:iam::222222222222:role/target-role-1",
        "arn:aws:iam::222222222222:role/target-role-2",
        "arn:aws:iam::333333333333:role/target-role-3",
      ]
    }]
  })
}

# Attach to the source role
resource "aws_iam_role_policy_attachment" "assume_role" {
  role       = "source-role"
  policy_arn = aws_iam_policy.assume_role_policy.arn
}
```

## Using External IDs

External IDs prevent the confused deputy problem. When a third party assumes a role in your account, the external ID ensures only the intended third party can assume it.

```hcl
variable "partner_account_id" {
  type    = string
  default = "999888777666"
}

variable "external_id" {
  type      = string
  sensitive = true
}

# Trust policy requiring an external ID
data "aws_iam_policy_document" "partner_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }

    actions = ["sts:AssumeRole"]

    # Require external ID to prevent confused deputy attacks
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.external_id]
    }
  }
}

resource "aws_iam_role" "partner_role" {
  name               = "partner-access-role"
  assume_role_policy = data.aws_iam_policy_document.partner_trust.json
  max_session_duration = 3600
}
```

## Session Tags and Transitive Tags

Session tags let you pass attributes during role assumption that can be used in policy conditions.

```hcl
# Trust policy that allows session tagging
data "aws_iam_policy_document" "session_tag_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::111111111111:root"]
    }

    actions = [
      "sts:AssumeRole",
      "sts:TagSession",  # Required for session tags
    ]
  }
}

resource "aws_iam_role" "tagged_session_role" {
  name               = "tagged-session-role"
  assume_role_policy = data.aws_iam_policy_document.session_tag_trust.json
}

# Policy that uses session tags for access control
resource "aws_iam_role_policy" "tag_based_access" {
  name = "tag-based-access"
  role = aws_iam_role.tagged_session_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
      ]
      # Only allow access to S3 paths matching the session tag
      Resource = "arn:aws:s3:::multi-tenant-bucket/$${aws:PrincipalTag/TenantId}/*"
    }]
  })
}
```

## Restricting Session Duration

Control how long temporary credentials remain valid.

```hcl
# Role with a short session duration for sensitive operations
resource "aws_iam_role" "short_session" {
  name               = "short-session-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_trust.json

  # Maximum session of 1 hour for sensitive access
  max_session_duration = 3600
}

# Role with a longer session for batch jobs
resource "aws_iam_role" "long_session" {
  name               = "batch-processing-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_trust.json

  # Maximum session of 12 hours for long-running batch jobs
  max_session_duration = 43200
}

# On the caller side, limit the max duration they can request
resource "aws_iam_policy" "limited_assume" {
  name = "limited-session-assume"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.short_session.arn

      # Limit the maximum session duration the caller can request
      Condition = {
        NumericLessThanEquals = {
          "sts:DurationSeconds" = "3600"
        }
      }
    }]
  })
}
```

## Chained Role Assumption

In some architectures, a role assumes another role, which then assumes a third role. Each hop requires proper policies.

```hcl
# Role A (initial role)
resource "aws_iam_role" "role_a" {
  name = "role-a"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Role A can assume Role B
resource "aws_iam_role_policy" "a_assumes_b" {
  name = "assume-role-b"
  role = aws_iam_role.role_a.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.role_b.arn
    }]
  })
}

# Role B trusts Role A
resource "aws_iam_role" "role_b" {
  name = "role-b"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = aws_iam_role.role_a.arn
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Role B can assume Role C
resource "aws_iam_role_policy" "b_assumes_c" {
  name = "assume-role-c"
  role = aws_iam_role.role_b.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.role_c.arn
    }]
  })
}

# Role C trusts Role B
resource "aws_iam_role" "role_c" {
  name = "role-c"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = aws_iam_role.role_b.arn
      }
      Action = "sts:AssumeRole"
    }]
  })
}
```

## AssumeRole for Different STS Actions

Beyond `sts:AssumeRole`, STS provides other assume operations for different identity types.

```hcl
# For SAML federation
data "aws_iam_policy_document" "saml_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::123456789012:saml-provider/MyIdP"]
    }

    actions = ["sts:AssumeRoleWithSAML"]

    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}

# For OIDC federation (GitHub Actions, EKS, etc.)
data "aws_iam_policy_document" "oidc_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
```

## Configuring Terraform Providers to Assume Roles

Terraform itself can use `sts:AssumeRole` to manage resources in different accounts.

```hcl
# Terraform assumes a role in the target account
provider "aws" {
  alias  = "target"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::222222222222:role/terraform-role"
    session_name = "terraform-deployment"
    external_id  = "terraform-external-id"
    duration     = "1h"
  }
}
```

## Best Practices

1. **Always require external IDs for third-party access.** This prevents confused deputy attacks.
2. **Set appropriate session durations.** Shorter is more secure; longer is more convenient. Balance based on the use case.
3. **Use specific principal ARNs in trust policies.** Avoid trusting entire accounts when you can trust specific roles.
4. **Restrict `sts:AssumeRole` on the caller side.** Do not grant `Resource: *` for assume role permissions.
5. **Log and monitor role assumptions.** CloudTrail captures `AssumeRole` events for auditing.

For related topics, see [How to Create Cross-Account IAM Roles in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cross-account-iam-roles-in-terraform/view) and [How to Create IAM Roles with Trust Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-with-trust-policies-in-terraform/view).

## Conclusion

STS assume role policies form the backbone of secure access patterns in AWS. By properly configuring trust policies, caller-side permissions, session controls, and external IDs, you can build secure, auditable access flows across accounts and services. Terraform makes it easy to manage all of these components together, ensuring consistency and enabling code review for every access change.
