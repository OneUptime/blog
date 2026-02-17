# How to Set Up Log Retention Policies for Different Log Buckets in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Log Retention, Log Buckets, Observability

Description: Learn how to configure custom log retention policies for different log buckets in Google Cloud Logging to balance compliance requirements with cost optimization.

---

If you have been running services on Google Cloud for any amount of time, you have probably noticed that log storage costs can grow fast. By default, Cloud Logging stores logs for 30 days in the `_Default` bucket and 400 days in the `_Required` bucket. But most teams need different retention periods for different types of logs. Audit logs might need to stick around for a year, while debug logs from development environments can probably be discarded after a week.

This is where custom log buckets and retention policies come in. Instead of treating all logs the same, you can route different log types to different buckets, each with its own retention period. Let me walk you through how to set this up.

## Understanding Cloud Logging Buckets

Cloud Logging gives you two built-in buckets in every project:

- **_Required**: Stores Admin Activity audit logs, System Event audit logs, and Access Transparency logs. Retention is fixed at 400 days and cannot be changed.
- **_Default**: Stores everything else that is not routed elsewhere. Default retention is 30 days, but you can adjust this.

Beyond these, you can create custom buckets with retention periods ranging from 1 day to 3,650 days (10 years). This flexibility is what makes it possible to implement a real log management strategy.

## Step 1: Create Custom Log Buckets

Let's say you need three different retention tiers: short-term for debug logs (7 days), medium-term for application logs (90 days), and long-term for security logs (365 days).

Here is how to create these buckets using the gcloud CLI. Each bucket is created with a specific retention period in days.

```bash
# Create a bucket for short-lived debug logs with 7-day retention
gcloud logging buckets create debug-logs \
  --location=global \
  --retention-days=7 \
  --description="Short-term storage for debug and development logs"

# Create a bucket for application logs with 90-day retention
gcloud logging buckets create app-logs \
  --location=global \
  --retention-days=90 \
  --description="Medium-term storage for production application logs"

# Create a bucket for security and audit logs with 365-day retention
gcloud logging buckets create security-logs \
  --location=global \
  --retention-days=365 \
  --description="Long-term storage for security and compliance logs"
```

You can also specify a region instead of `global` if you need logs stored in a particular geographic location for compliance reasons.

## Step 2: Set Up Log Sinks to Route Logs

Creating buckets alone does nothing - you need sinks to route logs into them. A sink is basically a filter that sends matching log entries to a specific destination.

The following commands create sinks that route logs based on their severity and resource type.

```bash
# Route debug-level logs to the debug-logs bucket
gcloud logging sinks create debug-sink \
  logging.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/buckets/debug-logs \
  --log-filter='severity="DEBUG"' \
  --description="Routes debug logs to short-term bucket"

# Route application logs (INFO, WARNING, ERROR) to the app-logs bucket
gcloud logging sinks create app-sink \
  logging.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/buckets/app-logs \
  --log-filter='severity="INFO" OR severity="WARNING" OR severity="ERROR"' \
  --description="Routes application logs to medium-term bucket"

# Route data access audit logs to the security-logs bucket
gcloud logging sinks create security-sink \
  logging.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/buckets/security-logs \
  --log-filter='logName:"cloudaudit.googleapis.com%2Fdata_access"' \
  --description="Routes audit logs to long-term bucket"
```

Replace `YOUR_PROJECT_ID` with your actual project ID.

## Step 3: Modify the Default Bucket Retention

You might also want to adjust the retention on the `_Default` bucket itself. If most of your important logs are being routed to custom buckets, you can reduce the default retention to save money.

This command updates the default bucket to only keep logs for 14 days.

```bash
# Reduce default bucket retention to 14 days
gcloud logging buckets update _Default \
  --location=global \
  --retention-days=14
```

One important thing to know: you can increase retention on the `_Default` bucket at any time, but once you decrease it, logs older than the new retention period will be deleted and cannot be recovered.

