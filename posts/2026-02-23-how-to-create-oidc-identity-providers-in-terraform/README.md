# How to Create OIDC Identity Providers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, OIDC, Federation, GitHub Actions, EKS

Description: Learn how to create OIDC identity providers in AWS using Terraform for GitHub Actions, EKS, GitLab CI, and other OIDC-compatible platforms.

---

OpenID Connect (OIDC) identity providers in AWS allow external services to authenticate and assume IAM roles without long-lived credentials. Instead of storing AWS access keys, external services present a JWT token issued by the OIDC provider. AWS validates the token and issues temporary credentials. This approach is widely used for CI/CD pipelines (GitHub Actions, GitLab CI), Kubernetes clusters (EKS IRSA), and web applications.

This guide covers creating OIDC identity providers in Terraform for all major use cases, including proper thumbprint management, trust policy configuration, and security best practices.

## How OIDC Federation Works in AWS

The OIDC flow in AWS involves these steps:

1. You register an OIDC provider in your AWS account using its issuer URL.
2. You create IAM roles with trust policies that reference the OIDC provider.
3. When an external service needs AWS access, it obtains a JWT token from the OIDC provider.
4. The service calls `sts:AssumeRoleWithWebIdentity`, passing the JWT token.
5. AWS validates the token against the registered OIDC provider.
6. If valid, AWS returns temporary credentials.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- The OIDC provider URL from the service you want to integrate

## Creating a GitHub Actions OIDC Provider

GitHub Actions is the most popular use case for OIDC in AWS.

```hcl
# Create the GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  # The audience that GitHub Actions tokens include
  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Service   = "github-actions"
    ManagedBy = "terraform"
  }
}

# Create a role that GitHub Actions can assume
data "aws_iam_policy_document" "github_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Verify the audience
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Restrict to specific repository and branch
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [
        "repo:my-org/my-repo:ref:refs/heads/main",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "github-actions-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
}

# Attach deployment permissions
resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
}

# Output the role ARN for use in GitHub Actions workflow
output "github_actions_role_arn" {
  value       = aws_iam_role.github_deploy.arn
  description = "ARN of the role for GitHub Actions to assume"
}
```

## Creating an EKS OIDC Provider

EKS uses OIDC for IAM Roles for Service Accounts (IRSA).

```hcl
# Reference the existing EKS cluster
data "aws_eks_cluster" "main" {
  name = "my-cluster"
}

# Get the OIDC issuer URL
locals {
  oidc_issuer_url = data.aws_eks_cluster.main.identity[0].oidc[0].issuer
  oidc_issuer     = replace(local.oidc_issuer_url, "https://", "")
}

# Fetch the thumbprint automatically
data "tls_certificate" "eks" {
  url = local.oidc_issuer_url
}

# Create the OIDC provider for EKS
resource "aws_iam_openid_connect_provider" "eks" {
  url = local.oidc_issuer_url

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]

  tags = {
    Cluster   = data.aws_eks_cluster.main.name
    ManagedBy = "terraform"
  }
}

# Create a role for a Kubernetes service account
data "aws_iam_policy_document" "eks_pod_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:sub"
      values   = ["system:serviceaccount:default:my-app"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eks_pod" {
  name               = "eks-my-app-pod-role"
  assume_role_policy = data.aws_iam_policy_document.eks_pod_trust.json
}
```

## Creating a GitLab CI OIDC Provider

```hcl
resource "aws_iam_openid_connect_provider" "gitlab" {
  url = "https://gitlab.com"

  client_id_list = ["https://gitlab.com"]

  thumbprint_list = ["b3dd7606d2b5a8b4a13771dbecc9ee1cecafa38a"]

  tags = {
    Service = "gitlab-ci"
  }
}

data "aws_iam_policy_document" "gitlab_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.gitlab.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "gitlab.com:aud"
      values   = ["https://gitlab.com"]
    }

    # Restrict to specific project
    condition {
      test     = "StringLike"
      variable = "gitlab.com:sub"
      values   = ["project_path:my-group/my-project:ref_type:branch:ref:main"]
    }
  }
}

resource "aws_iam_role" "gitlab_deploy" {
  name               = "gitlab-ci-deploy"
  assume_role_policy = data.aws_iam_policy_document.gitlab_trust.json
}
```

