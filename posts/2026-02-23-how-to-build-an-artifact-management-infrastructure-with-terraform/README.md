# How to Build an Artifact Management Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Artifact Management, CodeArtifact, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to build artifact management infrastructure using Terraform with AWS CodeArtifact for managing packages, dependencies, and build artifacts securely.

---

Every software organization produces artifacts: npm packages, Python wheels, Java JARs, Docker images, and compiled binaries. Without a centralized artifact management system, teams end up with inconsistent dependency versions, slow builds pulling from public registries, and no visibility into what versions are deployed where.

In this guide, we will build an artifact management infrastructure on AWS using Terraform. We will use AWS CodeArtifact for package management, S3 for binary artifacts, and set up proper access controls and lifecycle management.

## Artifact Management Architecture

Our setup includes:

- **CodeArtifact**: Domain and repositories for npm, PyPI, Maven, and NuGet packages
- **S3**: Storage for binary artifacts and build outputs
- **IAM**: Fine-grained access controls per team
- **Upstream connections**: Proxy to public registries with caching
- **CI/CD integration**: Automated publishing from pipelines

## CodeArtifact Domain

A CodeArtifact domain is the top-level container for all your repositories. It provides a shared namespace and encryption.

```hcl
# domain.tf - CodeArtifact domain
resource "aws_codeartifact_domain" "main" {
  domain = var.organization_name

  encryption_key = aws_kms_key.artifacts.arn

  tags = {
    Purpose   = "ArtifactManagement"
    ManagedBy = "terraform"
  }
}

resource "aws_kms_key" "artifacts" {
  description             = "Encryption key for artifact management"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose = "ArtifactEncryption"
  }
}

# Domain policy - control who can access the domain
resource "aws_codeartifact_domain_permissions_policy" "main" {
  domain = aws_codeartifact_domain.main.domain

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "codeartifact:CreateRepository",
          "codeartifact:DescribeDomain",
          "codeartifact:GetAuthorizationToken",
          "codeartifact:GetDomainPermissionsPolicy",
          "codeartifact:ListRepositoriesInDomain"
        ]
        Resource = "*"
      },
      {
        Sid    = "CrossAccountRead"
        Effect = "Allow"
        Principal = {
          AWS = [for id in var.consumer_account_ids : "arn:aws:iam::${id}:root"]
        }
        Action = [
          "codeartifact:DescribeDomain",
          "codeartifact:GetAuthorizationToken",
          "codeartifact:ListRepositoriesInDomain"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Upstream Repository (Public Registry Proxy)

Create repositories that proxy public registries. This gives you caching and an audit trail of external dependencies.

```hcl
# upstream.tf - Public registry proxies
# npm upstream (proxy to npmjs.org)
resource "aws_codeartifact_repository" "npm_upstream" {
  repository = "npm-upstream"
  domain     = aws_codeartifact_domain.main.domain

  external_connections {
    external_connection_name = "public:npmjs"
  }

  description = "Upstream proxy for npm public registry"

  tags = {
    Type     = "upstream"
    Language = "javascript"
  }
}

# PyPI upstream (proxy to pypi.org)
resource "aws_codeartifact_repository" "pypi_upstream" {
  repository = "pypi-upstream"
  domain     = aws_codeartifact_domain.main.domain

  external_connections {
    external_connection_name = "public:pypi"
  }

  description = "Upstream proxy for PyPI public registry"

  tags = {
    Type     = "upstream"
    Language = "python"
  }
}

# Maven upstream (proxy to Maven Central)
resource "aws_codeartifact_repository" "maven_upstream" {
  repository = "maven-upstream"
  domain     = aws_codeartifact_domain.main.domain

  external_connections {
    external_connection_name = "public:maven-centralrepository"
  }

  description = "Upstream proxy for Maven Central"

  tags = {
    Type     = "upstream"
    Language = "java"
  }
}

# NuGet upstream
resource "aws_codeartifact_repository" "nuget_upstream" {
  repository = "nuget-upstream"
  domain     = aws_codeartifact_domain.main.domain

  external_connections {
    external_connection_name = "public:nuget-org"
  }

  description = "Upstream proxy for NuGet Gallery"

  tags = {
    Type     = "upstream"
    Language = "dotnet"
  }
}
```

## Internal Repositories

Internal repositories store your organization's private packages. They use the upstream repositories as fallback for public dependencies.

```hcl
# internal.tf - Internal package repositories
# Shared npm repository
resource "aws_codeartifact_repository" "npm_internal" {
  repository = "npm-internal"
  domain     = aws_codeartifact_domain.main.domain

  # Fall back to public npm if a package is not found internally
  upstream {
    repository_name = aws_codeartifact_repository.npm_upstream.repository
  }

  description = "Internal npm packages with public npm fallback"

  tags = {
    Type     = "internal"
    Language = "javascript"
  }
}

