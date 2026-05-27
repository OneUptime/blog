# How to Troubleshoot Missing Logs in Cloud Logging Sinks and Destinations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Log Sinks, Troubleshooting, Debugging

Description: A step-by-step troubleshooting guide for diagnosing and fixing missing logs in Cloud Logging sinks, covering common issues with filters, permissions, and destinations.

---

You set up a logging sink, configured the filter, pointed it at a destination, and then... nothing shows up. Or worse, some logs appear but others are mysteriously absent. This is one of the most frustrating issues to debug on GCP because there are multiple layers where things can go wrong, and the error messages are not always helpful.

I have run into this problem enough times to develop a systematic troubleshooting process. Let me walk through the most common causes and how to fix each one.

## Step 1: Verify the Sink Exists and Is Active

Start with the basics. Confirm that your sink actually exists and has the configuration you expect.

This command lists all sinks in your project with their destinations and filters.

```bash
# List all sinks in the project

gcloud logging sinks list

# Get detailed information about a specific sink
gcloud logging sinks describe my-sink
```

Check the output for:
- Is the sink enabled? (Look for `disabled: true` in the output)
- Is the destination correct?
- Is the filter what you intended?

## Step 2: Test Your Filter in Logs Explorer

The most common cause of missing logs is an incorrect filter. Before blaming the sink, verify that your filter actually matches log entries.

Open the Logs Explorer in the Cloud Console and paste your sink filter into the query box. Run it. If you get zero results, the problem is your filter, not the sink.

You can also test from the command line.

```bash
# Test a filter by reading logs that match it
gcloud logging read 'resource.type="cloud_run_revision" AND severity="ERROR"' \
  --limit=5 \
  --format=json
```

Common filter mistakes include:
- Using `=` instead of `=~` for regex matching
- Incorrect field paths (e.g., `jsonPayload.error` when the actual field is `jsonPayload.err`)
- Missing quotes around string values
- Case sensitivity issues (severity values must be uppercase: `ERROR`, not `error`)

## Step 3: Check the Sink's Service Account Permissions

Most sinks have a writer identity - a service account that writes logs to the destination. Sinks that write to a Cloud Logging bucket in the same project do not need a writer identity. If a sink has a writer identity and that service account does not have the right permissions on the destination, logs fail to deliver.

First, find the sink's writer identity.

```bash
# Get the writer identity for your sink
gcloud logging sinks describe my-sink --format='value(writerIdentity)'
```

This will return something like `serviceAccount:service-123456789012@gcp-sa-logging.iam.gserviceaccount.com`. If the command does not return a writer identity, you do not need to configure destination permissions for that sink.

Then verify it has the right role on the destination. The required role depends on the destination type:

- **Cloud Storage bucket**: `roles/storage.objectCreator`
- **BigQuery dataset**: `roles/bigquery.dataEditor`
- **Pub/Sub topic**: `roles/pubsub.publisher`
- **Cloud Logging bucket**: `roles/logging.bucketWriter` if the bucket is in a different project; no additional permissions are needed for a log bucket in the same project

Here is how to grant the correct permissions for a Cloud Storage destination.

```bash
# Get the writer identity
WRITER_IDENTITY=$(gcloud logging sinks describe my-sink --format='value(writerIdentity)')

# Grant objectCreator role on the destination bucket
gcloud storage buckets add-iam-policy-binding gs://my-log-bucket \
  --member="$WRITER_IDENTITY" \
  --role="roles/storage.objectCreator"
```

For BigQuery:

```bash
# Grant dataEditor role on the project that contains the BigQuery dataset
gcloud projects add-iam-policy-binding my-project \
  --member="$WRITER_IDENTITY" \
  --role="roles/bigquery.dataEditor"
```

## Step 4: Check for Exclusion Filters

Exclusion filters on your sink can prevent matching logs from reaching your destination. Other project-level sinks, including `_Default`, evaluate logs independently, so an exclusion on `_Default` does not globally exclude logs from your custom sink. Organization-level or folder-level intercepting sinks are the exception; those can prevent matching logs from reaching child-resource sinks.

```bash
# Check exclusion filters on your sink
gcloud logging sinks describe my-sink

# Check exclusion filters on all sinks
gcloud logging sinks list --format="table(name, exclusions)"
```

