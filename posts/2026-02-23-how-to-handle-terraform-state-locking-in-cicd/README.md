# How to Handle Terraform State Locking in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, State Management, DynamoDB, DevOps, Infrastructure as Code

Description: Learn how to properly handle Terraform state locking in CI/CD pipelines to prevent concurrent modifications, including DynamoDB locks, GCS locks, and troubleshooting strategies.

---

When two CI/CD pipelines try to modify the same Terraform state at the same time, bad things happen. Resources get created twice, state becomes corrupted, and you spend your afternoon manually reconciling infrastructure. State locking prevents this, but you need to configure it correctly for CI/CD environments where multiple pipeline runs can overlap.

## How Terraform State Locking Works

When you run `terraform plan` or `terraform apply`, Terraform acquires a lock on the state file before reading or writing it. This lock is held for the duration of the operation. If another process tries to acquire the lock while it is held, Terraform will either wait or fail depending on your configuration.

The lock mechanism depends on your backend:

- **S3 backend** - Uses a DynamoDB table
- **GCS backend** - Uses built-in object locking
- **Azure Blob** - Uses blob leases
- **Consul** - Uses Consul sessions
- **PostgreSQL** - Uses advisory locks

## Setting Up DynamoDB Locking for S3 Backend

This is the most common setup for AWS users:

```hcl
# backend.tf - S3 backend with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

Create the DynamoDB table:

```hcl
# state-infra/main.tf - Bootstrap the locking table
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery for safety
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Purpose = "Terraform state locking"
    ManagedBy = "terraform"
  }
}
```

The DynamoDB table stores lock entries with information about who holds the lock:

```json
{
  "LockID": "mycompany-terraform-state/production/terraform.tfstate-md5",
  "Info": {
    "ID": "a1b2c3d4-uuid",
    "Operation": "OperationTypeApply",
    "Who": "runner@github-actions",
    "Version": "1.7.0",
    "Created": "2026-02-23T10:30:00Z",
    "Path": "production/terraform.tfstate"
  }
}
```

## GCS Backend Locking

Google Cloud Storage has built-in locking - no extra resources needed:

```hcl
# backend.tf - GCS backend with built-in locking
terraform {
  backend "gcs" {
    bucket = "myproject-terraform-state"
    prefix = "production"
  }
}
```

GCS locking works by creating a `.tflock` file alongside your state file. The lock is automatically released when the operation completes.

## Azure Blob Storage Locking

Azure uses blob leases for locking:

```hcl
# backend.tf - Azure backend with blob lease locking
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "mycompanytfstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}
```

## Handling Lock Contention in CI/CD

In CI/CD, lock contention typically happens when:

1. Multiple PRs trigger plan jobs that run simultaneously
2. A plan job runs while an apply is in progress
3. A pipeline fails mid-operation and leaves a stale lock

### Strategy 1: Lock Retry with Timeout

Configure your pipeline to retry lock acquisition instead of failing immediately:

```yaml
# GitHub Actions - Retry on lock contention
- name: Terraform Plan with retry
  run: |
    MAX_RETRIES=5
    RETRY_DELAY=30

    for i in $(seq 1 $MAX_RETRIES); do
      echo "Attempt $i of $MAX_RETRIES"

      if terraform plan -no-color -out=tfplan 2>&1; then
        echo "Plan succeeded"
        exit 0
      fi

      # Check if the failure was due to a lock
      if terraform plan -no-color -out=tfplan 2>&1 | grep -q "Error acquiring the state lock"; then
        echo "State is locked. Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
        RETRY_DELAY=$((RETRY_DELAY * 2))  # Exponential backoff
      else
        echo "Plan failed for a non-lock reason"
        exit 1
      fi
    done

    echo "Failed to acquire lock after $MAX_RETRIES attempts"
    exit 1
```

### Strategy 2: Serialize Pipeline Runs

Use CI/CD concurrency controls to prevent parallel runs:

```yaml
# GitHub Actions - Serialize runs per environment
name: Terraform Apply

concurrency:
  group: terraform-production  # Only one run at a time for this group
  cancel-in-progress: false    # Do not cancel in-progress runs

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - name: Terraform Apply
        run: terraform apply -no-color -auto-approve
```

```yaml
# GitLab CI - Use resource_group for serialization
apply:
  stage: apply
  resource_group: production  # Only one job in this group runs at a time
  script:
    - terraform apply -no-color -auto-approve
