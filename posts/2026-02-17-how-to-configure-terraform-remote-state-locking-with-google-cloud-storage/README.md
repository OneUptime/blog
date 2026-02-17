# How to Configure Terraform Remote State Locking with Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, State Locking, Cloud Storage, Infrastructure as Code

Description: Learn how to configure Terraform state locking with Google Cloud Storage to prevent concurrent state modifications and protect your infrastructure from corruption.

---

When two people or two CI/CD pipelines run Terraform at the same time against the same state, bad things happen. One operation might read state, plan changes, and start applying - only to have the other operation modify the same state simultaneously. The result is corrupted state, partial applies, or resources that exist in reality but not in state (or vice versa).

State locking prevents this. When Terraform starts an operation, it acquires a lock. If another operation tries to start, it sees the lock and waits (or fails). Google Cloud Storage supports state locking natively, and setting it up is straightforward.

## How GCS State Locking Works

The GCS backend for Terraform uses a lock file stored in the same bucket as your state. When Terraform begins a state-modifying operation (plan, apply, destroy), it creates a lock file at `<prefix>/<workspace>.tflock`. Other Terraform processes check for this lock file before proceeding.

The lock file contains information about who holds the lock:

```json
{
  "ID": "a-unique-lock-id",
  "Operation": "OperationTypeApply",
  "Info": "",
  "Who": "user@machine",
  "Version": "1.7.0",
  "Created": "2026-02-17T10:30:00.000Z",
  "Path": "terraform/state/default.tflock"
}
```

## Setting Up GCS State Locking

State locking with GCS works automatically - you do not need any extra configuration beyond setting up the GCS backend. Here is the setup:

### Step 1: Create the State Bucket

```bash
# Create the bucket with versioning and uniform access
gsutil mb -p my-gcp-project -l us-central1 -b on gs://my-terraform-state

# Enable versioning for state recovery
gsutil versioning set on gs://my-terraform-state
```

### Step 2: Configure the Backend

```hcl
# backend.tf - GCS backend with automatic state locking
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "infrastructure/production"
  }
}
```

That is it. State locking is enabled by default with the GCS backend. There is no explicit `lock = true` setting needed - it just works.

### Step 3: Initialize

```bash
# Initialize the backend - locking is active immediately
terraform init
```

## Verifying That Locking Is Working

You can verify state locking by running two Terraform operations simultaneously. Here is how to test it:

Open two terminal windows and try to run `terraform plan` in both at the same time:

```bash
# Terminal 1
terraform plan

# Terminal 2 (started while Terminal 1 is still running)
terraform plan
```

The second terminal should display a message like:

```
Error: Error locking state: Error acquiring the state lock: writing
"gs://my-terraform-state/infrastructure/production/default.tflock" failed:
googleapi: Error 412: At least one of the pre-conditions you specified did
not hold., conditionNotMet
Lock Info:
  ID:        abc-123-def-456
  Path:      infrastructure/production/default.tflock
  Operation: OperationTypePlan
  Who:       user@machine
  Version:   1.7.0
  Created:   2026-02-17 10:30:00.000000 +0000 UTC
```

This means locking is working correctly.

## Handling Lock Timeouts

By default, Terraform will retry acquiring the lock for a short period. You can increase the timeout using the `-lock-timeout` flag:

```bash
# Wait up to 5 minutes for the lock to be released
terraform plan -lock-timeout=5m

# Wait up to 10 minutes
terraform apply -lock-timeout=10m
```

This is useful in CI/CD pipelines where multiple builds might queue up.

## Force Unlocking Stuck Locks

If Terraform crashes or is killed during an operation, it might leave a stale lock behind. When this happens, you will see an error every time you try to run Terraform.

To force unlock:

```bash
# Get the lock ID from the error message, then force unlock
terraform force-unlock LOCK_ID
```

For example:

```bash
# Force unlock using the lock ID from the error output
terraform force-unlock abc-123-def-456
```

You can also remove the lock file directly from GCS as a last resort:

```bash
# List lock files in the state bucket
gsutil ls gs://my-terraform-state/infrastructure/production/*.tflock

# Remove a stuck lock file (use with extreme caution)
gsutil rm gs://my-terraform-state/infrastructure/production/default.tflock
```

Only force-unlock when you are certain no other Terraform operation is running. Force-unlocking while another operation is in progress can lead to state corruption.

## State Locking in CI/CD Pipelines

CI/CD pipelines need special attention for state locking. Multiple pipeline runs can overlap, especially when several pull requests merge in quick succession.

