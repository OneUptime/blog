# How to Push Docker Images to ECR from CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, CI/CD, Docker, GitHub Actions

Description: Step-by-step guide to pushing Docker images to Amazon ECR from popular CI/CD platforms including GitHub Actions, GitLab CI, Jenkins, and AWS CodeBuild.

---

Pushing container images to ECR is one of the first things you set up when building a containerized deployment pipeline. The basic steps are always the same: authenticate with ECR, build your image, tag it, and push. But the details vary depending on which CI/CD platform you're using and how you authenticate.

Let's go through concrete examples for the most popular CI/CD platforms.

## The General Flow

Regardless of your CI/CD platform, the steps are:

1. Authenticate Docker with ECR (get a temporary token)
2. Build your Docker image
3. Tag it with the ECR repository URI
4. Push to ECR

```bash
# The universal ECR push pattern
AWS_ACCOUNT_ID=123456789
REGION=us-east-1
REPO_NAME=my-web-app
IMAGE_TAG=$(git rev-parse --short HEAD)

# Step 1: Authenticate
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Step 2: Build
docker build -t ${REPO_NAME}:${IMAGE_TAG} .

# Step 3: Tag
docker tag ${REPO_NAME}:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}

# Step 4: Push
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
```

## GitHub Actions

GitHub Actions is the most common CI/CD platform for pushing to ECR. Use OIDC federation for authentication instead of storing AWS access keys as secrets.

First, set up the OIDC provider in AWS.

```hcl
# Terraform - GitHub OIDC provider and role
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-ecr-push"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:myorg/my-repo:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecr_push" {
  name = "ecr-push"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "arn:aws:ecr:us-east-1:123456789:repository/my-web-app"
      }
    ]
  })
}
```

Then the GitHub Actions workflow.

```yaml
# .github/workflows/build-push.yml
name: Build and Push to ECR

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: my-web-app

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-ecr-push
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build with git SHA tag
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

          # Also tag as latest for convenience
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Output image URI
        run: |
          echo "Image: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}"
```

## GitLab CI

GitLab CI uses environment variables for AWS credentials. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your project's CI/CD settings.

```yaml
# .gitlab-ci.yml
stages:
  - build

variables:
  AWS_REGION: us-east-1
  ECR_REPO: 123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app

build-and-push:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    # Install AWS CLI
    - apk add --no-cache aws-cli
    # Authenticate with ECR
    - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
  script:
    - IMAGE_TAG=${CI_COMMIT_SHORT_SHA}
    - docker build -t $ECR_REPO:$IMAGE_TAG .
    - docker push $ECR_REPO:$IMAGE_TAG
    # Tag with branch name for non-main branches
    - |
      if [ "$CI_COMMIT_BRANCH" = "main" ]; then
        docker tag $ECR_REPO:$IMAGE_TAG $ECR_REPO:latest
        docker push $ECR_REPO:latest
      fi
  only:
    - main
    - merge_requests
```

## Jenkins

For Jenkins, use the AWS Credentials plugin or assume a role via the EC2 instance profile.

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '123456789'
        ECR_REPO       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-web-app"
        IMAGE_TAG      = "${GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Build and Push') {
            steps {
                withAWS(credentials: 'aws-ecr-credentials', region: env.AWS_REGION) {
                    sh '''
                        # Authenticate Docker with ECR
                        aws ecr get-login-password --region $AWS_REGION | \
                            docker login --username AWS --password-stdin $ECR_REPO

                        # Build and push
                        docker build -t $ECR_REPO:$IMAGE_TAG .
                        docker push $ECR_REPO:$IMAGE_TAG
                    '''
                }
            }
        }
    }
}
```

## AWS CodeBuild

CodeBuild runs inside AWS, so authentication is simpler - just give the CodeBuild service role ECR permissions.

```yaml
# buildspec.yml
version: 0.2

env:
  variables:
    AWS_ACCOUNT_ID: "123456789"
    AWS_DEFAULT_REGION: "us-east-1"
    IMAGE_REPO_NAME: "my-web-app"

phases:
  pre_build:
    commands:
      # Login to ECR
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-7)
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME

  build:
    commands:
      - echo Building the Docker image...
      - docker build -t $REPOSITORY_URI:$IMAGE_TAG .
      - docker tag $REPOSITORY_URI:$IMAGE_TAG $REPOSITORY_URI:latest

  post_build:
    commands:
      - echo Pushing the Docker image...
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - docker push $REPOSITORY_URI:latest
      # Output for downstream CodePipeline stages
      - printf '[{"name":"app","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

The CodeBuild service role needs these permissions.

```hcl
resource "aws_iam_role_policy" "codebuild_ecr" {
  name = "codebuild-ecr-push"
  role = aws_iam_role.codebuild.id

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
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "arn:aws:ecr:*:*:repository/my-web-app"
      }
    ]
  })
}
```

## Multi-Architecture Builds

If you need to build for both x86 and ARM (for Graviton-based Fargate), use Docker Buildx.

```yaml
# GitHub Actions with multi-arch build
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push multi-arch image
  uses: docker/build-push-action@v5
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: |
      ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
      ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Build Caching

Docker layer caching speeds up builds significantly. Here are approaches for different platforms.

```yaml
# GitHub Actions - Use GitHub Actions cache
- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

```yaml
# CodeBuild - Use ECR as a cache source
phases:
  build:
    commands:
      # Pull the latest image to use as cache
      - docker pull $REPOSITORY_URI:latest || true
      - docker build --cache-from $REPOSITORY_URI:latest -t $REPOSITORY_URI:$IMAGE_TAG .
```

## Security Best Practices

1. **Use OIDC federation** (GitHub Actions) or IAM roles (CodeBuild, Jenkins on EC2) instead of long-lived access keys
2. **Scope ECR permissions** to specific repositories, not `*`
3. **Enable image scanning** on push to catch vulnerabilities early (see our post on [ECR image scanning](https://oneuptime.com/blog/post/ecr-image-scanning-vulnerabilities/view))
4. **Use immutable tags** to prevent overwriting images
5. **Don't push from developer machines** - All pushes should go through CI/CD

For a deeper look at authentication methods, see our post on [authenticating Docker with ECR](https://oneuptime.com/blog/post/authenticate-docker-ecr/view).

Pushing images to ECR from CI/CD is foundational. Get the authentication and permissions right once, and every deployment that follows flows smoothly. Pick the approach that matches your CI/CD platform, scope the IAM permissions tightly, and you're set.
