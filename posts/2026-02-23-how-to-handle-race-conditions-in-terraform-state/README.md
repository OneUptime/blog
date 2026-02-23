# How to Handle Race Conditions in Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Race Conditions, Concurrency, DevOps, Infrastructure as Code

Description: Learn how to identify, prevent, and resolve race conditions in Terraform state when multiple users or pipelines run operations concurrently against shared infrastructure.

---

Race conditions in Terraform state happen when two or more operations try to read and write the state file at the same time. The result can range from a failed apply to corrupted state that no longer reflects your actual infrastructure. If you work on a team or run Terraform in CI/CD pipelines, you have probably encountered this at some point.

This guide covers how race conditions happen, what Terraform does to prevent them, and what to do when prevention fails.

## How Race Conditions Occur

Terraform operations follow a read-modify-write cycle:

1. Read the current state from the backend.
2. Compare state with configuration to determine changes.
3. Execute API calls to create, update, or destroy resources.
4. Write the updated state back to the backend.

When two operations overlap, you can get scenarios like this:

- Operation A reads state at time T1.
- Operation B reads the same state at time T1.
- Operation A creates a resource and writes state at T2.
- Operation B creates a different resource and writes state at T3, overwriting A's changes.

Now the state file only reflects B's changes. The resource A created still exists in the cloud but is invisible to Terraform. This is a classic lost-update problem.

## State Locking as the First Line of Defense

Terraform's primary mechanism for preventing race conditions is state locking. When you run `terraform plan` or `terraform apply`, Terraform attempts to acquire a lock on the state file before reading it. If another operation holds the lock, Terraform waits or fails.

```hcl
# backend.tf - S3 backend with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    # DynamoDB table provides the locking mechanism
    dynamodb_table = "terraform-state-locks"
  }
}
```

```hcl
# lock-table.tf - Create the DynamoDB lock table
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Different backends implement locking differently:

| Backend | Locking Mechanism |
|---------|------------------|
| S3 | DynamoDB table |
| GCS | Native object locking |
| Azure Blob | Blob leases |
| Consul | Session-based locks |
| Terraform Cloud | Built-in |

## When Locking Is Not Enough

State locking prevents most race conditions, but there are edge cases where problems can still occur:

**Lock timeouts:** If an operation takes longer than the lock timeout, the lock may expire while the operation is still running. A second operation can then acquire the lock and start modifying state.

**Manual lock overrides:** Engineers sometimes use `-lock=false` or `terraform force-unlock` to get past a stuck lock. If the original operation is still running, this creates a race condition.

**Backend failures:** If the locking backend (like DynamoDB) experiences a partial outage, lock acquisition might succeed on one node but not propagate to others.

**Split-brain in HA backends:** Some backends with high-availability configurations can experience split-brain scenarios where two clients believe they hold the lock.

## Detecting Race Condition Damage

If you suspect a race condition has corrupted your state, look for these symptoms:

```bash
# Check for resources that exist in the cloud but not in state
terraform plan

# If you see resources marked for creation that you know already exist,
# state may have lost track of them

# Check the state serial number
terraform state pull | jq '.serial'

# Compare with your backup to see if the serial jumped unexpectedly
```

You can also check the DynamoDB lock table for evidence of concurrent operations:

```bash
# Check recent lock activity
aws dynamodb scan \
  --table-name terraform-state-locks \
  --filter-expression "attribute_exists(Info)"
```

## Preventing Race Conditions in CI/CD

The most common source of race conditions is CI/CD pipelines. Multiple pull requests merging close together can trigger simultaneous applies.

```yaml
# .github/workflows/terraform.yml
# Use concurrency groups to prevent parallel runs
name: Terraform
on:
  push:
    branches: [main]