Here is a Cloud Build configuration that handles locking properly:

```yaml
# cloudbuild.yaml - Terraform pipeline with lock retry
steps:
  - id: 'terraform-init'
    name: 'hashicorp/terraform:1.7'
    args: ['init', '-no-color']
    dir: 'infrastructure/'

  - id: 'terraform-plan'
    name: 'hashicorp/terraform:1.7'
    args: ['plan', '-no-color', '-lock-timeout=5m', '-out=tfplan']
    dir: 'infrastructure/'

  - id: 'terraform-apply'
    name: 'hashicorp/terraform:1.7'
    args: ['apply', '-no-color', '-lock-timeout=5m', '-auto-approve', 'tfplan']
    dir: 'infrastructure/'
```

The `-lock-timeout=5m` ensures that if a previous build is still running, the new build waits up to 5 minutes for the lock to be released instead of failing immediately.

## Monitoring State Lock Activity

You can monitor who is locking and unlocking state using Cloud Audit Logs. GCS operations are logged by default:

```bash
# Query audit logs for state bucket operations
gcloud logging read \
  'resource.type="gcs_bucket" AND resource.labels.bucket_name="my-terraform-state" AND protoPayload.methodName="storage.objects.create" AND protoPayload.resourceName:".tflock"' \
  --project=my-gcp-project \
  --limit=20 \
  --format='table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)'
```

This shows you who is acquiring locks and when, which is useful for debugging timing issues in your CI/CD pipeline.

## Multi-State Lock Management

If you have multiple Terraform configurations that depend on each other, managing locks across them requires coordination.

For example, if your network configuration must be applied before your compute configuration:

```bash
# Apply network first, then compute
cd network/ && terraform apply -lock-timeout=5m -auto-approve
cd ../compute/ && terraform apply -lock-timeout=5m -auto-approve
```

Each configuration has its own state and its own lock, so they do not interfere with each other. But if the compute configuration reads from the network state using `terraform_remote_state`, you need to ensure the network apply finishes before compute starts planning.

```hcl
# In compute/data.tf - Reading from the network state
data "terraform_remote_state" "network" {
  backend = "gcs"

  config = {
    bucket = "my-terraform-state"
    prefix = "infrastructure/network"
  }
}

# Use network outputs
resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  network_interface {
    network    = data.terraform_remote_state.network.outputs.network_id
    subnetwork = data.terraform_remote_state.network.outputs.subnet_id
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
}
```

## Disabling State Locking

In rare cases, you might need to disable state locking (like when recovering from a broken lock mechanism):

```bash
# Run a command without acquiring a lock (use with extreme caution)
terraform plan -lock=false
terraform apply -lock=false
```

Never use `-lock=false` in production or CI/CD. It exists only for emergency recovery situations.

## Bucket Configuration for Reliable Locking

To ensure reliable state locking, configure your bucket properly:

```hcl
# state_bucket.tf - Properly configured state bucket for reliable locking
resource "google_storage_bucket" "terraform_state" {
  name          = "my-terraform-state-${var.project_id}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  # Enable versioning for state recovery
  versioning {
    enabled = true
  }

  # Uniform bucket-level access for consistent IAM
  uniform_bucket_level_access = true

  # Lifecycle rule to clean up old state versions
  lifecycle_rule {
    condition {
      num_newer_versions = 30
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}
```

## Best Practices

1. **Never disable state locking** in CI/CD. Use `-lock-timeout` instead of `-lock=false` when builds need to wait.
2. **Use unique state prefixes** for each Terraform configuration. Do not share state files between configurations.
3. **Monitor lock activity** through Cloud Audit Logs to detect pipeline congestion.
4. **Set reasonable lock timeouts** in CI/CD (3-5 minutes is usually enough).
5. **Only force-unlock after verifying** no other operations are running. Check your CI/CD dashboard first.
6. **Enable versioning** on the state bucket so you can recover from corruption even if a lock failure occurs.
7. **Use uniform bucket-level access** for consistent permission management on the state bucket.

## Wrapping Up

State locking is one of those features that works quietly in the background until it saves you from a disaster. With GCS, it comes built in and requires zero extra configuration. The main things to get right are handling lock timeouts in CI/CD pipelines, monitoring for stuck locks, and never bypassing the lock mechanism outside of genuine emergencies. A properly configured state bucket with versioning, locking, and access controls is the foundation of safe multi-team Terraform operations.
