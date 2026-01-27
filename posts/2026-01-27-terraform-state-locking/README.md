# How to Implement Terraform State Locking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, State Locking, IaC, DevOps, Infrastructure

Description: Learn how to implement Terraform state locking to prevent concurrent modifications, including DynamoDB, GCS, and Azure Blob backends.

---

> Two engineers run `terraform apply` at the same time. One overwrites the other's changes. State corruption ensues. State locking prevents this nightmare scenario by ensuring only one operation modifies state at a time.

Without state locking, concurrent Terraform operations can corrupt your infrastructure state and lead to drift between your configuration and actual resources.

---

## Why State Locking Matters

Terraform state tracks the mapping between your configuration and real infrastructure. When multiple operations modify state simultaneously:

- Changes can be lost or overwritten
- State can become corrupted
- Resources may be created twice or orphaned
- Recovery requires manual intervention

State locking ensures mutual exclusion - only one Terraform operation can hold the lock at a time.

---

## How Terraform Locking Works

When you run `terraform plan` or `terraform apply`, Terraform:

1. Attempts to acquire a lock on the state
2. If locked, waits or fails depending on configuration
3. Performs the operation
4. Releases the lock when complete

```
                    +------------------+
                    |  terraform apply |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Acquire Lock    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +---------v-------+
     |  Lock Available |          |  Lock Held      |
     +--------+--------+          +---------+-------+
              |                             |
     +--------v--------+          +---------v-------+
     |  Hold Lock      |          |  Wait/Fail      |
     +--------+--------+          +-----------------+
              |
     +--------v--------+
     |  Execute Plan   |
     +--------+--------+
              |
     +--------v--------+
     |  Release Lock   |
     +-----------------+
```

---

## S3 Backend with DynamoDB Locking

AWS S3 stores state while DynamoDB provides locking. This is the most common production setup.

### Create DynamoDB Table

Create the lock table before configuring Terraform:

```hcl
# dynamodb.tf
# DynamoDB table for Terraform state locking
# The table requires a primary key named LockID

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"  # No capacity planning needed
  hash_key     = "LockID"           # Required by Terraform

  attribute {
    name = "LockID"
    type = "S"  # String type
  }

  tags = {
    Purpose = "Terraform state locking"
  }
}
```

### Configure S3 Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/infrastructure/terraform.tfstate"
    region         = "us-east-1"

    # Enable state locking via DynamoDB
    dynamodb_table = "terraform-state-locks"

    # Encrypt state at rest
    encrypt        = true
  }
}
```

### Verify Locking Works

Test by running two operations simultaneously:

```bash
# Terminal 1
terraform apply

# Terminal 2 (while Terminal 1 is running)
terraform plan
# Error: Error acquiring the state lock
# Lock Info:
#   ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
#   Path:      my-terraform-state/prod/infrastructure/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       user@hostname
#   Version:   1.5.0
#   Created:   2024-01-15 10:30:00.123456789 +0000 UTC
```

---

## GCS Backend with Built-in Locking

Google Cloud Storage has native locking support - no additional resources needed.

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state"
    prefix  = "prod/infrastructure"

    # GCS provides automatic locking - no configuration needed
    # Locking is enabled by default and cannot be disabled
  }
}
```

GCS uses object generation numbers to implement optimistic locking. When Terraform writes state, it checks the generation number matches what it read.

---

## Azure Blob with Lease Locking

Azure Blob Storage uses blob leases for locking.

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstateaccount"
    container_name       = "tfstate"
    key                  = "prod/infrastructure/terraform.tfstate"

    # Lease-based locking is automatic
    # Azure acquires a 60-second lease, renewed during operations
  }
}
```

Create the storage infrastructure:

```hcl
# azure-backend.tf
# Storage account for Terraform state

resource "azurerm_resource_group" "tfstate" {
  name     = "terraform-state-rg"
  location = "East US"
}

resource "azurerm_storage_account" "tfstate" {
  name                     = "tfstateaccount"
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant for disaster recovery

  # Prevent accidental deletion
  blob_properties {
    delete_retention_policy {
      days = 30
    }
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}
```

---

## Terraform Cloud State Locking

Terraform Cloud handles locking automatically with additional team coordination features.

```hcl
# backend.tf
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "prod-infrastructure"
    }
  }
}
```

Terraform Cloud provides:

- Automatic locking per workspace
- Lock visibility in the UI
- Run queuing when locked
- Lock info showing who holds the lock

### Remote Backend Alternative

```hcl
# backend.tf
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "my-org"

    workspaces {
      name = "prod-infrastructure"
    }
  }
}
```

---

## Force Unlocking

Sometimes locks become stale - a process crashes, network disconnects, or CI job times out. Use force-unlock carefully.

### Check Lock Status

```bash
# Attempt an operation to see lock info
terraform plan

