# How to Configure Autoclass to Automatically Manage Storage Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Autoclass, Cost Optimization, Storage Management

Description: Learn how to enable and configure Autoclass in Google Cloud Storage to automatically transition objects between storage classes based on access patterns.

---

Choosing the right storage class for every object in a bucket is tedious work, and getting it wrong means either overpaying for storage or overpaying for retrieval. Autoclass removes this decision entirely by automatically moving objects between storage classes based on how often they are actually accessed. Frequently accessed objects stay in Standard, and untouched objects move to Nearline by default, or continue to Coldline and Archive when Archive is configured as the terminal storage class.

This guide covers how Autoclass works, how to enable it, and when it makes sense for your workloads.

## How Autoclass Works

Autoclass monitors the access patterns of individual objects in a bucket. Based on this monitoring:

- Objects that are accessed frequently are kept in or promoted to **Standard** storage
- Objects that are at least 128 KiB and have not been accessed recently are transitioned to **Nearline** (after ~30 days of no access)
- By default, objects remain in **Nearline** until they are accessed
- If the terminal storage class is set to **Archive**, further inactivity moves them to **Coldline** (after ~90 days)
- With **Archive** as the terminal storage class, untouched objects eventually end up in **Archive** (after ~365 days)

When an object's data is accessed with a GET request, Autoclass automatically moves it back to Standard.

```mermaid
graph TD
    A[Object Uploaded<br/>Standard] -->|No access for ~30 days| B[Nearline]
    B -->|Default terminal class| E[Remain in Nearline]
    B -->|Archive terminal class<br/>No access for ~90 days| C[Coldline]
    C -->|No access for ~365 days| D[Archive]
    B -->|Object accessed| A
    C -->|Object accessed| A
    D -->|Object accessed| A
```

The key advantage: you avoid paying for Standard storage on objects that are not being used, while frequently accessed objects are kept in Standard.

## Enabling Autoclass

### On a New Bucket

```bash
# Create a new bucket with Autoclass enabled

gcloud storage buckets create gs://my-autoclass-bucket \
  --location=us-central1 \
  --enable-autoclass
```

### On an Existing Bucket

```bash
# Enable Autoclass on an existing bucket
gcloud storage buckets update gs://my-existing-bucket \
  --default-storage-class=STANDARD \
  --enable-autoclass
```

When enabling Autoclass on an existing bucket, `--default-storage-class=STANDARD` is required if the bucket currently uses a different default storage class. All objects except soft-deleted objects transition to Standard storage, though the reported storage class might not update immediately. Objects then need another 30 days of no access before they are eligible to transition to Nearline.

### Verifying Autoclass Status

```bash
# Check if Autoclass is enabled on a bucket
gcloud storage buckets describe gs://my-autoclass-bucket \
  --format="json(autoclass)"
```

The output shows whether Autoclass is enabled and when the configuration was last toggled.

## Configuring the Terminal Storage Class

By default, Autoclass transitions objects from Standard to Nearline and keeps them in Nearline until they are accessed. You can configure it to also include Coldline and Archive by setting Archive as the terminal class:

```bash
# Enable Autoclass with Archive as the terminal storage class
gcloud storage buckets update gs://my-autoclass-bucket \
  --enable-autoclass \
  --autoclass-terminal-storage-class=ARCHIVE
```

To use the default Nearline terminal class:

```bash
# Set Nearline as the terminal storage class
gcloud storage buckets update gs://my-autoclass-bucket \
  --autoclass-terminal-storage-class=NEARLINE
```

Use Archive terminal class when you have data that might not be accessed for years. Use Nearline terminal class when you want a balance between cost savings and keeping objects out of the coldest classes.

## Disabling Autoclass

```bash
# Disable Autoclass on a bucket
gcloud storage buckets update gs://my-autoclass-bucket \
  --no-enable-autoclass
```

When you disable Autoclass, objects stay in whatever storage class they are currently in. They are not automatically moved back to Standard.

## When to Use Autoclass

Autoclass is ideal for these scenarios:

**Mixed access patterns.** When a bucket contains data with varying access frequencies and you cannot easily predict which objects will be hot or cold. Think user-generated content - some uploads get viewed constantly, others are uploaded and forgotten.

**New projects without historical data.** When you do not yet have enough access pattern data to create effective lifecycle rules. Let Autoclass handle it while you learn your data's behavior.

**Buckets with changing access patterns.** Seasonal data, campaign assets, or project files where access patterns shift over time. Autoclass adapts automatically.

**Simplifying operations.** When your team does not have the bandwidth to create and maintain fine-tuned lifecycle rules for every bucket.

## When NOT to Use Autoclass

There are scenarios where manual lifecycle rules are better:

**Predictable access patterns.** If you know for certain that logs older than 30 days are never accessed, a lifecycle rule is simpler and gives you direct control.

**Compliance requirements.** If regulations require data to be in a specific storage class (like Archive for retention), use lifecycle rules to guarantee the transition timing.

