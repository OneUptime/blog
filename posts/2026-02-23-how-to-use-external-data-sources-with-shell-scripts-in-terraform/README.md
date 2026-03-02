# How to Use External Data Sources with Shell Scripts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, External Provider, Shell Script, Bash, Infrastructure as Code

Description: Learn how to use Terraform external data sources with shell scripts to fetch dynamic data, query APIs, perform lookups, and integrate with command-line tools.

---

Shell scripts are ubiquitous in DevOps workflows. The Terraform external provider lets you harness shell scripts as data sources, bridging the gap between Terraform and the command-line tools you already use. This is valuable for querying APIs without dedicated providers, looking up dynamic configuration, and integrating with existing automation scripts.

In this guide, we will create several practical shell script data sources for Terraform. We will cover proper JSON handling, input parsing, error management, and patterns for common use cases like DNS lookups, API queries, and system information gathering.

## How External Data Sources Work with Shell Scripts

When Terraform calls an external data source, it passes a JSON object on stdin. Your shell script reads this JSON, performs its operation, and writes a JSON object to stdout. All values must be strings. Diagnostic messages go to stderr.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Basic JSON Input/Output Pattern

```hcl
# basic.tf - Demonstrates the JSON exchange pattern
data "external" "greeting" {
  program = ["bash", "${path.module}/scripts/greeting.sh"]

  query = {
    name = "Terraform"
  }
}

output "greeting" {
  value = data.external.greeting.result["message"]
}
```

The shell script:

```bash
#!/bin/bash
# scripts/greeting.sh
set -euo pipefail

# Read JSON from stdin and parse with jq
INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')

# Create and output JSON response
jq -n --arg msg "Hello, $NAME! Current time is $(date -u)" '{"message": $msg}'
```

## DNS Lookup Script

```hcl
# dns-lookup.tf - Look up DNS records
data "external" "dns_lookup" {
  program = ["bash", "${path.module}/scripts/dns-lookup.sh"]

  query = {
    domain      = "api.example.com"
    record_type = "A"
  }
}

output "dns_records" {
  value = data.external.dns_lookup.result
}
```

```bash
#!/bin/bash
# scripts/dns-lookup.sh - DNS record lookup
set -euo pipefail

INPUT=$(cat)
DOMAIN=$(echo "$INPUT" | jq -r '.domain')
RECORD_TYPE=$(echo "$INPUT" | jq -r '.record_type')

# Perform DNS lookup
RECORDS=$(dig +short "$RECORD_TYPE" "$DOMAIN" 2>/dev/null | head -5 | tr '\n' ',' | sed 's/,$//')

if [ -z "$RECORDS" ]; then
  RECORDS="no-records-found"
fi

RECORD_COUNT=$(echo "$RECORDS" | tr ',' '\n' | wc -l | tr -d ' ')

jq -n \
  --arg domain "$DOMAIN" \
  --arg type "$RECORD_TYPE" \
  --arg records "$RECORDS" \
  --arg count "$RECORD_COUNT" \
  '{"domain": $domain, "type": $type, "records": $records, "count": $count}'
```

## Git Information Script

```hcl
# git-info.tf - Get current git information
data "external" "git_info" {
  program = ["bash", "${path.module}/scripts/git-info.sh"]

  query = {
    repo_path = path.root
  }
}

output "git_info" {
  value = data.external.git_info.result
}
```

```bash
#!/bin/bash
# scripts/git-info.sh - Get git repository information
set -euo pipefail

INPUT=$(cat)
REPO_PATH=$(echo "$INPUT" | jq -r '.repo_path')

cd "$REPO_PATH" 2>/dev/null || {
  jq -n '{"branch": "unknown", "commit": "unknown", "tag": "unknown", "dirty": "unknown"}'
  exit 0
}

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG=$(git describe --tags --exact-match 2>/dev/null || echo "untagged")
DIRTY=$(git diff --quiet 2>/dev/null && echo "false" || echo "true")

jq -n \
  --arg branch "$BRANCH" \
  --arg commit "$COMMIT" \
  --arg tag "$TAG" \
  --arg dirty "$DIRTY" \
  '{"branch": $branch, "commit": $commit, "tag": $tag, "dirty": $dirty}'
```