# Output shows lock details:
# Lock Info:
#   ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
#   Path:      my-terraform-state/prod/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       ci-runner@build-server
#   Created:   2024-01-15 10:30:00 +0000 UTC
```

### Force Unlock

```bash
# Use the Lock ID from the error message
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Terraform will ask for confirmation
# Do you really want to force-unlock?
#   Terraform will remove the lock on the remote state.
#   This will allow local Terraform commands to modify this state,
#   even though it may still be in use.
#
#   Only 'yes' will be accepted to confirm.
# Enter a value: yes
```

### When to Force Unlock

Force unlock is appropriate when:

- The process holding the lock has crashed
- A CI job timed out or was cancelled
- Network issues prevented lock release
- You have confirmed no other operation is running

Never force unlock if:

- Another team member might be running Terraform
- A CI/CD pipeline might be mid-execution
- You are unsure why the lock exists

---

## Lock Timeouts and Retries

Configure how Terraform handles lock contention.

### Command Line Options

```bash
# Wait up to 5 minutes for lock
terraform apply -lock-timeout=5m

# Disable locking (dangerous - use only for debugging)
terraform apply -lock=false
```

### Wrapper Script with Retries

```bash
#!/bin/bash
# terraform-with-retry.sh
# Retry Terraform operations with exponential backoff

MAX_RETRIES=5
RETRY_DELAY=10

for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i of $MAX_RETRIES"

    # Run terraform with lock timeout
    terraform "$@" -lock-timeout=60s

    EXIT_CODE=$?

    # Exit code 1 with lock error means we should retry
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Terraform succeeded"
        exit 0
    fi

    # Check if it was a lock error
    if [ $EXIT_CODE -eq 1 ]; then
        echo "Lock contention, waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
        # Exponential backoff
        RETRY_DELAY=$((RETRY_DELAY * 2))
    else
        # Non-lock error, exit immediately
        echo "Terraform failed with exit code $EXIT_CODE"
        exit $EXIT_CODE
    fi
done

echo "Max retries exceeded"
exit 1
```

---

## Debugging Lock Issues

### View Lock Info in DynamoDB

```bash
# Query the locks table directly
aws dynamodb scan \
  --table-name terraform-state-locks \
  --output json | jq '.Items'
```

### Check S3 Object Metadata

```bash
# View state file details
aws s3api head-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate
```

### Enable Terraform Debug Logging

```bash
# Enable detailed logging for lock operations
export TF_LOG=DEBUG
terraform plan 2>&1 | grep -i lock
```

### Common Lock Issues

**Stale Lock After Crash**

```bash
# Verify the locking process is not running
ps aux | grep terraform

# Check CI/CD pipeline status
# Then force unlock if confirmed stale
terraform force-unlock LOCK_ID
```

**DynamoDB Permissions**

```hcl
# IAM policy for state locking
resource "aws_iam_policy" "terraform_state" {
  name = "terraform-state-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::my-terraform-state/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/terraform-state-locks"
      }
    ]
  })
}
```

---

## Best Practices for Team Environments

### 1. Always Use Remote State with Locking

Local state files cannot be locked across team members.

```hcl
# Never use local backend in team environments
# Always configure a remote backend with locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### 2. Use Workspaces or Separate State Files

Reduce lock contention by splitting state:

```hcl
# Use separate state files per environment
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "${var.environment}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

### 3. Run Terraform in CI/CD Only

Prevent local runs from conflicting with pipelines:

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    # Ensure only one workflow runs at a time
    concurrency:
      group: terraform-${{ github.ref }}
      cancel-in-progress: false

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        run: terraform plan -lock-timeout=5m

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve -lock-timeout=5m
```

### 4. Set Reasonable Lock Timeouts

```bash
# CI/CD should fail fast on lock contention
terraform apply -lock-timeout=2m

# Interactive use can wait longer
terraform apply -lock-timeout=10m
```

### 5. Monitor Lock Table

Set up alerts for stuck locks:

```hcl
# CloudWatch alarm for long-held locks
resource "aws_cloudwatch_metric_alarm" "stuck_lock" {
  alarm_name          = "terraform-stuck-lock"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = 3600  # 1 hour
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Terraform lock held for over 1 hour"

  dimensions = {
    TableName = "terraform-state-locks"
  }
}
```

### 6. Document Lock Procedures

Create runbooks for your team:

```markdown
## Terraform Lock Troubleshooting

1. Check who holds the lock: `terraform plan` shows lock info
2. Verify no active CI jobs are running
3. Contact the lock holder if a team member
4. Force unlock only after confirmation: `terraform force-unlock LOCK_ID`
5. Document the incident
```

---

## Summary

State locking is essential for team Terraform usage:

- **S3 + DynamoDB** - Most common AWS setup
- **GCS** - Built-in locking, no extra config
- **Azure Blob** - Lease-based automatic locking
- **Terraform Cloud** - Managed locking with UI
- **Force unlock** - Use carefully for stale locks
- **CI/CD** - Centralize runs to reduce conflicts
- **Timeouts** - Configure appropriate wait times

---

*Managing infrastructure as code with Terraform? [OneUptime](https://oneuptime.com) monitors your cloud infrastructure and alerts you to issues before they impact users.*
