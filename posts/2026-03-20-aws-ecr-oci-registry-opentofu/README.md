# How to Use AWS ECR as an OCI Registry for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS ECR, OCI Registry, Provider Distribution, AWS

Description: Learn how to use AWS Elastic Container Registry as an OCI registry for storing and distributing OpenTofu providers and modules within AWS-centric organizations.

## Introduction

AWS Elastic Container Registry (ECR) is OCI-compliant and works as both a container image registry and an OCI artifact store. For AWS-centric organizations, ECR provides native IAM authentication, cross-account access, lifecycle policies, and replication - making it a natural choice for OpenTofu provider mirrors and module distribution.

## Creating ECR Repositories for OpenTofu

```hcl
# ecr.tf - Create ECR repositories for OpenTofu providers and modules

# Repository for a mirrored provider
resource "aws_ecr_repository" "opentofu_provider_aws" {
  name                 = "opentofu-providers/hashicorp/aws"
  image_tag_mutability = "IMMUTABLE"  # Provider version tags should be immutable

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Purpose = "opentofu-provider-mirror"
  }
}

# Repository for modules
resource "aws_ecr_repository" "module_vpc" {
  name                 = "opentofu-modules/vpc"
  image_tag_mutability = "IMMUTABLE"  # Modules should be immutable

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECR lifecycle policy - keep the last 5 tagged versions
resource "aws_ecr_lifecycle_policy" "provider_policy" {
  repository = aws_ecr_repository.opentofu_provider_aws.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 tagged versions"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 5
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## Authenticating with ECR

```bash
# Short-lived ECR authentication for ORAS (12-hour token)
aws ecr get-login-password --region us-east-1 | \
  oras login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Install the credential helper
go install github.com/awslabs/amazon-ecr-credential-helper/ecr-login/cli/docker-credential-ecr-login@latest

# Configure OpenTofu to use the credential helper for this registry
cat > ~/.tofurc << 'EOF'
oci_credentials "123456789012.dkr.ecr.us-east-1.amazonaws.com" {
  docker_credentials_helper = "ecr-login"
}
EOF
```

## Pushing Providers to ECR

```bash
#!/bin/bash
# mirror-provider-to-ecr.sh

set -euo pipefail

AWS_ACCOUNT="${AWS_ACCOUNT_ID}"
AWS_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ECR_REGISTRY="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

PROVIDER_NAMESPACE="hashicorp"
PROVIDER_TYPE="aws"
PROVIDER_VERSION="5.20.1"

echo "Authenticating with ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  oras login --username AWS --password-stdin "$ECR_REGISTRY"

# Download provider from official registry
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

cat > "$WORK_DIR/versions.tf" << EOF
terraform {
  required_providers {
    aws = {
      source  = "${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
      version = "= ${PROVIDER_VERSION}"
    }
  }
}
EOF

cd "$WORK_DIR"
tofu init -backend=false
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  "$WORK_DIR/mirror/"

# Build an OCI image layout that matches OpenTofu's provider mirror format
PROVIDER_MIRROR_DIR="$WORK_DIR/mirror/registry.opentofu.org/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
LAYOUT_DIR="$WORK_DIR/layout"

cd "$PROVIDER_MIRROR_DIR"
ECR_REPO="${ECR_REGISTRY}/opentofu-providers/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"

# These ORAS commands require ORAS v1.3.0 or later.
oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "${LAYOUT_DIR}:linux_amd64" \
  "terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout "${LAYOUT_DIR}:linux_arm64" \
  "terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_arm64.zip:archive/zip"

oras manifest index create \
  --artifact-type="application/vnd.opentofu.provider" \
  --oci-layout "${LAYOUT_DIR}:${PROVIDER_VERSION}" \
  linux_amd64 \
  linux_arm64

oras cp \
  --from-oci-layout "${LAYOUT_DIR}:${PROVIDER_VERSION}" \
  "${ECR_REPO}:${PROVIDER_VERSION}"

echo "Provider mirrored to ECR: ${ECR_REPO}:${PROVIDER_VERSION}"
```

## Configuring OpenTofu to Use ECR

```hcl
# ~/.tofurc

provider_installation {
  oci_mirror {
    repository_template = "123456789012.dkr.ecr.us-east-1.amazonaws.com/opentofu-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/hashicorp/aws"]
  }

  direct {
    exclude = ["registry.opentofu.org/hashicorp/aws"]
  }
}
```

## Cross-Account ECR Access

```hcl
# Allow another AWS account to pull from ECR
resource "aws_ecr_repository_policy" "cross_account" {
  repository = aws_ecr_repository.opentofu_provider_aws.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::111111111111:root",  # Dev account
            "arn:aws:iam::222222222222:root"   # Staging account
          ]
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}
```

## IAM Policy for ECR Provider Mirror

```hcl
# IAM policy for CI/CD systems that push to the mirror
data "aws_caller_identity" "current_account" {}

resource "aws_iam_policy" "ecr_provider_push" {
  name        = "opentofu-ecr-provider-push"
  description = "Allow pushing OpenTofu providers to ECR mirror"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = [
          "arn:aws:ecr:us-east-1:${data.aws_caller_identity.current_account.account_id}:repository/opentofu-providers/*",
          "arn:aws:ecr:us-east-1:${data.aws_caller_identity.current_account.account_id}:repository/opentofu-modules/*"
        ]
      }
    ]
  })
}

# IAM policy for machines that pull from the mirror
resource "aws_iam_policy" "ecr_provider_pull" {
  name        = "opentofu-ecr-provider-pull"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = [
          "arn:aws:ecr:us-east-1:${data.aws_caller_identity.current_account.account_id}:repository/opentofu-providers/*",
          "arn:aws:ecr:us-east-1:${data.aws_caller_identity.current_account.account_id}:repository/opentofu-modules/*"
        ]
      }
    ]
  })
}
```

## ECR Replication for Multi-Region

```hcl
# Replicate ECR repositories to other regions
data "aws_caller_identity" "replication" {}

resource "aws_ecr_replication_configuration" "opentofu" {
  replication_configuration {
    rule {
      destination {
        region      = "eu-west-1"
        registry_id = data.aws_caller_identity.replication.account_id
      }

      repository_filter {
        filter      = "opentofu-"
        filter_type = "PREFIX_MATCH"
      }
    }
  }
}
```

## Conclusion

AWS ECR provides IAM-based authentication, lifecycle policies, cross-account access, and multi-region replication for OpenTofu provider mirrors and module distribution. When paired with an `oci_credentials` configuration that uses the `amazon-ecr-credential-helper`, OpenTofu can fetch fresh ECR credentials without re-running `aws ecr get-login-password` before every `tofu init`. Use ECR resource policies for cross-account access so teams in development and staging accounts can pull providers without managing separate registries.
