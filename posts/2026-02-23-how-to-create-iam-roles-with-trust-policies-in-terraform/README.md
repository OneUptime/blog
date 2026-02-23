# How to Create IAM Roles with Trust Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Trust Policy, Security, Roles

Description: Learn how to create IAM roles with trust policies in Terraform, including service principals, cross-account trust, federated access, and condition-based trust.

---

Every IAM role in AWS has two key components: the permissions policy that defines what the role can do, and the trust policy that defines who can assume the role. The trust policy is sometimes called the assume role policy. It is a JSON document that specifies which principals (users, services, or accounts) are allowed to call `sts:AssumeRole` to obtain temporary credentials for the role.

Getting trust policies right is critical for security. A misconfigured trust policy can either prevent legitimate access or expose your resources to unauthorized principals. This guide shows you how to create IAM roles with properly configured trust policies using Terraform.

## Understanding Trust Policies

A trust policy is attached to a role and has the same structure as a standard IAM policy, but it controls who can assume the role rather than what the role can do. The key elements are:

- **Effect**: Almost always `Allow` in trust policies.
- **Principal**: The entity allowed to assume the role (AWS service, account, user, or federated identity).
- **Action**: Typically `sts:AssumeRole`, `sts:AssumeRoleWithSAML`, or `sts:AssumeRoleWithWebIdentity`.
- **Condition**: Optional restrictions on when the trust applies.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- AWS CLI configured with valid credentials

## Trust Policy for AWS Services

The most common trust policy allows an AWS service to assume a role. This is used for Lambda functions, EC2 instances, ECS tasks, and many other services.

```hcl
# Trust policy allowing Lambda to assume the role
data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "lambda-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}
```

### Multiple Service Principals

Some roles need to be assumable by more than one service.

```hcl
# Trust policy for a role used by both Lambda and API Gateway
data "aws_iam_policy_document" "multi_service_trust" {
  statement {
    effect = "Allow"

    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com",
        "apigateway.amazonaws.com",
      ]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "api_lambda_role" {
  name               = "api-lambda-shared-role"
  assume_role_policy = data.aws_iam_policy_document.multi_service_trust.json
}
```

## Trust Policy for Cross-Account Access

To allow principals from another AWS account to assume a role, use an AWS principal type.

```hcl
variable "trusted_account_id" {
  description = "AWS account ID that can assume this role"
  type        = string
}

# Trust policy for cross-account access
data "aws_iam_policy_document" "cross_account_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [
        "arn:aws:iam::${var.trusted_account_id}:root"
      ]
    }

    actions = ["sts:AssumeRole"]

    # Add conditions for extra security
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = ["my-unique-external-id"]
    }
  }
}

resource "aws_iam_role" "cross_account_role" {
  name               = "cross-account-role"
  assume_role_policy = data.aws_iam_policy_document.cross_account_trust.json
  max_session_duration = 3600
}
```

## Trust Policy for Specific IAM Users or Roles

You can narrow trust to specific IAM entities rather than an entire account.

```hcl
data "aws_iam_policy_document" "specific_principal_trust" {
  statement {
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        # Trust a specific IAM role
        "arn:aws:iam::123456789012:role/admin-role",
        # Trust a specific IAM user
        "arn:aws:iam::123456789012:user/deploy-user",
      ]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "specific_trust_role" {
  name               = "specific-trust-role"
  assume_role_policy = data.aws_iam_policy_document.specific_principal_trust.json
}
```

## Trust Policy with Conditions

Conditions add another layer of security to trust policies. You can restrict role assumption based on various factors.

### Requiring MFA

```hcl
data "aws_iam_policy_document" "mfa_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:root"]
    }

    actions = ["sts:AssumeRole"]

    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }
  }
}
```

### Restricting by Source IP

```hcl
data "aws_iam_policy_document" "ip_restricted_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:root"]
    }

    actions = ["sts:AssumeRole"]

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = ["203.0.113.0/24", "198.51.100.0/24"]
    }
  }
}
```

### Restricting by Tag