# Only allow one terraform run at a time per environment
concurrency:
  group: terraform-prod
  cancel-in-progress: false  # Do not cancel running applies

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve -lock-timeout=300s
```

The `concurrency` block ensures only one workflow runs at a time. Setting `cancel-in-progress: false` prevents a new push from canceling an in-progress apply, which would leave resources in a half-created state.

## Handling Lock Contention

When Terraform cannot acquire the lock, you will see an error like this:

```
Error: Error acquiring the state lock
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      prod/terraform.tfstate
  Operation: OperationTypeApply
  Who:       engineer@workstation
  Version:   1.7.0
  Created:   2026-02-23 10:15:30.123456 +0000 UTC
```

Before forcing the lock, verify that the original operation has actually finished:

```bash
# Check if the lock owner's process is still running
# If you have access to their machine, or if it is a CI runner,
# check the pipeline status

# Only force-unlock after confirming the operation is done
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Implementing a Queuing System

For teams with heavy Terraform usage, a queuing system prevents race conditions at the application level:

```python
#!/usr/bin/env python3
# terraform_queue.py - Simple Redis-based queue for Terraform operations

import redis
import time
import uuid
import subprocess
import sys

r = redis.Redis(host='localhost', port=6379, db=0)

QUEUE_KEY = "terraform:queue"
LOCK_KEY = "terraform:active"
LOCK_TTL = 3600  # 1 hour max operation time

def enqueue_and_run(workspace, command):
    """Add a Terraform operation to the queue and wait for our turn."""
    operation_id = str(uuid.uuid4())
    queue_key = f"{QUEUE_KEY}:{workspace}"
    lock_key = f"{LOCK_KEY}:{workspace}"

    # Add ourselves to the queue
    r.rpush(queue_key, operation_id)
    print(f"Queued operation {operation_id}")

    # Wait until we are at the front of the queue
    while True:
        front = r.lindex(queue_key, 0)
        if front and front.decode() == operation_id:
            # Try to acquire the active lock
            if r.set(lock_key, operation_id, nx=True, ex=LOCK_TTL):
                break
        time.sleep(5)
        print("Waiting for our turn...")

    try:
        # Run the Terraform command
        print(f"Running: terraform {command}")
        result = subprocess.run(
            ["terraform"] + command.split(),
            capture_output=False
        )
        return result.returncode
    finally:
        # Release the lock and remove from queue
        r.delete(lock_key)
        r.lpop(queue_key)

if __name__ == "__main__":
    workspace = sys.argv[1]
    command = sys.argv[2]
    exit(enqueue_and_run(workspace, command))
```

## Recovering from Race Condition Corruption

If a race condition does corrupt your state, here is how to recover:

```bash
# Step 1: Stop all Terraform operations immediately
# Communicate with your team to halt all pipelines

# Step 2: Pull the current state
terraform state pull > corrupted-state.json

# Step 3: Identify what is missing
# Compare with your last known good backup
diff <(jq '.resources[].instances[].attributes.id' backup-state.json | sort) \
     <(jq '.resources[].instances[].attributes.id' corrupted-state.json | sort)

# Step 4: Import missing resources back into state
terraform import aws_instance.web i-1234567890abcdef0

# Step 5: Verify everything matches
terraform plan
# The plan should show no changes if recovery was successful
```

## Best Practices

1. **Always use a backend that supports locking.** Local state files have no locking support and are dangerous for team use.
2. **Never use `-lock=false` in production.** If you are tempted to, figure out why the lock is stuck instead.
3. **Set reasonable lock timeouts.** Use `-lock-timeout=300s` to wait for locks instead of failing immediately.
4. **Use CI/CD concurrency controls** in addition to Terraform's built-in locking.
5. **Keep state backups** so you can recover from corruption. See our guide on [automated state backups](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-automated-terraform-state-backups/view).
6. **Split large state files** into smaller workspaces. Smaller state files mean less contention.
7. **Monitor for stuck locks** and set up alerts when locks are held longer than expected.

Race conditions are preventable with the right combination of backend locking, pipeline controls, and team practices. Invest in setting these up properly, and you will avoid the painful cleanup that follows a corrupted state file.
