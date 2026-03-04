# How to Enable ECR Image Scanning for Vulnerabilities

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, Security, Vulnerability Scanning, Containers

Description: Learn how to enable and configure ECR image scanning to automatically detect vulnerabilities in your container images before they reach production.

---

Shipping a container image with known vulnerabilities is like leaving your front door unlocked - it's only a matter of time before someone walks in. ECR includes built-in image scanning that checks your images against the Common Vulnerabilities and Exposures (CVE) database. You can scan images on push, on a schedule, or on demand, and the results tell you exactly which packages have known issues and how severe they are.

There are two scanning modes: basic scanning (free, uses Clair) and enhanced scanning (paid, uses Amazon Inspector with deeper analysis). Let's look at both.

## Basic Scanning

Basic scanning uses the open-source Clair engine to check your image layers for known vulnerabilities. It scans the operating system packages in your image.

### Enable Scan on Push

The simplest approach is to scan every image when it's pushed to the repository.

```bash
# Enable scan-on-push for a new repository
aws ecr create-repository \
  --repository-name my-web-app \
  --image-scanning-configuration scanOnPush=true

# Enable scan-on-push for an existing repository
aws ecr put-image-scanning-configuration \
  --repository-name my-web-app \
  --image-scanning-configuration scanOnPush=true
```

In Terraform:

```hcl
resource "aws_ecr_repository" "web_app" {
  name = "my-web-app"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "IMMUTABLE"
}
```

### Manual Scanning

You can also trigger a scan manually for images that were pushed before scanning was enabled.

```bash
# Trigger a scan for a specific image
aws ecr start-image-scan \
  --repository-name my-web-app \
  --image-id imageTag=v1.2.3

# Check scan status
aws ecr describe-image-scan-findings \
  --repository-name my-web-app \
  --image-id imageTag=v1.2.3 \
  --query 'imageScanStatus'
```

### Viewing Scan Results

```bash
# Get scan findings
aws ecr describe-image-scan-findings \
  --repository-name my-web-app \
  --image-id imageTag=v1.2.3 \
  --query 'imageScanFindings.findings[*].{severity:severity,name:name,description:description,uri:uri}' \
  --output table

# Get just the severity counts
aws ecr describe-image-scan-findings \
  --repository-name my-web-app \
  --image-id imageTag=v1.2.3 \
  --query 'imageScanFindings.findingSeverityCounts'
```

The output gives you a breakdown by severity:

```json
{
  "CRITICAL": 2,
  "HIGH": 5,
  "MEDIUM": 12,
  "LOW": 8,
  "INFORMATIONAL": 3
}
```

## Enhanced Scanning

Enhanced scanning uses Amazon Inspector and provides more thorough analysis. It scans both OS packages and application-level dependencies (like npm packages, Python pip packages, Java JARs, etc.). It also supports continuous scanning - Inspector re-scans images when new CVEs are published.

```bash
# Enable enhanced scanning for your registry
aws ecr put-registry-scanning-configuration \
  --scan-type ENHANCED \
  --rules '[
    {
      "repositoryFilters": [
        {
          "filter": "*",
          "filterType": "WILDCARD"
        }
      ],
      "scanFrequency": "CONTINUOUS_SCAN"
    }
  ]'
```

In Terraform:

```hcl
resource "aws_ecr_registry_scanning_configuration" "enhanced" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"

    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}
```

You can also target specific repositories for enhanced scanning.

```hcl
resource "aws_ecr_registry_scanning_configuration" "selective" {
  scan_type = "ENHANCED"

  # Production repos get continuous scanning
  rule {
    scan_frequency = "CONTINUOUS_SCAN"

    repository_filter {
      filter      = "production/*"
      filter_type = "WILDCARD"
    }
  }

  # Dev repos get scan-on-push only
  rule {
    scan_frequency = "SCAN_ON_PUSH"

    repository_filter {
      filter      = "dev/*"
      filter_type = "WILDCARD"
    }
  }
}
```

## Automating Vulnerability Response

Scanning is only useful if you act on the results. Here's how to set up automated alerts when vulnerabilities are found.

### EventBridge Rule for Scan Completions

```hcl
# EventBridge rule for completed scans with findings
resource "aws_cloudwatch_event_rule" "scan_findings" {
  name        = "ecr-scan-findings"
  description = "Trigger on ECR image scan completion"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    "detail-type" = ["ECR Image Scan"]
    detail = {
      "scan-status" = ["COMPLETE"]
      "finding-severity-counts" = {
        CRITICAL = [{ "numeric": [">", 0] }]
      }
    }
  })
}

# Send critical findings to SNS
resource "aws_cloudwatch_event_target" "scan_alert" {
  rule      = aws_cloudwatch_event_rule.scan_findings.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.security_alerts.arn
}
```