```hcl
data "aws_iam_policy_document" "tag_based_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:root"]
    }

    actions = ["sts:AssumeRole"]

    # Only allow if the principal has a specific tag
    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalTag/Department"
      values   = ["engineering"]
    }
  }
}
```

## Trust Policy for Federated Access

Federated trust policies allow external identity providers to assume roles.

### SAML Federation

```hcl
# Reference an existing SAML provider
data "aws_iam_saml_provider" "corporate" {
  arn = "arn:aws:iam::123456789012:saml-provider/CorporateIdP"
}

data "aws_iam_policy_document" "saml_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_saml_provider.corporate.arn]
    }

    actions = ["sts:AssumeRoleWithSAML"]

    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}

resource "aws_iam_role" "saml_role" {
  name               = "saml-federated-role"
  assume_role_policy = data.aws_iam_policy_document.saml_trust.json
}
```

### OIDC Federation

```hcl
# Reference an existing OIDC provider (e.g., GitHub Actions)
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "oidc_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:my-org/my-repo:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_role" {
  name               = "github-actions-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.oidc_trust.json
}
```

## Dynamic Trust Policies

When you need to create roles with different trust policies based on configuration, use dynamic blocks.

```hcl
variable "roles" {
  description = "Map of role configurations"
  type = map(object({
    trusted_services = list(string)
    trusted_accounts = list(string)
    require_mfa      = bool
    policy_arns      = list(string)
  }))
  default = {
    app-role = {
      trusted_services = ["lambda.amazonaws.com"]
      trusted_accounts = []
      require_mfa      = false
      policy_arns      = ["arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"]
    }
    admin-role = {
      trusted_services = []
      trusted_accounts = ["111111111111"]
      require_mfa      = true
      policy_arns      = ["arn:aws:iam::aws:policy/AdministratorAccess"]
    }
  }
}

# Build trust policies dynamically
data "aws_iam_policy_document" "trust_policies" {
  for_each = var.roles

  # Service trust statement
  dynamic "statement" {
    for_each = length(each.value.trusted_services) > 0 ? [1] : []

    content {
      effect = "Allow"
      principals {
        type        = "Service"
        identifiers = each.value.trusted_services
      }
      actions = ["sts:AssumeRole"]
    }
  }

  # Account trust statement
  dynamic "statement" {
    for_each = length(each.value.trusted_accounts) > 0 ? [1] : []

    content {
      effect = "Allow"
      principals {
        type = "AWS"
        identifiers = [
          for acct in each.value.trusted_accounts :
          "arn:aws:iam::${acct}:root"
        ]
      }
      actions = ["sts:AssumeRole"]

      dynamic "condition" {
        for_each = each.value.require_mfa ? [1] : []
        content {
          test     = "Bool"
          variable = "aws:MultiFactorAuthPresent"
          values   = ["true"]
        }
      }
    }
  }
}

# Create roles
resource "aws_iam_role" "roles" {
  for_each = var.roles

  name               = each.key
  assume_role_policy = data.aws_iam_policy_document.trust_policies[each.key].json
}
```

## Using jsonencode for Trust Policies

While `aws_iam_policy_document` is recommended for trust policies, you can also use `jsonencode` for simpler cases.

```hcl
resource "aws_iam_role" "simple_role" {
  name = "simple-service-role"

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
```

## Common Trust Policy Mistakes

Avoid these common errors:

1. **Using `*` as a principal.** This allows anyone to assume the role. Never do this unless you have strong conditions.
2. **Forgetting the action.** The action in a trust policy should be `sts:AssumeRole` (or the SAML/OIDC variants), not service-specific actions.
3. **Overly broad account trust.** Trusting an entire account root when you only need a specific role.
4. **Missing conditions for federated trust.** OIDC and SAML trust policies should always include conditions to restrict which identities can assume the role.

## Conclusion

Trust policies are the gatekeepers of your IAM roles. They determine who can assume a role and under what conditions. By using Terraform's `aws_iam_policy_document` data source, you can create type-safe, well-structured trust policies that cover service principals, cross-account access, federated identities, and conditional trust. Always apply the principle of least privilege to your trust policies, and add conditions wherever possible to limit the blast radius of a compromised credential.
