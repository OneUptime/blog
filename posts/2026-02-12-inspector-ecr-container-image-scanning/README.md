# How to Use Inspector for ECR Container Image Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Inspector, ECR, Containers, Security

Description: Learn how to configure Amazon Inspector for automated vulnerability scanning of container images in ECR, including continuous scanning, CI/CD integration, and finding remediation.

---

Container images are a major attack surface. A single vulnerable package in your base image gets replicated across every container instance running that image. Amazon Inspector's ECR scanning goes beyond the basic ECR scanning feature by providing continuous monitoring - not just scanning at push time, but re-evaluating images whenever new vulnerabilities are published.

This means an image that was clean last week might have new findings today because a new CVE was disclosed for one of its packages. Let's set up Inspector for ECR and build a workflow that keeps your container images secure.

## Basic vs Enhanced Scanning

ECR offers two scanning modes:

**Basic scanning** (free, built into ECR) scans images on push using the open-source Clair scanner. It only checks for CVEs in OS packages and only runs at push time. No continuous monitoring.

**Enhanced scanning** (powered by Inspector) scans on push AND continuously. It covers OS packages and application-layer packages (npm, pip, Maven, etc.). It also provides CVSS scores, fix information, and integration with Security Hub.

Enhanced scanning is what we want. Let's set it up.

## Enabling Inspector ECR Scanning

Enable Inspector with ECR as a resource type.

```bash
# Enable Inspector for ECR scanning
aws inspector2 enable \
  --resource-types ECR

# Verify it's enabled
aws inspector2 batch-get-account-status \
  --query 'accounts[0].resourceState.ecr.status'
```

Now configure ECR to use enhanced scanning instead of basic.

```bash
# Switch to enhanced scanning
aws ecr put-registry-scanning-configuration \
  --scan-type ENHANCED \
  --rules '[
    {
      "scanFrequency": "CONTINUOUS_SCAN",
      "repositoryFilters": [
        {
          "filter": "*",
          "filterType": "WILDCARD"
        }
      ]
    }
  ]'
```

The `CONTINUOUS_SCAN` setting means Inspector will re-scan images whenever new vulnerability data is available. You can also use `SCAN_ON_PUSH` for only scanning when images are pushed, which is cheaper but less comprehensive.

## Selective Repository Scanning

You might not need continuous scanning on every repository. Development repositories that hold throwaway images don't need the same scrutiny as production ones.

```bash
# Configure different scan frequencies for different repos
aws ecr put-registry-scanning-configuration \
  --scan-type ENHANCED \
  --rules '[
    {
      "scanFrequency": "CONTINUOUS_SCAN",
      "repositoryFilters": [
        {
          "filter": "prod-*",
          "filterType": "WILDCARD"
        }
      ]
    },
    {
      "scanFrequency": "SCAN_ON_PUSH",
      "repositoryFilters": [
        {
          "filter": "dev-*",
          "filterType": "WILDCARD"
        }
      ]
    }
  ]'
```

## Terraform Configuration

```hcl
# Enable Inspector for ECR
resource "aws_inspector2_enabler" "ecr" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR"]
}

# Configure enhanced scanning
resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"
    repository_filter {
      filter      = "prod-*"
      filter_type = "WILDCARD"
    }
  }

  rule {
    scan_frequency = "SCAN_ON_PUSH"
    repository_filter {
      filter      = "dev-*"
      filter_type = "WILDCARD"
    }
  }
}

# ECR repository
resource "aws_ecr_repository" "app" {
  name                 = "prod-my-app"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }
}
```

## Viewing Scan Results

After pushing an image, check the scan findings.

```bash
# List findings for ECR images
aws inspector2 list-findings \
  --filter-criteria '{
    "resourceType": [{"comparison": "EQUALS", "value": "AWS_ECR_CONTAINER_IMAGE"}],
    "findingStatus": [{"comparison": "EQUALS", "value": "ACTIVE"}]
  }' \
  --sort-criteria '{"field": "SEVERITY", "sortOrder": "DESC"}' \
  --max-results 20
```

For a specific image:

```bash
# Get findings for a specific repository
aws inspector2 list-findings \
  --filter-criteria '{
    "ecrImageRepositoryName": [{"comparison": "EQUALS", "value": "prod-my-app"}],
    "findingStatus": [{"comparison": "EQUALS", "value": "ACTIVE"}]
  }'
```

Get aggregated statistics:

```bash
# Count findings by severity for ECR images
aws inspector2 list-finding-aggregations \
  --aggregation-type REPOSITORY \
  --query 'responses[*].{Repository:repositoryAggregation.repository,Critical:severityCounts.critical,High:severityCounts.high,Medium:severityCounts.medium}'
```

## CI/CD Integration

The most effective place to catch vulnerabilities is in your CI/CD pipeline, before images reach production. Here's how to integrate Inspector scanning into your build process.

This script pushes an image and waits for the scan to complete before proceeding.