### Lambda Function for Scan Gating

You can use a Lambda function to block deployments when critical vulnerabilities are found.

```python
# Lambda function to check scan results before deployment
import boto3
import json

ecr = boto3.client('ecr')

def handler(event, context):
    repository = event['detail']['repository-name']
    image_tag = event['detail']['image-tags'][0] if event['detail']['image-tags'] else None
    image_digest = event['detail']['image-digest']

    # Get the scan findings
    response = ecr.describe_image_scan_findings(
        repositoryName=repository,
        imageId={'imageDigest': image_digest}
    )

    severity_counts = response['imageScanFindings'].get('findingSeverityCounts', {})
    critical_count = severity_counts.get('CRITICAL', 0)
    high_count = severity_counts.get('HIGH', 0)

    if critical_count > 0:
        print(f"BLOCKED: {repository}:{image_tag} has {critical_count} CRITICAL vulnerabilities")
        # Send alert, update deployment status, etc.
        notify_team(repository, image_tag, severity_counts)
        return {'approved': False, 'reason': f'{critical_count} critical vulnerabilities'}

    if high_count > 10:
        print(f"WARNING: {repository}:{image_tag} has {high_count} HIGH vulnerabilities")
        notify_team(repository, image_tag, severity_counts)

    return {'approved': True}

def notify_team(repo, tag, counts):
    sns = boto3.client('sns')
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789:security-alerts',
        Subject=f'ECR Scan Alert: {repo}:{tag}',
        Message=json.dumps(counts, indent=2)
    )
```

## CI/CD Integration

Add vulnerability scanning as a gate in your CI/CD pipeline. Here's a GitHub Actions example.

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-web-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-web-app:$IMAGE_TAG

      - name: Wait for scan results
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Wait for scan to complete (scan-on-push)
          echo "Waiting for scan to complete..."
          for i in $(seq 1 30); do
            STATUS=$(aws ecr describe-image-scan-findings \
              --repository-name my-web-app \
              --image-id imageTag=$IMAGE_TAG \
              --query 'imageScanStatus.status' \
              --output text 2>/dev/null || echo "PENDING")

            if [ "$STATUS" = "COMPLETE" ]; then
              break
            fi
            echo "Scan status: $STATUS. Waiting..."
            sleep 10
          done

      - name: Check for critical vulnerabilities
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          CRITICAL=$(aws ecr describe-image-scan-findings \
            --repository-name my-web-app \
            --image-id imageTag=$IMAGE_TAG \
            --query 'imageScanFindings.findingSeverityCounts.CRITICAL' \
            --output text)

          if [ "$CRITICAL" != "None" ] && [ "$CRITICAL" != "0" ]; then
            echo "Image has $CRITICAL critical vulnerabilities!"
            echo "Scan findings:"
            aws ecr describe-image-scan-findings \
              --repository-name my-web-app \
              --image-id imageTag=$IMAGE_TAG \
              --query 'imageScanFindings.findings[?severity==`CRITICAL`].[name,description]' \
              --output table
            exit 1
          fi

          echo "No critical vulnerabilities found. Proceeding with deployment."
```

## Reducing Vulnerabilities

The best way to handle vulnerabilities is to have fewer of them in the first place.

**Use minimal base images**: Alpine, distroless, or scratch-based images have far fewer packages and therefore fewer vulnerabilities.

```dockerfile
# Instead of this (hundreds of packages)
FROM node:18

# Use this (much smaller attack surface)
FROM node:18-alpine

# Or even better for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs18-debian12
COPY --from=builder /app/dist /app
COPY --from=builder /app/node_modules /app/node_modules
WORKDIR /app
CMD ["server.js"]
```

**Keep base images updated**: Rebuild regularly to pick up security patches.

**Pin dependencies**: Use lock files and specific version numbers to avoid pulling in newly vulnerable packages.

## Monitoring Scan Coverage

Make sure all your repositories have scanning enabled.

```bash
# List all repositories and their scanning config
aws ecr describe-repositories \
  --query 'repositories[*].{name:repositoryName,scanOnPush:imageScanningConfiguration.scanOnPush}' \
  --output table
```

For comprehensive security monitoring across your container infrastructure, including vulnerability management, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view).

## Cost Considerations

Basic scanning is free. Enhanced scanning with Inspector costs money:
- On-push scanning: $0.09 per image scan
- Continuous re-scanning: $0.01 per image per re-scan

For most teams, basic scanning covers the fundamentals. Turn on enhanced scanning for production repositories where you need deeper analysis and continuous monitoring.

Image scanning is a baseline security practice. Enable scan-on-push for every repository, set up alerts for critical findings, and add scan gating to your CI/CD pipeline. It takes 30 minutes to set up and can prevent a security incident that takes weeks to clean up.
