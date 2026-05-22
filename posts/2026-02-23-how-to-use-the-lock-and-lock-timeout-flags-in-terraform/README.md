# How to Use the -lock and -lock-timeout Flags in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Locking, CLI Flags, Infrastructure as Code, DevOps, Concurrency

Description: Learn how to use Terraform's -lock and -lock-timeout flags to control state locking behavior during plan, apply, and other operations, with practical examples for team workflows.

---

Terraform acquires a lock on the state file for operations that could write state, as long as the backend supports locking. The `-lock` and `-lock-timeout` flags give you control over this behavior. Knowing when and how to use these flags can prevent failed runs, make CI/CD pipelines more resilient, and help you handle stuck locks gracefully.

This guide covers both flags in detail, including when to use them, when to avoid them, and how they interact with different backends.

## How State Locking Works

When you run `terraform plan` or `terraform apply`, Terraform:

1. Attempts to acquire a lock on the state file.
2. Reads the state.
3. Performs the operation (plan, apply, destroy, etc.).
4. Writes updated state (if applicable).
5. Releases the lock.

If another operation holds the lock, Terraform waits or fails depending on your flag settings.

```bash
# Default behavior - acquire lock, fail immediately if locked

terraform plan

# With timeout - wait up to 5 minutes for the lock
terraform plan -lock-timeout=300s

# Without locking - skip lock acquisition entirely
terraform plan -lock=false
```

## The -lock Flag

The `-lock` flag controls whether Terraform tries to acquire a state lock at all. By default, `-lock=true`.

```bash
# Explicitly enable locking (default behavior)
terraform plan -lock=true

# Disable locking for this operation
terraform plan -lock=false
```

### When to Use -lock=false

There are very few legitimate use cases for disabling locking:

**Speculative plans on a backend that does not support locking:**

```bash
# Some backends do not support locking, and HTTP locking is optional
# If you only need a speculative plan, disabling the lock may be acceptable
terraform plan -lock=false
```

**Debugging a stuck lock:**

```bash
# If you need to inspect state while a lock is stuck,
# read-only state inspection commands do not take the -lock flag
terraform state pull > debug-state.json
terraform state list
```

### When NOT to Use -lock=false

Never disable locking for write operations in a shared environment:

```bash
# DANGEROUS - Do not do this in production
terraform apply -lock=false

# DANGEROUS - Can corrupt state if another operation runs concurrently
terraform destroy -lock=false

# DANGEROUS - State modifications without lock
terraform state mv -lock=false aws_instance.old aws_instance.new
```

Disabling locks during `apply` or `destroy` opens the door to race conditions where two operations modify state simultaneously, leading to corruption and orphaned resources.

## The -lock-timeout Flag

The `-lock-timeout` flag specifies how long Terraform should wait to acquire the lock before giving up. By default, the timeout is `0s`, meaning Terraform fails immediately if it cannot acquire the lock.

```bash
# Wait up to 5 minutes for the lock
terraform apply -lock-timeout=300s

# Wait up to 10 minutes (useful for long-running operations)
terraform apply -lock-timeout=10m

# Wait up to 1 hour (for backends with very long operations)
terraform apply -lock-timeout=1h
```

The timeout accepts duration strings: `s` for seconds, `m` for minutes, `h` for hours.

### Choosing the Right Timeout

The right timeout depends on your typical operation duration:

```bash
# Small infrastructure (few resources) - 2 minutes is usually plenty
terraform apply -lock-timeout=120s

# Medium infrastructure (dozens of resources) - 5-10 minutes
terraform apply -lock-timeout=600s

# Large infrastructure (hundreds of resources) - 15-30 minutes
terraform apply -lock-timeout=1800s

# CI/CD pipelines - set a timeout that matches your pipeline timeout
# If your pipeline times out after 30 minutes, set lock timeout to 25 minutes
terraform apply -lock-timeout=25m
```

## Using These Flags in CI/CD