## Step 4: Exclude Logs from the Default Bucket

If you are routing logs to custom buckets, you probably do not want duplicate copies in the `_Default` bucket. You can create exclusion filters on the `_Default` sink to prevent this.

These exclusion filters prevent the default sink from also storing the logs you are already routing elsewhere.

```bash
# Exclude debug logs from the default bucket since they go to debug-logs
gcloud logging sinks update _Default \
  --add-exclusion=name=exclude-debug,filter='severity="DEBUG"'

# Exclude audit logs from the default bucket since they go to security-logs
gcloud logging sinks update _Default \
  --add-exclusion=name=exclude-audit,filter='logName:"cloudaudit.googleapis.com%2Fdata_access"'
```

## Step 5: Verify Your Configuration

After setting everything up, verify that your buckets and sinks are configured correctly.

```bash
# List all buckets and their retention settings
gcloud logging buckets list --location=global

# List all sinks and their configurations
gcloud logging sinks list

# Check a specific bucket's details
gcloud logging buckets describe debug-logs --location=global
```

## Using Terraform for Infrastructure as Code

If you manage your infrastructure with Terraform, here is how you can define the same setup. This approach is better for production environments since it keeps your configuration version-controlled.

```hcl
# Define a custom log bucket with 90-day retention
resource "google_logging_project_bucket_config" "app_logs" {
  project        = var.project_id
  location       = "global"
  retention_days = 90
  bucket_id      = "app-logs"
  description    = "Medium-term storage for production application logs"
}

# Define a sink that routes matching logs to the bucket
resource "google_logging_project_sink" "app_sink" {
  name        = "app-sink"
  destination = "logging.googleapis.com/${google_logging_project_bucket_config.app_logs.id}"
  filter      = "severity=\"INFO\" OR severity=\"WARNING\" OR severity=\"ERROR\""

  # Prevent the sink from needing a unique writer identity
  unique_writer_identity = false
}

# Exclude routed logs from the default bucket to avoid duplication
resource "google_logging_project_exclusion" "exclude_app_logs" {
  name        = "exclude-app-logs-from-default"
  description = "Prevent duplication of app logs in _Default bucket"
  filter      = "severity=\"INFO\" OR severity=\"WARNING\" OR severity=\"ERROR\""
}
```

## Cost Considerations

Here is a rough breakdown of how retention policies affect your costs:

- Cloud Logging charges for log ingestion (per GiB ingested beyond the free tier).
- Storage beyond the default retention period of each bucket incurs additional storage costs.
- Shorter retention on non-critical logs can significantly reduce your bill.

A practical approach is to start by analyzing which log sources generate the most volume. You can check this in the Cloud Console under Logging > Logs Storage, which shows ingestion volume per bucket. Route high-volume, low-value logs (like load balancer health checks) to a short-retention bucket or exclude them entirely.

## Common Pitfalls

There are a few things that catch people off guard when working with log bucket retention:

1. **Locked buckets**: If you set a bucket's `locked` field to true, the retention period becomes permanent and cannot be shortened. Only do this for compliance scenarios where you genuinely need immutable retention.

2. **Sink ordering**: If multiple sinks match the same log entry, the entry goes to all matching destinations. Use exclusion filters to prevent unwanted duplication.

3. **Regional considerations**: Buckets in specific regions keep data in that region, but `global` buckets may store data in any Google data center. Pick accordingly based on your data residency requirements.

4. **Retroactive changes**: Changing retention to a shorter period deletes logs that fall outside the new window. There is no undo.

## Wrapping Up

Setting up log retention policies per bucket is one of those things that takes an hour to configure but saves you real money and keeps your compliance team happy. Start by identifying your log categories, create buckets with appropriate retention periods, set up sinks with precise filters, and add exclusions to prevent duplication. Then revisit your setup every few months as your logging needs evolve.