**Cost sensitivity.** Autoclass has a small management fee. For very large buckets where you have solid access pattern data, hand-tuned lifecycle rules might save slightly more.

**Regular automated reads.** If another Google Cloud service regularly reads objects in the bucket, those reads can keep moving objects back to Standard, which can reduce the value of Autoclass.

**Data with known expiration.** If objects should be deleted after a specific period, lifecycle rules handle this directly. Autoclass only manages transitions, not deletions.

## Autoclass vs Lifecycle Rules

Here is a comparison to help you decide:

| Factor | Autoclass | Lifecycle Rules |
|---|---|---|
| Configuration effort | Minimal (enable/disable) | Must define rules manually |
| Adapts to changes | Yes, continuously | No, rules are static |
| Promotes to warmer class | Yes, on access | No (transition is one-way) |
| Deletion support | No | Yes |
| Management fee | Small fee per object | None |
| Per-object intelligence | Yes | No (applies uniformly) |
| Predictable transitions | Depends on access | Fixed schedule |

You can also combine them. Use Autoclass for storage class management and lifecycle rules for deletion, but do not use lifecycle rules with `SetStorageClass` actions or `matchesStorageClass` conditions on an Autoclass bucket:

```bash
# Enable Autoclass for storage class transitions
gcloud storage buckets update gs://my-bucket \
  --default-storage-class=STANDARD \
  --enable-autoclass

# Add a lifecycle rule to delete objects after 2 years
# (Autoclass does not handle deletion)
gcloud storage buckets update gs://my-bucket \
  --lifecycle-file=delete-after-2-years.json
```

Where the lifecycle file only contains deletion rules:

```json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 730}
    }
  ]
}
```

## Setting Up with Terraform

```hcl
resource "google_storage_bucket" "autoclass_bucket" {
  name     = "my-autoclass-bucket"
  location = "US"

  autoclass {
    enabled                = true
    terminal_storage_class = "ARCHIVE"
  }

  # Lifecycle rules for deletion only (Autoclass handles transitions)
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 730  # 2 years
    }
  }
}
```

## Monitoring Autoclass Behavior

### Checking Object Storage Classes

To see what storage class individual objects are currently in:

```bash
# List objects with their storage classes
gcloud storage ls -L gs://my-autoclass-bucket/ | grep -E "Name:|Storage"
```

### Using Cloud Monitoring

Set up monitoring to track storage class distribution over time:

```bash
# View storage metrics in Cloud Monitoring
# The metric is storage.googleapis.com/storage/total_bytes
# Filter by storage_class label to see distribution
```

You can create a Cloud Monitoring dashboard that shows bytes per storage class, which gives you visibility into how Autoclass is managing your data.

## Python Configuration

```python
from google.cloud import storage

def enable_autoclass(bucket_name, terminal_class="ARCHIVE"):
    """Enable Autoclass on a bucket with a specified terminal storage class."""
    client = storage.Client()
    bucket = client.get_bucket(bucket_name)

    # Enable Autoclass with the desired terminal class
    bucket.autoclass_enabled = True
    bucket.autoclass_terminal_storage_class = terminal_class
    bucket.patch()

    print(f"Enabled Autoclass on {bucket_name}")
    print(f"Terminal storage class: {terminal_class}")

def check_autoclass_status(bucket_name):
    """Check the Autoclass configuration of a bucket."""
    client = storage.Client()
    bucket = client.get_bucket(bucket_name)

    print(f"Bucket: {bucket_name}")
    print(f"Autoclass enabled: {bucket.autoclass_enabled}")
    if bucket.autoclass_enabled:
        print(f"Terminal class: {bucket.autoclass_terminal_storage_class}")
        print(f"Toggle time: {bucket.autoclass_toggle_time}")

enable_autoclass("my-data-bucket", "ARCHIVE")
check_autoclass_status("my-data-bucket")
```

## Cost Considerations

Autoclass charges a small management fee and a one-time enablement charge for the monitoring and transition management. These charges are typically much smaller than the savings from automatic transitions, but it is worth understanding:

- Autoclass-enabled buckets use Autoclass-specific storage and operation SKUs
- Retrieval fees and early deletion fees do not apply while objects are in an Autoclass-enabled bucket, except as part of the one-time enablement charge
- All operations are charged at the Standard storage rate
- Some transitions from Coldline or Archive back to Standard or Nearline incur Class A operation charges

For most workloads, the net effect is significant cost savings. The management fee is a fraction of what you save by not storing cold data in Standard class.

## Migration Strategy

If you are currently using lifecycle rules and want to switch to Autoclass:

1. Enable Autoclass on the bucket
2. Remove your storage class transition lifecycle rules (keep deletion rules)
3. Monitor the bucket for a few weeks to see how Autoclass manages transitions
4. Compare costs before and after

Autoclass takes the guesswork out of storage class management. For buckets where you cannot easily predict access patterns, it is almost always the right choice. For buckets with very predictable patterns and strict compliance requirements, stick with lifecycle rules. And for everything in between, try Autoclass and see if the savings materialize.
