# How to Set Up ECR Repository Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, IAM, Security, Container Registry

Description: Learn how to configure ECR repository policies to control who can push, pull, and manage container images in your AWS container registry.

---

ECR repository policies are the access control layer between your container images and the rest of the world. By default, only the account that owns the repository can interact with it. But in real-world setups, you often need to share images across accounts, restrict who can push images, or allow specific CI/CD roles to manage the repository. That's where repository policies come in.

Repository policies are resource-based policies (like S3 bucket policies) that you attach directly to an ECR repository. They work alongside IAM policies to determine who can do what with your images.

## How Repository Policies Work

ECR uses two types of access control:

1. **IAM policies** - Attached to users, roles, or groups. They say "this principal can do these actions."
2. **Repository policies** - Attached to the repository itself. They say "these principals can do these actions on this repository."

For access within the same account, IAM policies are usually enough. Repository policies become essential when you need cross-account access or want to enforce restrictions at the repository level.

## Basic Pull-Only Policy

The most common scenario is allowing another account or role to pull images from your repository. Here's a policy that grants pull access to a specific AWS account.

```bash
# Set a repository policy that allows cross-account pull
aws ecr set-repository-policy \
  --repository-name my-web-app \
  --policy-text '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::987654321:root"
        },
        "Action": [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  }'
```

In Terraform:

```hcl
resource "aws_ecr_repository_policy" "allow_pull" {
  repository = aws_ecr_repository.web_app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPullFromProduction"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321:root"
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

## Push and Pull Policy

For CI/CD systems that need to both push new images and pull existing ones.

```hcl
resource "aws_ecr_repository_policy" "cicd_access" {
  repository = aws_ecr_repository.web_app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCICDPushPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789:role/github-actions-role",
            "arn:aws:iam::123456789:role/jenkins-build-role"
          ]
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}
```

## Multi-Account Access

In organizations with multiple AWS accounts (dev, staging, production), you often build images in one account and deploy them in others.

```hcl
resource "aws_ecr_repository_policy" "multi_account" {
  repository = aws_ecr_repository.web_app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBuildAccountPush"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::111111111111:role/build-role"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      },
      {
        Sid    = "AllowStagingPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::222222222222:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      },
      {
        Sid    = "AllowProductionPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::333333333333:root"
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

For a deeper dive into cross-account setups, see our post on [ECR cross-account image sharing](https://oneuptime.com/blog/post/2026-02-12-ecr-cross-account-image-sharing/view).

## Organization-Wide Access

If you're using AWS Organizations, you can grant access to the entire organization instead of listing individual accounts.

```hcl
resource "aws_ecr_repository_policy" "org_wide" {
  repository = aws_ecr_repository.shared_base_images.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowOrganizationPull"
        Effect = "Allow"
        Principal = "*"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Condition = {
          StringEquals = {
            "aws:PrincipalOrgID" = "o-abc123def4"
          }
        }
      }
    ]
  })
}
```

This is particularly useful for base images that every team in your organization needs.

## Restricting Push Access

Sometimes you want to make sure only your CI/CD pipeline can push images. No human should be pushing directly.

```hcl
resource "aws_ecr_repository_policy" "restrict_push" {
  repository = aws_ecr_repository.web_app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyManualPush"
        Effect = "Deny"
        Principal = "*"
        Action = [
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Condition = {
          StringNotLike = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::123456789:role/github-actions-role",
              "arn:aws:iam::123456789:role/codebuild-role"
            ]
          }
        }
      }
    ]
  })
}
```

## Lambda Function Access

If you're using Lambda with container images stored in ECR, the Lambda service needs access.

```hcl
resource "aws_ecr_repository_policy" "lambda_access" {
  repository = aws_ecr_repository.lambda_functions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaPull"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Condition = {
          StringLike = {
            "aws:sourceArn" = "arn:aws:lambda:us-east-1:123456789:function:*"
          }
        }
      }
    ]
  })
}
```

## ECR Actions Reference

Here's a quick reference for common ECR actions and what they're used for:

**Pull-related:**
- `ecr:GetDownloadUrlForLayer` - Get download URL for image layers
- `ecr:BatchGetImage` - Get image manifests
- `ecr:BatchCheckLayerAvailability` - Check if layers exist

**Push-related:**
- `ecr:PutImage` - Push an image manifest
- `ecr:InitiateLayerUpload` - Start uploading a layer
- `ecr:UploadLayerPart` - Upload a layer chunk
- `ecr:CompleteLayerUpload` - Finish uploading a layer

**Management:**
- `ecr:DescribeRepositories` - List repository info
- `ecr:ListImages` - List images in a repo
- `ecr:DescribeImages` - Get image details
- `ecr:DeleteRepository` - Delete the repo
- `ecr:BatchDeleteImage` - Delete images

**Auth:**
- `ecr:GetAuthorizationToken` - Get Docker login token (must be in IAM policy, not repository policy)

Note: `ecr:GetAuthorizationToken` can't be used in repository policies because it's not a per-repository action. It's an account-level action that must be in an IAM policy.

## Viewing Current Policies

```bash
# Get the current policy on a repository
aws ecr get-repository-policy \
  --repository-name my-web-app

# Delete a repository policy
aws ecr delete-repository-policy \
  --repository-name my-web-app
```

## Common Mistakes

**Forgetting GetAuthorizationToken**: Even with a repository policy granting pull access, the pulling role still needs `ecr:GetAuthorizationToken` in its IAM policy. This is needed to get the Docker login credentials.

**Using Principal: "*" without conditions**: This makes your repository publicly accessible. Always add a condition like `aws:PrincipalOrgID` or `aws:PrincipalArn`.

**Not testing cross-account access**: After setting up a repository policy, test the pull from the target account. The IAM role in the target account also needs ECR permissions in its own IAM policy.

Repository policies are the foundation of secure image management. Take the time to set them up properly, scope access to what's needed, and you'll have a container registry that's both accessible and secure.
