# How to Handle Concurrent Terraform Runs in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Concurrency, State Locking, DevOps, Infrastructure as Code

Description: Learn how to safely handle concurrent Terraform runs in CI/CD pipelines using concurrency controls, queue-based execution, state splitting, and pipeline serialization strategies.

---

When multiple engineers push changes to the same Terraform configuration at the same time, their CI/CD pipelines compete for the same state file. Without proper handling, you get lock contention, failed pipelines, and frustrated teams. This guide covers the strategies for managing concurrent Terraform runs so your pipelines stay reliable even when things get busy.

## Understanding the Concurrency Problem

Consider this scenario: Alice and Bob both have pull requests open against the same Terraform configuration. Both PRs trigger plan jobs. Alice's PR merges first and triggers an apply. Bob's PR triggers a plan at the same time. Now you have:

- Alice's apply holding the state lock
- Bob's plan waiting for the lock or failing immediately
- If Alice's apply finishes and changes the state, Bob's plan output is now stale

The problem gets worse with monorepos where many teams modify different parts of the infrastructure.

## Strategy 1: CI/CD Concurrency Groups

Most CI/CD platforms support concurrency controls that serialize pipeline runs:

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply

on:
  push:
    branches: [main]

# Only one apply can run at a time per environment
concurrency:
  group: terraform-apply-production
  cancel-in-progress: false  # Queue the run instead of canceling

jobs:
  apply:
    runs-on: ubuntu-latest
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

      - name: Terraform Apply
        run: |
          cd terraform
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

With `cancel-in-progress: false`, GitHub queues concurrent runs. Only one runs at a time, and queued runs execute in order.

### GitLab CI Resource Groups

```yaml
# .gitlab-ci.yml
apply:
  stage: apply
  resource_group: terraform-production  # Serializes all jobs in this group
  image: hashicorp/terraform:1.7.0
  script:
    - cd terraform
    - terraform init -no-color
    - terraform apply -no-color -auto-approve
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

GitLab's `resource_group` keyword ensures only one job in the group runs at a time. Other jobs wait in a queue.

## Strategy 2: Lock Timeout and Retry

If you cannot serialize at the CI/CD level, handle contention at the Terraform level:

```yaml
# GitHub Actions with lock retry
- name: Terraform Apply with lock handling
  run: |
    cd terraform
    terraform init -no-color

    # Wait up to 10 minutes for the state lock
    terraform apply -no-color -auto-approve -lock-timeout=600s
```

For more control, implement a custom retry loop:

```bash
#!/bin/bash
# scripts/terraform-apply-with-retry.sh
# Retry terraform apply with exponential backoff on lock errors

MAX_RETRIES=5
RETRY_DELAY=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "Attempt $ATTEMPT of $MAX_RETRIES"

  OUTPUT=$(terraform apply -no-color -auto-approve 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "Apply succeeded"
    echo "$OUTPUT"
    exit 0
  fi

  # Check if failure was due to state lock
  if echo "$OUTPUT" | grep -q "Error acquiring the state lock"; then
    echo "State is locked. Waiting ${RETRY_DELAY}s before retry..."
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))  # Double the wait time
    ATTEMPT=$((ATTEMPT + 1))
  else
    # Non-lock error, fail immediately
    echo "Apply failed with non-lock error:"
    echo "$OUTPUT"
    exit 1
  fi
done

echo "Failed to acquire lock after $MAX_RETRIES attempts"
exit 1
```

## Strategy 3: Split State Files

The best way to reduce lock contention is to minimize the blast radius of each state file:

```text
infrastructure/
  networking/
    main.tf          # VPCs, subnets, route tables
    backend.tf       # State: s3://state/networking/terraform.tfstate
  compute/
    main.tf          # EC2, ASGs, ALBs
    backend.tf       # State: s3://state/compute/terraform.tfstate
  database/
    main.tf          # RDS, ElastiCache
    backend.tf       # State: s3://state/database/terraform.tfstate
  monitoring/
    main.tf          # CloudWatch, dashboards
    backend.tf       # State: s3://state/monitoring/terraform.tfstate
