# How to Use CodeBuild with Docker for Building Container Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, Docker, ECR, CI/CD

Description: Learn how to use AWS CodeBuild to build Docker container images, push them to Amazon ECR, implement multi-stage builds, and optimize image build performance with caching.

---

Building Docker images in CI/CD is one of the most common CodeBuild use cases. Your application code goes in, a Docker image comes out, and it lands in Amazon ECR ready for deployment. CodeBuild handles this natively - no need for Docker-in-Docker hacks or dedicated build servers.

This guide covers everything from basic Docker builds to multi-stage builds, layer caching, image scanning, and multi-architecture builds.

## Prerequisites

To build Docker images in CodeBuild, you need two things:

1. **Privileged mode enabled** on your CodeBuild project (Docker requires it)
2. **ECR permissions** in your CodeBuild service role

```bash
# Add ECR permissions to the CodeBuild service role
cat > ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:GetAuthorizationToken",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:DescribeImages"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name CodeBuildServiceRole \
  --policy-name ECRAccess \
  --policy-document file://ecr-policy.json
```

Create the ECR repository.

```bash
# Create the ECR repository
aws ecr create-repository \
  --repository-name my-application \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Set lifecycle policy to clean up old images
aws ecr put-lifecycle-policy \
  --repository-name my-application \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep only last 20 images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 20
        },
        "action": {"type": "expire"}
      },
      {
        "rulePriority": 2,
        "description": "Remove untagged images after 7 days",
        "selection": {
          "tagStatus": "untagged",
          "countType": "sinceImagePushed",
          "countUnit": "days",
          "countNumber": 7
        },
        "action": {"type": "expire"}
      }
    ]
  }'
```

## Step 1: Create the CodeBuild Project

Create a project with privileged mode enabled.

```bash
aws codebuild create-project \
  --name my-app-docker-build \
  --source '{
    "type": "CODECOMMIT",
    "location": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application",
    "buildspec": "buildspec.yml"
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "ECR_REGISTRY",
        "value": "123456789012.dkr.ecr.us-east-1.amazonaws.com",
        "type": "PLAINTEXT"
      },
      {
        "name": "IMAGE_REPO",
        "value": "my-application",
        "type": "PLAINTEXT"
      }
    ]
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --cache '{
    "type": "LOCAL",
    "modes": ["LOCAL_DOCKER_LAYER_CACHE"]
  }' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
```

The `LOCAL_DOCKER_LAYER_CACHE` mode caches Docker layers between builds, significantly speeding up subsequent builds.

## Step 2: Write the Buildspec for Docker

Here's a buildspec that builds, tags, and pushes a Docker image to ECR.

```yaml
# buildspec.yml
version: 0.2

env:
  variables:
    ECR_REGISTRY: "123456789012.dkr.ecr.us-east-1.amazonaws.com"
    IMAGE_REPO: "my-application"

phases:
  pre_build:
    commands:
      # Log in to ECR
      - echo "Logging in to Amazon ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

      # Set image tag based on git commit
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}
      - echo "Image tag will be $IMAGE_TAG"

  build:
    commands:
      # Build the Docker image
      - echo "Building Docker image..."
      - docker build -t $ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG .
      - docker tag $ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG $ECR_REGISTRY/$IMAGE_REPO:latest

  post_build:
    commands:
      # Push the image
      - echo "Pushing image to ECR..."
      - docker push $ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG
      - docker push $ECR_REGISTRY/$IMAGE_REPO:latest

      # Write the image URI to a file for downstream stages
      - echo "$ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG" > image_uri.txt
      - echo "Image URI: $(cat image_uri.txt)"

artifacts:
  files:
    - image_uri.txt
    - appspec.yml
    - taskdef.json
```

## Step 3: Write an Optimized Dockerfile

A well-structured Dockerfile makes your builds faster and your images smaller.

```dockerfile
# Dockerfile - Multi-stage build for a Node.js application

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 appgroup
RUN adduser --system --uid 1001 appuser

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Advanced: Docker Layer Caching with BuildKit

For even faster builds, use BuildKit with remote cache.

```yaml
# buildspec.yml with BuildKit caching
version: 0.2