In CI/CD pipelines, setting a lock timeout prevents pipeline failures when operations queue up:

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply

on:
  push:
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -lock-timeout=300s -out=tfplan

      - name: Terraform Apply
        run: terraform apply -lock-timeout=300s tfplan
```

For GitLab CI:

```yaml
# .gitlab-ci.yml
terraform_apply:
  stage: deploy
  script:
    - terraform init
    - terraform plan -lock-timeout=300s -out=tfplan
    - terraform apply -lock-timeout=300s tfplan
  timeout: 30 minutes
```

## Combining with force-unlock

When a lock is genuinely stuck (the holding process has crashed), you need to manually unlock it. The `-lock-timeout` flag will not help because the lock will never be released on its own.

```bash
# Step 1: Try to run with a timeout first
terraform plan -lock-timeout=60s

# If it times out, check the lock info
# The error message shows the lock ID and who holds it

# Step 2: Verify the lock holder is actually done
# Check if their CI/CD pipeline is still running
# Check if their terminal session is still active

# Step 3: If confirmed dead, force unlock
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Step 4: Re-run your operation
terraform plan
```

## Backend-Specific Lock Behavior

Different backends handle locking differently, which affects how these flags work:

### S3

```hcl
terraform {
  backend "s3" {
    bucket       = "my-state"
    key          = "terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}
```

The S3 backend supports state locking with an S3 lock file when `use_lockfile = true`. DynamoDB-based locking with `dynamodb_table` is still available for older configurations, but it is deprecated and will be removed in a future Terraform minor version.

### GCS

```hcl
terraform {
  backend "gcs" {
    bucket = "my-state"
    prefix = "terraform"
  }
}
```

The GCS backend supports state locking. Locks are automatically released when the operation completes. Crashed processes may leave stale locks that require `force-unlock`.

### Azure Blob

```hcl
terraform {
  backend "azurerm" {
    storage_account_name = "mytfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

Azure uses Blob Storage native capabilities for state locking and consistency checking. Locks are automatically released when the operation completes. Crashed processes may leave stale locks that require `force-unlock`.

## Environment Variables

You can set lock behavior via environment variables to avoid repeating flags:

```bash
# Set a default lock timeout for all operations in this session
export TF_CLI_ARGS="-lock-timeout=300s"

# Or set it per command
export TF_CLI_ARGS_plan="-lock-timeout=300s"
export TF_CLI_ARGS_apply="-lock-timeout=300s"

# Now these commands use the configured timeout automatically
terraform plan
terraform apply
```

This is useful in CI/CD environments where you want consistent lock behavior across all operations.

## Monitoring Lock Duration

Track how long operations hold locks to identify bottlenecks:

```bash
#!/bin/bash
# timed-terraform.sh - Run Terraform and report lock duration

START=$(date +%s)
echo "Acquiring lock at $(date)"

terraform "$@"
EXIT_CODE=$?

END=$(date +%s)
DURATION=$((END - START))

echo "Operation completed in ${DURATION}s"

# Alert if operation took too long
if [ $DURATION -gt 600 ]; then
  echo "WARNING: Operation held the lock for more than 10 minutes"
fi

exit $EXIT_CODE
```

## Best Practices

1. **Always use locking for write operations** in shared environments. Never use `-lock=false` with `apply` or `destroy`.
2. **Set a lock timeout in CI/CD** pipelines to handle queued operations gracefully. Five minutes is a good starting point.
3. **Match lock timeout to pipeline timeout.** If your pipeline times out after 30 minutes, set the lock timeout lower.
4. **Use environment variables** for consistent lock behavior across a team.
5. **Investigate stuck locks** before force-unlocking. The lock might be held by a running operation.
6. **Monitor lock duration** to identify slow operations that block the team.
7. **Use `-lock=false` only in exceptional cases** where you understand the risk and the command supports the flag.

The `-lock` and `-lock-timeout` flags are small controls with big implications. Getting them right keeps your team productive and your state file safe.