If you see exclusion filters on your sink that match the logs you are expecting, that is your problem. Modify or remove the exclusion. If an intercepting aggregated sink is involved, modify that sink's filters or routing behavior.

## Step 5: Verify the Destination Is Accessible

Sometimes the destination itself is the issue. The bucket might not exist, the BigQuery dataset might be in a different region, or a Pub/Sub topic might have been deleted.

```bash
# For Cloud Storage destinations
gcloud storage ls gs://my-log-bucket

# For BigQuery destinations
bq show my-project:my_log_dataset

# For Pub/Sub destinations
gcloud pubsub topics describe my-log-topic
```

Also check for organization policies that might block cross-project or cross-region access. The `constraints/gcp.resourceLocations` constraint can prevent data from flowing to destinations in restricted regions.

## Step 6: Check for Delays

Log delivery is not instant. Different destinations have different latency characteristics:

- **Cloud Logging buckets**: Near real-time (seconds)
- **BigQuery**: typically within one minute, though a newly created table can take several minutes before the first log entries are available
- **Cloud Storage**: saved in hourly batches, and it can take 2-3 hours before the first entries appear
- **Pub/Sub**: Near real-time (seconds)

If you just created the sink and are not seeing logs, wait at least 10-15 minutes before troubleshooting further. For Cloud Storage sinks, you might need to wait several hours.

## Step 7: Check the Sink Error Metrics

Cloud Monitoring tracks sink delivery errors. This is one of the most useful debugging tools.

```bash
# Query for sink export errors in the last hour
gcloud monitoring time-series list \
  --filter='metric.type="logging.googleapis.com/exports/error_count"' \
  --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --format=json
```

You can also find these metrics in the Cloud Console under Monitoring > Metrics Explorer. Search for `logging.googleapis.com/exports/error_count` and filter by sink name.

Common errors include:
- `PERMISSION_DENIED`: The sink's service account lacks access to the destination
- `NOT_FOUND`: The destination does not exist
- `RESOURCE_EXHAUSTED`: The destination has hit a quota limit

## Step 8: Check Organization and Folder-Level Sinks

If you are working in an organization with multiple projects, remember that sinks can be defined at the organization, folder, or project level. An organization-level or folder-level sink can be configured as an intercepting aggregated sink, which can route matching logs before they reach your project-level sink.

```bash
# List organization-level sinks (requires org admin access)
gcloud logging sinks list --organization=YOUR_ORG_ID

# List folder-level sinks
gcloud logging sinks list --folder=YOUR_FOLDER_ID
```

## Step 9: Check Log Ingestion Itself

If none of the above steps reveal the problem, verify that the logs are actually being ingested in the first place. Sample recent logs from Cloud Logging.

```bash
# Check recent log ingestion volume
gcloud logging read '' --limit=10 --format='value(logName)' | sort | uniq -c | sort -rn
```

If you are expecting logs from a particular service and they are not showing up anywhere - not in Logs Explorer, not in any sink - then the problem is upstream. The service might not be generating logs, or there could be a networking issue preventing log delivery to the Cloud Logging API.

## Common Scenarios and Fixes

Here is a quick reference for the most frequent issues:

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No logs in destination | Permission denied | Grant writer identity the correct role |
| Partial logs missing | Filter too restrictive | Test filter in Logs Explorer |
| Logs appear with delay | Normal behavior | Wait for delivery window |
| Logs in Explorer but not in sink | Sink created after logs | Sinks only process new logs |
| Duplicate logs | Multiple sinks matching | Add exclusions or consolidate sinks |
| Sink error metrics showing | Various | Check specific error type |

One thing that trips people up: sinks only process logs that arrive after the sink is created. They do not backfill historical logs. If you need to export existing logs, use `gcloud logging read` with a filter and pipe the output to your destination manually.

## Wrapping Up

Missing logs in Cloud Logging sinks usually come down to one of a few issues: wrong filter, missing permissions, or destination problems. Start by verifying your filter matches actual logs, then check the writer identity permissions, look for exclusion filters, and finally check the delivery error metrics. Following this sequence will resolve the issue in the vast majority of cases.
