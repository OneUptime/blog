# How to Use Amazon ECR with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, AWS, ECR, Cloud

Description: A complete guide to using Amazon Elastic Container Registry with Podman, including authentication, image management, and CI/CD integration.

---

> Amazon ECR provides a fully managed container registry that integrates with AWS services, and Podman can use it with the right authentication setup.

Amazon Elastic Container Registry (ECR) is a fully managed Docker container registry provided by AWS. While ECR is designed to work with Docker, Podman supports it through the same Docker registry API. The main difference is the authentication mechanism, which uses AWS credentials and temporary tokens. This guide walks you through setting up Podman with ECR.

---

## Prerequisites

Ensure you have the AWS CLI installed and configured.

```bash
# Install the AWS CLI (if not already installed)

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region

# Verify AWS CLI is working
aws sts get-caller-identity
```

## Authenticating Podman to ECR

ECR uses temporary authentication tokens that expire after 12 hours.

```bash
# Get the ECR login password and pipe it to podman login
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Replace 123456789012 with your AWS account ID
# Replace us-east-1 with your AWS region
```

## Creating an ECR Repository

You need to create a repository in ECR before pushing images.

```bash
# Create a new repository
aws ecr create-repository \
  --repository-name myapp \
  --region us-east-1

# Configure scan on push for this repository at the registry level
aws ecr put-registry-scanning-configuration \
  --scan-type BASIC \
  --rules '[{"scanFrequency":"SCAN_ON_PUSH","repositoryFilters":[{"filter":"myapp","filterType":"WILDCARD"}]}]' \
  --region us-east-1

# List existing repositories
aws ecr describe-repositories --region us-east-1
```

## Pulling Images from ECR

Pull images from your ECR repository.

```bash
# Set your registry URL as a variable for convenience
ECR_REGISTRY="123456789012.dkr.ecr.us-east-1.amazonaws.com"

# Pull an image from ECR
podman pull ${ECR_REGISTRY}/myapp:latest

# Pull a specific tag
podman pull ${ECR_REGISTRY}/myapp:v1.0.0

# List pulled ECR images
podman images | grep ecr
```

## Pushing Images to ECR

Build, tag, and push images to your ECR repository.

```bash
ECR_REGISTRY="123456789012.dkr.ecr.us-east-1.amazonaws.com"

# Build a local image
podman build -t myapp:latest .

# Tag the image for ECR
podman tag myapp:latest ${ECR_REGISTRY}/myapp:latest
podman tag myapp:latest ${ECR_REGISTRY}/myapp:v1.0.0

# Push the image
podman push ${ECR_REGISTRY}/myapp:latest
podman push ${ECR_REGISTRY}/myapp:v1.0.0

# Verify the push
aws ecr list-images --repository-name myapp --region us-east-1
```

## Automating ECR Authentication

Since ECR tokens expire after 12 hours, automate the refresh.

```bash
#!/bin/bash
# ecr-login.sh - Refresh ECR authentication token

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Logging in to ECR: ${ECR_REGISTRY}"
aws ecr get-login-password --region "${AWS_REGION}" | \
  podman login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "ECR login successful. Token valid for 12 hours."
```

```bash
# Make the script executable and run it
chmod +x ecr-login.sh
./ecr-login.sh

# Set up a cron job to refresh every 10 hours
crontab -e
# Add: 0 */10 * * * /path/to/ecr-login.sh
```

## Using ECR with the amazon-ecr-credential-helper

The credential helper automates token management.

```bash
# Install the ECR credential helper
sudo yum install amazon-ecr-credential-helper 2>/dev/null || \
  go install github.com/awslabs/amazon-ecr-credential-helper/ecr-login/cli/docker-credential-ecr-login@latest

# Configure Podman to use the credential helper
mkdir -p ${XDG_RUNTIME_DIR}/containers

cat > ${XDG_RUNTIME_DIR}/containers/auth.json <<'EOF'
{
    "credHelpers": {
        "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login",
        "public.ecr.aws": "ecr-login"
    }
}
EOF

# Now podman pull/push will automatically authenticate
podman pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

## Using ECR Public Gallery

AWS also offers a public container registry.

```bash
# Pull from ECR Public (no authentication required)
podman pull public.ecr.aws/docker/library/alpine:latest
podman pull public.ecr.aws/nginx/nginx:latest

# Authenticate to ECR Public (for pushing)
aws ecr-public get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin public.ecr.aws
```

## ECR Lifecycle Policies

Manage image retention with lifecycle policies.

```bash
# Create a lifecycle policy to keep only the last 10 images
aws ecr put-lifecycle-policy \
  --repository-name myapp \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep only 10 most recent images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": {
          "type": "expire"
        }
      }
    ]
  }' \
  --region us-east-1
```

## CI/CD Pipeline with ECR

A complete CI/CD script for ECR and Podman.

```bash
#!/bin/bash
# ci-ecr-deploy.sh - Build and push to ECR

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="myapp"
IMAGE_TAG="${CI_COMMIT_SHA:0:8}"

# Authenticate to ECR
aws ecr get-login-password --region "${AWS_REGION}" | \
  podman login --username AWS --password-stdin "${ECR_REGISTRY}"

# Build and tag
podman build -t "${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" .
podman tag "${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
  "${ECR_REGISTRY}/${IMAGE_NAME}:latest"

# Push both tags
podman push "${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
podman push "${ECR_REGISTRY}/${IMAGE_NAME}:latest"

echo "Deployed: ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
```

## Summary

Amazon ECR works with Podman through the standard Docker registry API. The main challenge is authentication, which requires AWS credentials and temporary tokens that expire every 12 hours. Use the `aws ecr get-login-password` command to authenticate, or install the ECR credential helper for automatic token management. ECR supports lifecycle policies for image retention and integrates with other AWS services for scanning and deployment.