## AWS Account Information Script

```hcl
# aws-info.tf - Get AWS account details
data "external" "aws_info" {
  program = ["bash", "${path.module}/scripts/aws-info.sh"]

  query = {
    profile = var.aws_profile
  }
}

variable "aws_profile" {
  type    = string
  default = "default"
}
```

```bash
#!/bin/bash
# scripts/aws-info.sh - Get AWS account information
set -euo pipefail

INPUT=$(cat)
PROFILE=$(echo "$INPUT" | jq -r '.profile')

# Get caller identity
IDENTITY=$(aws sts get-caller-identity --profile "$PROFILE" 2>/dev/null)

ACCOUNT=$(echo "$IDENTITY" | jq -r '.Account // "unknown"')
ARN=$(echo "$IDENTITY" | jq -r '.Arn // "unknown"')
USER_ID=$(echo "$IDENTITY" | jq -r '.UserId // "unknown"')

# Get current region
REGION=$(aws configure get region --profile "$PROFILE" 2>/dev/null || echo "us-east-1")

jq -n \
  --arg account "$ACCOUNT" \
  --arg arn "$ARN" \
  --arg user_id "$USER_ID" \
  --arg region "$REGION" \
  '{"account_id": $account, "arn": $arn, "user_id": $user_id, "region": $region}'
```

## Docker Image Tag Script

```hcl
# docker-tag.tf - Get latest Docker image tag
data "external" "latest_image" {
  program = ["bash", "${path.module}/scripts/docker-latest.sh"]

  query = {
    repository = "myapp"
    registry   = "123456789.dkr.ecr.us-east-1.amazonaws.com"
  }
}

output "latest_image_tag" {
  value = data.external.latest_image.result["tag"]
}
```

```bash
#!/bin/bash
# scripts/docker-latest.sh - Get latest Docker image tag
set -euo pipefail

INPUT=$(cat)
REPOSITORY=$(echo "$INPUT" | jq -r '.repository')
REGISTRY=$(echo "$INPUT" | jq -r '.registry')

# Get latest tag from ECR
TAG=$(aws ecr describe-images \
  --repository-name "$REPOSITORY" \
  --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]' \
  --output text 2>/dev/null || echo "latest")

DIGEST=$(aws ecr describe-images \
  --repository-name "$REPOSITORY" \
  --image-ids imageTag="$TAG" \
  --query 'imageDetails[0].imageDigest' \
  --output text 2>/dev/null || echo "unknown")

jq -n \
  --arg tag "$TAG" \
  --arg digest "$DIGEST" \
  --arg image "$REGISTRY/$REPOSITORY:$TAG" \
  '{"tag": $tag, "digest": $digest, "full_image": $image}'
```

## Error Handling Best Practices

```bash
#!/bin/bash
# scripts/robust-template.sh - Template with proper error handling
set -euo pipefail

# Read all of stdin into a variable
INPUT=$(cat)

# Parse inputs with defaults
PARAM1=$(echo "$INPUT" | jq -r '.param1 // "default1"')
PARAM2=$(echo "$INPUT" | jq -r '.param2 // "default2"')

# Validate required inputs
if [ "$PARAM1" = "null" ] || [ -z "$PARAM1" ]; then
  echo "Error: param1 is required" >&2
  exit 1
fi

# Perform operation with fallback
RESULT=$(some_command "$PARAM1" 2>/dev/null) || {
  echo "Warning: primary command failed, trying fallback" >&2
  RESULT=$(fallback_command "$PARAM1" 2>/dev/null) || {
    echo "Error: both primary and fallback commands failed" >&2
    exit 1
  }
}

# Always output valid JSON
jq -n --arg result "$RESULT" '{"result": $result}'
```

## Conclusion

Shell scripts as Terraform external data sources are a powerful escape hatch for integrating with tools and APIs that lack native Terraform providers. The key to success is proper JSON handling with jq, robust error management, and keeping scripts focused on data retrieval rather than making changes. For Python-based alternatives, see [external data sources with Python](https://oneuptime.com/blog/post/2026-02-23-how-to-use-external-data-sources-with-python-scripts-in-terraform/view).