# Shared Python repository
resource "aws_codeartifact_repository" "pypi_internal" {
  repository = "pypi-internal"
  domain     = aws_codeartifact_domain.main.domain

  upstream {
    repository_name = aws_codeartifact_repository.pypi_upstream.repository
  }

  description = "Internal Python packages with PyPI fallback"

  tags = {
    Type     = "internal"
    Language = "python"
  }
}

# Shared Maven repository
resource "aws_codeartifact_repository" "maven_internal" {
  repository = "maven-internal"
  domain     = aws_codeartifact_domain.main.domain

  upstream {
    repository_name = aws_codeartifact_repository.maven_upstream.repository
  }

  description = "Internal Maven artifacts with Maven Central fallback"

  tags = {
    Type     = "internal"
    Language = "java"
  }
}

# Per-team repositories for isolated publishing
resource "aws_codeartifact_repository" "team" {
  for_each = var.teams

  repository = "${each.key}-packages"
  domain     = aws_codeartifact_domain.main.domain

  # Team repos use the shared internal repo as upstream
  upstream {
    repository_name = aws_codeartifact_repository.npm_internal.repository
  }

  description = "Package repository for ${each.key} team"

  tags = {
    Type = "team"
    Team = each.key
  }
}
```

## Binary Artifact Storage

For artifacts that do not fit into a package manager (binaries, build outputs, deployment bundles), use S3.

```hcl
# binary-storage.tf - S3 for binary artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.organization_name}-build-artifacts"

  tags = {
    Purpose = "BinaryArtifacts"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.artifacts.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy to manage storage costs
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  # Development artifacts expire after 30 days
  rule {
    id     = "dev-artifacts"
    status = "Enabled"

    filter {
      prefix = "dev/"
    }

    expiration {
      days = 30
    }
  }

  # Staging artifacts expire after 90 days
  rule {
    id     = "staging-artifacts"
    status = "Enabled"

    filter {
      prefix = "staging/"
    }

    expiration {
      days = 90
    }
  }

  # Production artifacts move to cheaper storage over time
  rule {
    id     = "production-artifacts"
    status = "Enabled"

    filter {
      prefix = "production/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}
```

## IAM Roles for CI/CD

Set up IAM roles so CI/CD pipelines can publish and consume artifacts.

```hcl
# iam.tf - CI/CD access roles
# Role for publishing packages (used by CI pipelines)
resource "aws_iam_role" "artifact_publisher" {
  name = "artifact-publisher"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.github_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/*:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "artifact_publisher" {
  name = "artifact-publish-policy"
  role = aws_iam_role.artifact_publisher.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codeartifact:GetAuthorizationToken",
          "codeartifact:GetRepositoryEndpoint",
          "codeartifact:ReadFromRepository"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codeartifact:PublishPackageVersion",
          "codeartifact:PutPackageMetadata"
        ]
        Resource = aws_codeartifact_domain.main.arn
      },
      {
        Effect   = "Allow"
        Action   = "sts:GetServiceBearerToken"
        Resource = "*"
        Condition = {
          StringEquals = {
            "sts:AWSServiceName" = "codeartifact.amazonaws.com"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      }
    ]
  })
}

# Read-only role for consuming packages (used by build processes)
resource "aws_iam_role" "artifact_consumer" {
  name = "artifact-consumer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = ["codebuild.amazonaws.com", "lambda.amazonaws.com"]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "artifact_consumer" {
  name = "artifact-consume-policy"
  role = aws_iam_role.artifact_consumer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codeartifact:GetAuthorizationToken",
          "codeartifact:GetRepositoryEndpoint",
          "codeartifact:ReadFromRepository"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "sts:GetServiceBearerToken"
        Resource = "*"
        Condition = {
          StringEquals = {
            "sts:AWSServiceName" = "codeartifact.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Summary

A well-structured artifact management infrastructure centralizes all your packages and binaries in one place with proper access controls, caching, and lifecycle management. CodeArtifact handles package management for npm, PyPI, Maven, and NuGet with built-in upstream proxying. S3 handles binary artifacts with versioning and lifecycle policies.

The upstream proxy pattern is particularly valuable. Instead of every developer and CI job hitting public registries directly, everything goes through your internal proxy which caches packages, providing both faster builds and protection against public registry outages.

For monitoring the availability of your artifact repositories and the build pipelines that depend on them, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can alert you when issues arise before they block your development teams.
