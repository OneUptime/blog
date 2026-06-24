# How to Automate OpenTofu with Shell Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Shell Script, Automation, Bash, DevOps, Infrastructure as Code

Description: Learn how to write shell scripts to automate repetitive OpenTofu tasks like multi-workspace deployments, state manipulation, and environment bootstrapping.

## Introduction

Shell scripts bridge the gap between OpenTofu's declarative model and the procedural tasks needed around it - looping over environments, bootstrapping state backends, and orchestrating multi-step deployments. This guide covers practical automation patterns.

## Multi-Environment Deployment Script

```bash
#!/usr/bin/env bash
# scripts/deploy-all-environments.sh

set -euo pipefail

ENVIRONMENTS=("dev" "staging" "prod")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

deploy_environment() {
  local env="$1"
  echo "━━━ Deploying environment: ${env} ━━━"

  cd "${REPO_ROOT}/environments/${env}"

  # Initialize
  tofu init -input=false

  # Plan
  tofu plan -out="${env}.tfplan" -input=false

  # Apply (pause for confirmation on prod)
  if [[ "${env}" == "prod" ]]; then
    echo "Review the plan above. Press Enter to apply to PROD or Ctrl+C to abort."
    read -r
  fi

  tofu apply "${env}.tfplan"
  rm -f "${env}.tfplan"

  echo "✓ ${env} deployed successfully"
}

for environment in "${ENVIRONMENTS[@]}"; do
  deploy_environment "$environment"
done

echo "All environments deployed!"
```

## Bootstrap State Backend Script

```bash
#!/usr/bin/env bash
# scripts/bootstrap-backend.sh
# Creates the S3 bucket and DynamoDB table for remote state

set -euo pipefail

STATE_BUCKET="${1:?Usage: $0 <bucket-name> <region>}"
REGION="${2:?Usage: $0 <bucket-name> <region>}"

echo "Creating state bucket: ${STATE_BUCKET} in ${REGION}"

# Create S3 bucket
aws s3api create-bucket \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  $([ "${REGION}" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=${REGION}" || echo "")

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB table for state locking
TABLE_NAME="${STATE_BUCKET}-locks"
aws dynamodb create-table \
  --table-name "${TABLE_NAME}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${REGION}"

echo "Bootstrap complete. Add to backend config:"
echo "  bucket = \"${STATE_BUCKET}\""
echo "  dynamodb_table = \"${TABLE_NAME}\""
echo "  region = \"${REGION}\""
```

## Bulk State Import Script

```bash
#!/usr/bin/env bash
# scripts/bulk-import.sh
# Import multiple existing resources into state

set -euo pipefail

# Resource blocks for each address must already exist in configuration.

# Format: "resource_address=resource_id"
RESOURCES=(
  "aws_s3_bucket.app=my-app-bucket"
  "aws_security_group.app=sg-0abc123def456"
  "aws_vpc.main=vpc-0123456789abcdef0"
)

for resource_pair in "${RESOURCES[@]}"; do
  address="${resource_pair%%=*}"
  resource_id="${resource_pair##*=}"

  echo "Importing ${address} = ${resource_id}"
  tofu import "${address}" "${resource_id}"
done

echo "Import complete. Run 'tofu plan' to verify."
```

## Summary

Shell scripts around OpenTofu handle the procedural aspects of infrastructure management - multi-environment deployments, backend bootstrapping, and bulk operations. Combining bash with tofu CLI creates powerful, automatable infrastructure workflows.
