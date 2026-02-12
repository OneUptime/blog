# How to Set Up App Runner with ECR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, App Runner, ECR, Containers, DevOps

Description: A detailed guide to configuring AWS App Runner with Amazon ECR for automated container deployments, including IAM setup, image management, and deployment workflows.

---

AWS App Runner and ECR are a natural pairing. You build your container images, push them to ECR, and App Runner deploys them automatically. The integration is tight - App Runner can watch your ECR repository and trigger deployments whenever a new image appears. But getting the IAM permissions, image tagging strategy, and deployment pipeline right takes some thought.

This guide covers everything you need to set up a smooth App Runner to ECR workflow.

## Setting Up the ECR Repository

Start with an ECR repository configured for production use:

```bash
# Create the repository with image scanning and immutable tags
aws ecr create-repository \
  --repository-name my-service \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability MUTABLE \
  --encryption-configuration encryptionType=AES256

# Set a lifecycle policy to clean up old images
aws ecr put-lifecycle-policy \
  --repository-name my-service \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep last 20 tagged images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 20
        },
        "action": {
          "type": "expire"
        }
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
        "action": {
          "type": "expire"
        }
      }
    ]
  }'
```

The lifecycle policy keeps your repository clean and controls costs. Without it, old images accumulate and you pay for the storage indefinitely.

## IAM Configuration

App Runner needs an IAM role to pull images from ECR. This is called the "access role" and it's separate from the instance role that your application uses at runtime.

Create the access role:

```bash
# Create the trust policy for App Runner's build service
aws iam create-role \
  --role-name AppRunnerECRAccess \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "build.apprunner.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach the managed policy for ECR access
aws iam attach-role-policy \
  --role-name AppRunnerECRAccess \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

If you want to restrict access to specific repositories (recommended for production), use a custom policy instead:

```bash
# Create a scoped ECR access policy
aws iam put-role-policy \
  --role-name AppRunnerECRAccess \
  --policy-name ScopedECRAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "ecr:GetAuthorizationToken",
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages"
        ],
        "Resource": "arn:aws:ecr:us-east-1:123456789012:repository/my-service"
      }
    ]
  }'
```

## Image Tagging Strategy

How you tag your images affects how deployments work. There are two common strategies:

### Strategy 1: Mutable Latest Tag

Push every build with a unique tag (like the git SHA) and also update the `latest` tag. App Runner watches the `latest` tag and deploys when it changes.

```bash
# Build and tag with both the commit SHA and latest
docker build -t my-service:$GIT_SHA .
docker tag my-service:$GIT_SHA 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:$GIT_SHA
docker tag my-service:$GIT_SHA 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:latest

# Push both tags
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:$GIT_SHA
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:latest
```

This is simple and works well with auto-deployments. The downside is that `latest` is mutable and you can't guarantee which specific image is running without checking.

### Strategy 2: Semantic Version Tags

Use semantic versioning and point App Runner at the specific tag:

```bash
# Tag with a semantic version
docker build -t my-service:v2.3.1 .
docker tag my-service:v2.3.1 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:v2.3.1
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:v2.3.1

# Manually trigger App Runner to use the new version
aws apprunner update-service \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-service/abc123 \
  --source-configuration '{
    "imageRepository": {
      "imageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:v2.3.1",
      "imageRepositoryType": "ECR"
    }
  }'
```

This gives you explicit control over which version is deployed, which is better for production environments where you want deliberate deployments.

## Creating the App Runner Service

With the ECR repository and IAM role in place, create the service:

```bash
# Create the App Runner service connected to ECR
aws apprunner create-service \
  --service-name my-service \
  --source-configuration '{
    "imageRepository": {
      "imageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-service:latest",
      "imageConfiguration": {
        "port": "8080",
        "runtimeEnvironmentVariables": {
          "NODE_ENV": "production"
        }
      },
      "imageRepositoryType": "ECR"
    },
    "autoDeploymentsEnabled": true,
    "authenticationConfiguration": {
      "accessRoleArn": "arn:aws:iam::123456789012:role/AppRunnerECRAccess"
    }
  }' \
  --instance-configuration '{
    "cpu": "1024",
    "memory": "2048"
  }' \
  --health-check-configuration '{
    "protocol": "HTTP",
    "path": "/health",
    "interval": 10,
    "timeout": 5,
    "healthyThreshold": 1,
    "unhealthyThreshold": 5
  }'
```

With `autoDeploymentsEnabled: true`, App Runner watches the ECR image tag you specified and automatically deploys when the image changes.

## Monitoring Deployments

Track your deployments to make sure they're succeeding:

```bash
# List recent operations (deployments)
aws apprunner list-operations \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-service/abc123 \
  --query "OperationSummaryList[0:5].{id:Id, type:Type, status:Status, startedAt:StartedAt}"
```

If a deployment fails, App Runner automatically rolls back to the previous version. You can see what happened by checking the operation details and CloudWatch logs.

## Cross-Region ECR

If your ECR repository is in a different region than your App Runner service, you have two options:

1. **ECR replication** - Set up cross-region replication in ECR:

```bash
# Enable replication to another region
aws ecr put-replication-configuration \
  --replication-configuration '{
    "rules": [
      {
        "destinations": [
          {
            "region": "us-west-2",
            "registryId": "123456789012"
          }
        ]
      }
    ]
  }'
```

2. **Push to both regions** - Build once and push to ECR in both regions from your CI/CD pipeline.

Option 1 is less work to maintain but adds a slight delay for replication.

## Image Scanning Integration

ECR can scan images for vulnerabilities on push. Integrate this with your deployment workflow:

```bash
# Check scan results before deploying
aws ecr describe-image-scan-findings \
  --repository-name my-service \
  --image-id imageTag=latest \
  --query "imageScanFindings.findingSeverityCounts"
```

You could add a step in your CI/CD pipeline that checks scan results and blocks deployment if critical vulnerabilities are found:

```bash
# Simple check for critical vulnerabilities
CRITICAL_COUNT=$(aws ecr describe-image-scan-findings \
  --repository-name my-service \
  --image-id imageTag=$GIT_SHA \
  --query "imageScanFindings.findingSeverityCounts.CRITICAL" \
  --output text)

if [ "$CRITICAL_COUNT" != "None" ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "Found $CRITICAL_COUNT critical vulnerabilities. Blocking deployment."
  exit 1
fi
```

## Best Practices

A few things I've found work well:

1. **Always tag with the git SHA.** This gives you traceability from deployment back to the exact commit.

2. **Use lifecycle policies aggressively.** Without them, ECR storage costs grow linearly with every build.

3. **Test images locally before pushing.** Run `docker run` with the same environment variables App Runner will use.

4. **Keep images small.** Use multi-stage builds and Alpine-based images. Smaller images mean faster deployments.

5. **Don't store secrets in images.** Use App Runner's environment secrets feature to inject sensitive values at runtime.

## Wrapping Up

The ECR and App Runner integration provides a clean, automated deployment pipeline. Push an image, and it's live within minutes. With proper IAM scoping, lifecycle policies, and vulnerability scanning, you've got a production-grade workflow that's both secure and low-maintenance.

For source-code-based deployments instead of container images, check out our guide on [setting up App Runner with GitHub](https://oneuptime.com/blog/post/app-runner-with-github/view).