```

Each component has its own state file, so networking changes never block database changes:

```yaml
# GitHub Actions - Parallel runs for independent components
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      networking: ${{ steps.changes.outputs.networking }}
      compute: ${{ steps.changes.outputs.compute }}
      database: ${{ steps.changes.outputs.database }}

    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            networking:
              - 'infrastructure/networking/**'
            compute:
              - 'infrastructure/compute/**'
            database:
              - 'infrastructure/database/**'

  apply-networking:
    needs: detect-changes
    if: needs.detect-changes.outputs.networking == 'true'
    concurrency:
      group: terraform-networking
      cancel-in-progress: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/networking
          terraform init && terraform apply -auto-approve

  apply-compute:
    needs: detect-changes
    if: needs.detect-changes.outputs.compute == 'true'
    concurrency:
      group: terraform-compute
      cancel-in-progress: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/compute
          terraform init && terraform apply -auto-approve

  apply-database:
    needs: detect-changes
    if: needs.detect-changes.outputs.database == 'true'
    concurrency:
      group: terraform-database
      cancel-in-progress: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/database
          terraform init && terraform apply -auto-approve
```

## Strategy 4: Queue-Based Execution

For teams with high concurrency needs, implement a job queue:

```python
# terraform_queue.py - Simple queue using Redis
import redis
import time
import subprocess
import json

r = redis.Redis(host='localhost', port=6379)

QUEUE_NAME = "terraform-apply-queue"
LOCK_KEY = "terraform-apply-lock"

def enqueue_apply(workspace, commit_sha):
    """Add a Terraform apply job to the queue."""
    job = json.dumps({
        "workspace": workspace,
        "commit_sha": commit_sha,
        "queued_at": time.time()
    })
    r.rpush(QUEUE_NAME, job)
    print(f"Enqueued apply for {workspace} at {commit_sha}")

def process_queue():
    """Process jobs from the queue one at a time."""
    while True:
        # Try to acquire the lock
        if r.set(LOCK_KEY, "locked", nx=True, ex=3600):
            job_data = r.lpop(QUEUE_NAME)

            if job_data:
                job = json.loads(job_data)
                print(f"Processing apply for {job['workspace']}")

                try:
                    result = subprocess.run(
                        ["terraform", "apply", "-auto-approve"],
                        cwd=f"terraform/{job['workspace']}",
                        capture_output=True,
                        text=True,
                        timeout=1800
                    )
                    print(f"Apply result: {'success' if result.returncode == 0 else 'failed'}")
                finally:
                    r.delete(LOCK_KEY)
            else:
                r.delete(LOCK_KEY)
                time.sleep(5)
        else:
            print("Another apply is running, waiting...")
            time.sleep(10)
```

## Strategy 5: Plan Concurrency Without Apply Concurrency

Plans are read-only and can run concurrently. Only applies need serialization:

```yaml
# Allow concurrent plans, serialize applies
name: Terraform

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  plan:
    # Plans can run concurrently - no concurrency group
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd terraform
          terraform init -no-color
          terraform plan -no-color -lock-timeout=60s

  apply:
    # Applies must be serialized
    if: github.event_name == 'push'
    concurrency:
      group: terraform-apply
      cancel-in-progress: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd terraform
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

Note that plans still acquire a brief read lock on the state. If an apply is running, plans will need to wait for the state refresh portion of the apply to complete.

## Monitoring Concurrency Issues

Track how often your pipelines hit lock contention:

```yaml
# Report lock wait times
- name: Terraform Apply with timing
  run: |
    cd terraform
    terraform init -no-color

    START=$(date +%s)
    terraform apply -no-color -auto-approve -lock-timeout=600s
    END=$(date +%s)
    DURATION=$((END - START))

    echo "Apply took ${DURATION} seconds"

    # Alert if apply took unusually long (possible lock contention)
    if [ $DURATION -gt 300 ]; then
      echo "WARNING: Apply took over 5 minutes, possible lock contention"
    fi
```

## Summary

Concurrent Terraform runs are inevitable in active teams. The right strategy depends on your team size and repository structure. For small teams, CI/CD concurrency groups are sufficient. For larger teams, split your state files so independent changes do not block each other. And always use Terraform's built-in `-lock-timeout` as a safety net for unexpected contention.

For more on state management, see our guide on [handling Terraform state locking in CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-state-locking-in-cicd/view).