env:
  variables:
    DOCKER_BUILDKIT: "1"

phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

  build:
    commands:
      # Pull previous image for cache
      - docker pull $ECR_REGISTRY/$IMAGE_REPO:latest || true

      # Build with cache-from
      - |
        docker build \
          --cache-from $ECR_REGISTRY/$IMAGE_REPO:latest \
          --build-arg BUILDKIT_INLINE_CACHE=1 \
          -t $ECR_REGISTRY/$IMAGE_REPO:$COMMIT_HASH \
          -t $ECR_REGISTRY/$IMAGE_REPO:latest \
          .

  post_build:
    commands:
      - docker push $ECR_REGISTRY/$IMAGE_REPO:$COMMIT_HASH
      - docker push $ECR_REGISTRY/$IMAGE_REPO:latest
```

The `--cache-from` flag tells Docker to use the previously pushed image as a cache source. Combined with `BUILDKIT_INLINE_CACHE=1`, the cache metadata is embedded in the image itself.

## Advanced: Multi-Architecture Builds

Build images for both x86 and ARM architectures.

```yaml
# buildspec.yml for multi-arch builds
version: 0.2

phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
      # Set up Docker Buildx for multi-platform builds
      - docker buildx create --use --name multiarch
      - docker buildx inspect --bootstrap

  build:
    commands:
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - |
        docker buildx build \
          --platform linux/amd64,linux/arm64 \
          --tag $ECR_REGISTRY/$IMAGE_REPO:$COMMIT_HASH \
          --tag $ECR_REGISTRY/$IMAGE_REPO:latest \
          --push \
          .

  post_build:
    commands:
      - echo "Multi-arch image pushed successfully"
      - docker manifest inspect $ECR_REGISTRY/$IMAGE_REPO:$COMMIT_HASH
```

## Image Scanning

ECR can scan images for vulnerabilities on push. Check the results in your build.

```yaml
# Add to post_build phase
post_build:
  commands:
    - docker push $ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG

    # Wait for scan to complete
    - echo "Waiting for image scan..."
    - |
      aws ecr wait image-scan-complete \
        --repository-name $IMAGE_REPO \
        --image-id imageTag=$IMAGE_TAG

    # Check scan results
    - |
      SCAN_FINDINGS=$(aws ecr describe-image-scan-findings \
        --repository-name $IMAGE_REPO \
        --image-id imageTag=$IMAGE_TAG \
        --query 'imageScanFindings.findingSeverityCounts')

      echo "Scan findings: $SCAN_FINDINGS"

      # Fail build if critical vulnerabilities found
      CRITICAL=$(echo $SCAN_FINDINGS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('CRITICAL', 0))")
      if [ "$CRITICAL" -gt 0 ]; then
        echo "CRITICAL vulnerabilities found! Failing build."
        exit 1
      fi
```

## Tagging Strategy

Use meaningful tags that link images back to source code.

```yaml
pre_build:
  commands:
    - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
    - BRANCH=$(echo $CODEBUILD_WEBHOOK_HEAD_REF | sed 's|refs/heads/||' | sed 's|/|-|g')
    - BUILD_DATE=$(date +%Y%m%d)
    - BUILD_NUM=$CODEBUILD_BUILD_NUMBER

    # Tag format: branch-date-buildnum-commit
    - IMAGE_TAG="${BRANCH}-${BUILD_DATE}-${BUILD_NUM}-${COMMIT_HASH}"
    - echo "Full image tag: $IMAGE_TAG"
```

This gives you tags like `main-20260212-42-a1b2c3d` which are both human-readable and traceable back to the exact source commit.

Building Docker images with CodeBuild is straightforward once you've got the IAM permissions and privileged mode sorted out. The key to fast builds is proper layer caching - both in your Dockerfile structure and CodeBuild's cache configuration. For more on optimizing your CodeBuild setup, check out our guide on [caching dependencies in CodeBuild](https://oneuptime.com/blog/post/cache-dependencies-codebuild-faster-builds/view).