```bash
#!/bin/bash
# Push image and wait for Inspector scan results
set -euo pipefail

REPO_NAME="prod-my-app"
IMAGE_TAG="$CI_COMMIT_SHA"
ACCOUNT_ID="123456789012"
REGION="us-east-1"
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Log into ECR
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_URI"

# Push the image
docker push "$ECR_URI/$REPO_NAME:$IMAGE_TAG"

# Wait for scan to complete
echo "Waiting for scan results..."
for i in $(seq 1 60); do
  STATUS=$(aws ecr describe-image-scan-findings \
    --repository-name "$REPO_NAME" \
    --image-id imageTag="$IMAGE_TAG" \
    --query 'imageScanStatus.status' \
    --output text 2>/dev/null || echo "IN_PROGRESS")

  if [ "$STATUS" = "COMPLETE" ]; then
    echo "Scan complete"
    break
  fi

  if [ "$STATUS" = "FAILED" ]; then
    echo "Scan failed!"
    exit 1
  fi

  echo "  Scan status: $STATUS (attempt $i/60)"
  sleep 10
done

# Check for critical/high vulnerabilities
CRITICAL=$(aws inspector2 list-findings \
  --filter-criteria '{
    "ecrImageRepositoryName": [{"comparison": "EQUALS", "value": "'"$REPO_NAME"'"}],
    "ecrImageTags": [{"comparison": "EQUALS", "value": "'"$IMAGE_TAG"'"}],
    "severity": [{"comparison": "EQUALS", "value": "CRITICAL"}],
    "findingStatus": [{"comparison": "EQUALS", "value": "ACTIVE"}]
  }' \
  --query 'findings | length(@)')

HIGH=$(aws inspector2 list-findings \
  --filter-criteria '{
    "ecrImageRepositoryName": [{"comparison": "EQUALS", "value": "'"$REPO_NAME"'"}],
    "ecrImageTags": [{"comparison": "EQUALS", "value": "'"$IMAGE_TAG"'"}],
    "severity": [{"comparison": "EQUALS", "value": "HIGH"}],
    "findingStatus": [{"comparison": "EQUALS", "value": "ACTIVE"}]
  }' \
  --query 'findings | length(@)')

echo "Findings: $CRITICAL critical, $HIGH high"

# Fail the build if critical vulnerabilities found
if [ "$CRITICAL" -gt 0 ]; then
  echo "FAILED: $CRITICAL critical vulnerabilities found!"
  exit 1
fi

echo "Image passed security scan"
```

## Automated Finding Notifications

Set up EventBridge to alert on new findings.

```hcl
# Alert on critical ECR findings
resource "aws_cloudwatch_event_rule" "ecr_critical" {
  name = "inspector-ecr-critical"

  event_pattern = jsonencode({
    source      = ["aws.inspector2"]
    detail-type = ["Inspector2 Finding"]
    detail = {
      severity   = ["CRITICAL"]
      status     = ["ACTIVE"]
      resourceType = ["AWS_ECR_CONTAINER_IMAGE"]
    }
  })
}

resource "aws_cloudwatch_event_target" "ecr_alert" {
  rule = aws_cloudwatch_event_rule.ecr_critical.name
  arn  = aws_sns_topic.security_alerts.arn

  input_transformer {
    input_paths = {
      repo     = "$.detail.resources[0].details.awsEcrContainerImage.repositoryName"
      tag      = "$.detail.resources[0].details.awsEcrContainerImage.imageTags[0]"
      title    = "$.detail.title"
      severity = "$.detail.severity"
    }
    input_template = "\"Critical vulnerability in <repo>:<tag> - <title>\""
  }
}
```

## Image Lifecycle Policies

Combine Inspector scanning with ECR lifecycle policies to clean up vulnerable old images.

```bash
# Set up lifecycle policy to expire untagged images
aws ecr put-lifecycle-policy \
  --repository-name prod-my-app \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Remove untagged images after 7 days",
        "selection": {
          "tagStatus": "untagged",
          "countType": "sinceImagePushed",
          "countUnit": "days",
          "countNumber": 7
        },
        "action": {"type": "expire"}
      },
      {
        "rulePriority": 2,
        "description": "Keep only last 20 tagged images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 20
        },
        "action": {"type": "expire"}
      }
    ]
  }'
```

Fewer images in your registry means a smaller attack surface and lower Inspector scanning costs.

## Remediation Best Practices

When Inspector finds vulnerabilities in your container images:

1. **Update the base image first.** Most vulnerabilities come from the OS packages in your base image. Update to the latest patched version.
2. **Pin specific versions.** Don't use `latest` tags for base images. Pin to specific versions so you know exactly what you're running.
3. **Use minimal base images.** Alpine, distroless, or scratch-based images have fewer packages and therefore fewer potential vulnerabilities.
4. **Rebuild regularly.** Even if your code hasn't changed, rebuild images weekly to pick up base image patches.

```dockerfile
# Good: Minimal base image with pinned version
FROM node:20.11.1-alpine3.19 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20.11.1-alpine3.19
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 8080
CMD ["node", "server.js"]
```

For EC2 vulnerability scanning, see our guide on [Inspector for EC2](https://oneuptime.com/blog/post/amazon-inspector-ec2-vulnerability-scanning/view).

## Wrapping Up

Inspector ECR scanning closes a critical gap in container security. Enable enhanced scanning with continuous monitoring for production repositories, integrate scan checks into your CI/CD pipeline to catch issues before deployment, and set up alerts for new vulnerabilities discovered in already-deployed images. The continuous scanning feature is what sets this apart from basic scanning - new CVEs get matched against your existing images automatically, so you know about problems even when you haven't pushed new code.