```

### Strategy 3: Separate State Per Component

If different parts of your infrastructure are independent, split them into separate state files to reduce contention:

```text
infrastructure/
  networking/
    backend.tf     # State: networking/terraform.tfstate
    main.tf
  compute/
    backend.tf     # State: compute/terraform.tfstate
    main.tf
  database/
    backend.tf     # State: database/terraform.tfstate
    main.tf
```

This lets networking changes run in parallel with database changes since they lock different state files.

## Dealing with Stale Locks

Stale locks happen when a pipeline run crashes or times out without releasing the lock. Here is how to handle them:

### Detecting Stale Locks

```bash
# Check if a lock exists and how old it is
aws dynamodb get-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "mycompany-terraform-state/production/terraform.tfstate-md5"}}' \
  --query 'Item.Info.S' \
  --output text | python3 -c "
import json, sys
from datetime import datetime, timezone
info = json.loads(sys.stdin.read())
created = datetime.fromisoformat(info['Created'].replace('Z', '+00:00'))
age = datetime.now(timezone.utc) - created
print(f'Lock held by: {info[\"Who\"]}')
print(f'Operation: {info[\"Operation\"]}')
print(f'Lock age: {age}')
if age.total_seconds() > 3600:
    print('WARNING: Lock is over 1 hour old and may be stale')
"
```

### Force-Unlocking in CI/CD

Add a manual trigger to force-unlock stale locks:

```yaml
# .github/workflows/force-unlock.yml
name: Force Unlock Terraform State

on:
  workflow_dispatch:
    inputs:
      lock_id:
        description: "Lock ID to force-unlock"
        required: true
        type: string
      workspace:
        description: "Terraform workspace"
        required: true
        default: "production"
        type: choice
        options:
          - production
          - staging
          - dev

jobs:
  unlock:
    runs-on: ubuntu-latest
    environment: production  # Require approval before force-unlock

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Force Unlock
        run: |
          cd terraform
          terraform init -no-color
          terraform workspace select ${{ inputs.workspace }}
          terraform force-unlock -force ${{ inputs.lock_id }}
          echo "Lock ${{ inputs.lock_id }} has been released"
```

## Automated Stale Lock Cleanup

For teams that frequently hit stale locks, automate the cleanup:

```python
# cleanup_stale_locks.py - Run on a schedule to clean up stale locks
import boto3
import json
from datetime import datetime, timezone, timedelta

# Maximum lock age before considering it stale
MAX_LOCK_AGE = timedelta(hours=2)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('terraform-state-locks')

def cleanup_stale_locks():
    """Scan for and remove locks older than MAX_LOCK_AGE."""
    response = table.scan()

    for item in response['Items']:
        lock_id = item['LockID']
        info = json.loads(item.get('Info', '{}'))

        created_str = info.get('Created', '')
        if not created_str:
            continue

        created = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
        age = datetime.now(timezone.utc) - created

        if age > MAX_LOCK_AGE:
            print(f"Removing stale lock: {lock_id}")
            print(f"  Held by: {info.get('Who', 'unknown')}")
            print(f"  Age: {age}")
            table.delete_item(Key={'LockID': lock_id})

if __name__ == "__main__":
    cleanup_stale_locks()
```

## Lock Timeout Configuration

Terraform's `-lock-timeout` flag controls how long to wait for a lock before giving up:

```yaml
# Wait up to 5 minutes for the lock
- name: Terraform Plan
  run: terraform plan -no-color -lock-timeout=300s -out=tfplan
```

This is simpler than a manual retry loop and works well for pipelines where brief lock contention is expected.

## Monitoring Lock Contention

Track how often your team hits lock issues:

```hcl
# CloudWatch alarm for frequent lock failures
resource "aws_cloudwatch_metric_alarm" "lock_contention" {
  alarm_name          = "terraform-lock-contention"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConditionalCheckFailedRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High Terraform state lock contention"

  dimensions = {
    TableName = "terraform-state-locks"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Summary

State locking is critical for Terraform in CI/CD. Without it, concurrent runs will corrupt your state file and create infrastructure drift that is painful to fix. Use your backend's native locking mechanism, serialize critical operations with CI/CD concurrency controls, and have a plan for stale lock cleanup. The combination of `-lock-timeout`, pipeline serialization, and automated stale lock detection covers most scenarios you will encounter.

For more on related topics, see our guides on [handling concurrent Terraform runs in CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-concurrent-terraform-runs-in-cicd/view) and [implementing drift detection](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-drift-detection-in-terraform-cicd/view).
