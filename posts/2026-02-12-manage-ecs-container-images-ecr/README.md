# How to Manage ECS Container Images in ECR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, ECR, Docker, Container Registry

Description: A practical guide to managing container images in Amazon ECR, covering repository creation, image tagging strategies, and integration with ECS deployments.

---

Amazon Elastic Container Registry (ECR) is where your ECS container images live. It's a fully managed Docker registry that integrates tightly with ECS - no credential management needed when pulling images from ECR within the same account. But there's more to ECR than just pushing and pulling images. Good image management practices around tagging, lifecycle policies, and security scanning can save you money and prevent production incidents.

Let's cover everything from basic setup to the operational patterns that matter at scale.

## Creating a Repository

Each ECR repository stores images for a single application or service. You'll typically have one repository per microservice.

```bash
# Create a repository
aws ecr create-repository \
  --repository-name my-web-app \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Create with KMS encryption
aws ecr create-repository \
  --repository-name my-web-app \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=KMS,kmsKey=arn:aws:kms:us-east-1:123456789:key/abc-123
```

In Terraform:

```hcl
resource "aws_ecr_repository" "web_app" {
  name = "my-web-app"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  # Prevent accidental deletion
  force_delete = false

  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwriting

  tags = {
    Service     = "web-app"
    Environment = "shared"
  }
}
```

Setting `image_tag_mutability` to `IMMUTABLE` is a best practice for production. It prevents anyone from pushing a new image with an existing tag, which protects against accidental overwrites and ensures that a given tag always points to the same image.

## Tagging Strategies

How you tag images directly affects your deployment workflow and debugging ability. Here are the common approaches.

**Git SHA tags** - The most reliable approach. Each image is tagged with the git commit SHA that produced it.

```bash
# Tag with git SHA
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t my-web-app:${GIT_SHA} .
docker tag my-web-app:${GIT_SHA} 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:${GIT_SHA}
```

**Semantic version tags** - Good for versioned releases.

```bash
docker tag my-web-app:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:v1.2.3
```

**Environment tags** - Tag images with the environment they're deployed to.

```bash
# After validating in staging, tag for production
aws ecr put-image \
  --repository-name my-web-app \
  --image-tag production \
  --image-manifest "$(aws ecr batch-get-image \
    --repository-name my-web-app \
    --image-ids imageTag=abc123f \
    --query 'images[0].imageManifest' \
    --output text)"
```

**Multi-tag approach** (recommended) - Use both git SHA and a semantic version.

```bash
# Build and tag with multiple tags
GIT_SHA=$(git rev-parse --short HEAD)
VERSION="v1.2.3"

docker build -t my-web-app .
docker tag my-web-app 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:${GIT_SHA}
docker tag my-web-app 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:${VERSION}
docker tag my-web-app 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:latest

# Push all tags
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:${GIT_SHA}
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:${VERSION}
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:latest
```

## Why You Should Avoid the Latest Tag in Production

Using the `latest` tag in ECS task definitions is tempting but dangerous:

1. You can't tell which version is running by looking at the task definition
2. Different tasks might pull different images if `latest` changes mid-deployment
3. Rollbacks are hard - what was the previous `latest`?
4. Image caching can mask updates (ECS might use a cached image)

Always use a specific tag (git SHA or version number) in your task definitions.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:abc123f"
    }
  ]
}
```

## Listing and Inspecting Images

Useful commands for managing your image inventory.

```bash
# List all images in a repository
aws ecr list-images \
  --repository-name my-web-app \
  --query 'imageIds[*]' \
  --output table

# Get detailed info about an image
aws ecr describe-images \
  --repository-name my-web-app \
  --image-ids imageTag=abc123f \
  --query 'imageDetails[0].{digest:imageDigest,pushed:imagePushedAt,size:imageSizeInBytes,tags:imageTags}'

# List images sorted by push date
aws ecr describe-images \
  --repository-name my-web-app \
  --query 'sort_by(imageDetails, &imagePushedAt)[*].{tags:imageTags,pushed:imagePushedAt,size:imageSizeInBytes}' \
  --output table
```

## Cleaning Up Old Images

ECR charges for storage, and old images pile up fast. You can delete images manually or set up lifecycle policies for automatic cleanup (see our post on [ECR lifecycle policies](https://oneuptime.com/blog/post/2026-02-12-ecr-lifecycle-policies-image-cleanup/view)).

```bash
# Delete a specific image
aws ecr batch-delete-image \
  --repository-name my-web-app \
  --image-ids imageTag=old-version

# Delete untagged images
UNTAGGED=$(aws ecr list-images \
  --repository-name my-web-app \
  --filter tagStatus=UNTAGGED \
  --query 'imageIds[*]' \
  --output json)

aws ecr batch-delete-image \
  --repository-name my-web-app \
  --image-ids "$UNTAGGED"
```

## Multi-Architecture Images

If you need to run containers on both x86 and ARM (Graviton) instances, you can push multi-architecture images.

```bash
# Create a builder for multi-platform builds
docker buildx create --name multiarch --use

# Build and push for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:v1.2.3 \
  --push .
```

## Repository Organization

For teams with many services, organize repositories with a naming convention.

```
# By team/service
team-a/api
team-a/worker
team-b/web
team-b/processor

# By environment purpose
base-images/node-18
base-images/python-3.11
services/api
services/worker
```

Terraform module for creating standardized repositories:

```hcl
variable "services" {
  default = ["api", "worker", "web-frontend", "data-processor"]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)

  name = "services/${each.value}"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "IMMUTABLE"
}

# Apply the same lifecycle policy to all repos
resource "aws_ecr_lifecycle_policy" "services" {
  for_each = toset(var.services)

  repository = aws_ecr_repository.services[each.value].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 50 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = 50
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countNumber = 7
          countUnit   = "days"
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Integrating with ECS

When ECS pulls images from ECR in the same account and region, it uses the execution role for authentication. No extra configuration needed.

```hcl
# Task definition pointing to ECR
resource "aws_ecs_task_definition" "app" {
  family                   = "web-app"
  execution_role_arn       = aws_iam_role.execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${aws_ecr_repository.web_app.repository_url}:${var.image_tag}"
    }
  ])
}

# The execution role needs these ECR permissions (included in managed policy)
# ecr:GetAuthorizationToken
# ecr:BatchCheckLayerAvailability
# ecr:GetDownloadUrlForLayer
# ecr:BatchGetImage
```

For cross-account or cross-region image pulls, you'll need additional repository policies (see our post on [ECR cross-account image sharing](https://oneuptime.com/blog/post/2026-02-12-ecr-cross-account-image-sharing/view)).

Managing ECR well means your deployments are faster, your costs are lower, and your security posture is stronger. Set up immutable tags, enable scanning, configure lifecycle policies, and use specific image tags in your task definitions. Your future self will thank you when that production rollback goes smoothly.