## Creating a Bitbucket Pipelines OIDC Provider

```hcl
resource "aws_iam_openid_connect_provider" "bitbucket" {
  url = "https://api.bitbucket.org/2.0/workspaces/my-workspace/pipelines-config/identity/oidc"

  client_id_list = [
    "ari:cloud:bitbucket::workspace/workspace-uuid",
  ]

  thumbprint_list = ["a031c46782e6e6c662c2c87c76da9aa62ccabd8e"]

  tags = {
    Service = "bitbucket-pipelines"
  }
}
```

## Self-Hosted OIDC Provider

For custom OIDC providers or self-hosted solutions like Keycloak.

```hcl
# Fetch the thumbprint from your self-hosted provider
data "tls_certificate" "custom_idp" {
  url = "https://auth.example.com"
}

resource "aws_iam_openid_connect_provider" "custom" {
  url = "https://auth.example.com"

  client_id_list = [
    "aws-access",         # Your application's client ID
    "sts.amazonaws.com",  # Standard AWS audience
  ]

  thumbprint_list = [
    data.tls_certificate.custom_idp.certificates[0].sha1_fingerprint,
  ]

  tags = {
    Provider = "custom-keycloak"
  }
}

data "aws_iam_policy_document" "custom_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.custom.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "auth.example.com:aud"
      values   = ["aws-access"]
    }

    # Restrict by custom claims
    condition {
      test     = "StringEquals"
      variable = "auth.example.com:groups"
      values   = ["aws-admins"]
    }
  }
}

resource "aws_iam_role" "custom_federated" {
  name               = "custom-oidc-role"
  assume_role_policy = data.aws_iam_policy_document.custom_trust.json
}
```

## Managing Multiple OIDC Providers

For organizations using multiple OIDC providers, use a structured approach.

```hcl
variable "oidc_providers" {
  type = map(object({
    url             = string
    client_ids      = list(string)
    thumbprints     = list(string)
  }))
  default = {
    github = {
      url         = "https://token.actions.githubusercontent.com"
      client_ids  = ["sts.amazonaws.com"]
      thumbprints = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
    }
    gitlab = {
      url         = "https://gitlab.com"
      client_ids  = ["https://gitlab.com"]
      thumbprints = ["b3dd7606d2b5a8b4a13771dbecc9ee1cecafa38a"]
    }
  }
}

resource "aws_iam_openid_connect_provider" "providers" {
  for_each = var.oidc_providers

  url             = each.value.url
  client_id_list  = each.value.client_ids
  thumbprint_list = each.value.thumbprints

  tags = {
    Provider = each.key
  }
}
```

## Thumbprint Management

The thumbprint is the SHA-1 hash of the OIDC provider's TLS certificate. It verifies that tokens come from the legitimate provider.

```hcl
# Automatically fetch thumbprint (recommended for most providers)
data "tls_certificate" "provider" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "auto_thumbprint" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.provider.certificates[0].sha1_fingerprint]
}
```

Note that AWS now validates tokens using the provider's JWKS endpoint rather than the thumbprint for some providers. However, the thumbprint is still required when creating the OIDC provider resource.

## Security Best Practices

1. **Always restrict the `sub` claim.** Without it, any token from the OIDC provider can assume your role.
2. **Verify the audience.** Always include an `aud` condition.
3. **Use automatic thumbprint fetching.** The `tls_certificate` data source ensures your thumbprint stays current.
4. **One OIDC provider per issuer per account.** AWS enforces this; you cannot create duplicate providers.
5. **Review token claims.** Understand what claims your OIDC provider includes and use them for fine-grained access control.
6. **Use short session durations.** OIDC-based roles should have the minimum session duration needed.

For related topics, see [How to Create IAM Roles for CI/CD in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ci-cd-in-terraform/view) and [How to Create IAM Roles for EKS Service Accounts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-eks-service-accounts-in-terraform/view).

## Conclusion

OIDC identity providers are the modern way to give external services access to your AWS accounts. They eliminate the need for static credentials, provide automatic credential rotation, and integrate with virtually any modern platform. Terraform makes it straightforward to create providers, manage thumbprints, and build trust policies with precise conditions. Whether you are integrating GitHub Actions, EKS pods, or a custom identity platform, the pattern is consistent: create the provider, create a role with a scoped trust policy, and let OIDC handle the rest.
