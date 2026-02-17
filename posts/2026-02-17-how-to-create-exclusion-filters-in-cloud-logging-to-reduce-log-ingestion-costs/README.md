# How to Create Exclusion Filters in Cloud Logging to Reduce Log Ingestion Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Cost Optimization, Exclusion Filters, Log Management

Description: Learn how to use exclusion filters in Cloud Logging to reduce log ingestion costs by filtering out noisy, low-value logs before they are stored.

---

Cloud Logging charges based on the volume of logs ingested. If you have ever looked at your GCP bill and seen a surprisingly large Cloud Logging line item, you are not alone. The reality is that many of the logs ingested by default are noise - health check pings, verbose debug output, repetitive status messages - and you are paying for all of it.

Exclusion filters let you drop specific logs before they are stored in Cloud Logging, reducing your ingestion costs without losing the logs that actually matter. In this post, I will show you how to identify high-volume low-value logs and create exclusion filters to cut your logging bill.

## Understanding Cloud Logging Costs

Cloud Logging pricing works like this:

- **First 50 GiB per project per month**: Free
- **Additional ingestion**: Around $0.50 per GiB

That sounds cheap until you realize how much log data GCP services generate. A moderately busy GKE cluster can easily produce 100+ GiB of logs per month. A fleet of Compute Engine VMs running web applications can produce even more.

The `_Required` logs (admin activity audit logs and system event logs) are always free and cannot be excluded. Everything else is fair game.

## Identifying What to Exclude

Before creating exclusion filters, figure out which logs are eating your budget. The Logs Explorer in Cloud Monitoring can help.

### Using the Log Volume Dashboard

Navigate to **Logging** > **Logs Storage** in the Cloud Console. This page shows ingestion volume by log type, which immediately tells you where your bytes are going.

Common high-volume, low-value log sources:

- **Load balancer health check logs**: These fire every few seconds for every backend
- **GKE system container logs**: kube-proxy, kube-dns, and other system components generate constant output
- **Debug and trace-level logs**: Applications that log at DEBUG or TRACE level in production
- **Successful health check HTTP requests**: 200 OK responses to /healthz or /readyz endpoints

### Estimating Impact with Log Analytics

You can estimate how much each log type contributes using this query in Logs Explorer:

```
# Count log entries by resource type and log name over the last day
resource.type="gce_instance"
```

Then use the histogram at the top of the Logs Explorer to see the volume.

## Creating Exclusion Filters

### Method 1: Modify the _Default Sink

The simplest approach is to add exclusion filters to the `_Default` sink. These filters prevent matching logs from being stored in the `_Default` log bucket.

Using the console:

1. Go to **Logging** > **Log Router**
2. Click on the `_Default` sink
3. Under **Choose logs to filter out of sink**, add your exclusion filters

Using gcloud:

```bash
# Add an exclusion filter to the _Default sink to drop health check logs
gcloud logging sinks update _Default \
  --add-exclusion="name=exclude-health-checks,filter=httpRequest.requestUrl=\"/healthz\" OR httpRequest.requestUrl=\"/readyz\"" \
  --project=my-project
```

### Method 2: Create Standalone Exclusion Filters

You can also create project-level exclusion filters that apply before any sink processes the logs:

```bash
# Create an exclusion filter for load balancer health check logs
gcloud logging sinks create exclude-lb-health-checks \
  logging.googleapis.com/projects/my-project/locations/global/buckets/_Default \
  --exclusion="name=lb-health-checks,filter=resource.type=\"http_load_balancer\" AND httpRequest.requestUrl=\"/healthz\"" \
  --project=my-project
```

Wait - actually, the cleaner approach for project-level exclusions is:

```bash
# Create a project-level exclusion that drops health check logs entirely
gcloud beta logging sinks update _Default \
  --add-exclusion="name=health-checks,filter=httpRequest.requestUrl=~\"/health\" OR httpRequest.requestUrl=~\"/ready\"" \
  --project=my-project
```

## Common Exclusion Filter Patterns

Here are exclusion filters I have found most impactful across different environments.

### Health Check Logs

These are usually the biggest offenders. Load balancers check backend health every few seconds, generating enormous volumes of repetitive logs:

```
# Exclude health check HTTP requests
httpRequest.requestUrl="/healthz" OR httpRequest.requestUrl="/readyz" OR httpRequest.requestUrl="/health" OR httpRequest.requestUrl="/"
```

```bash
# Apply the health check exclusion
gcloud logging sinks update _Default \
  --add-exclusion="name=health-checks,filter=httpRequest.requestUrl=\"/healthz\" OR httpRequest.requestUrl=\"/readyz\"" \
  --project=my-project
```

### GKE System Logs

GKE system components are chatty. If you do not need detailed system logs, exclude them:

```bash
# Exclude GKE system namespace logs
gcloud logging sinks update _Default \
  --add-exclusion="name=gke-system-logs,filter=resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\"" \
  --project=my-project
```

If you want to keep error-level system logs but exclude informational ones:

```bash
# Exclude GKE system logs below WARNING severity
gcloud logging sinks update _Default \
  --add-exclusion="name=gke-system-info,filter=resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\" AND severity<WARNING" \
  --project=my-project
```

### Debug-Level Application Logs

If your application logs at DEBUG level in production:

```bash
# Exclude DEBUG severity logs
gcloud logging sinks update _Default \
  --add-exclusion="name=debug-logs,filter=severity=DEBUG" \
  --project=my-project
```

### Data Access Audit Logs

Data access audit logs can be extremely high-volume, especially for BigQuery or Cloud Storage. If you do not need them for compliance:

```bash
# Exclude data access audit logs (keep admin activity logs)
gcloud logging sinks update _Default \
  --add-exclusion="name=data-access-logs,filter=logName=\"projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access\"" \
  --project=my-project
```

### VPC Flow Logs

VPC flow logs are useful for network troubleshooting but generate massive volumes:

```bash
# Exclude VPC flow logs from default storage
gcloud logging sinks update _Default \
  --add-exclusion="name=vpc-flow-logs,filter=resource.type=\"gce_subnetwork\" AND logName=~\"vpc_flows\"" \
  --project=my-project
```

## Using Exclusion Filters with Export Sinks

An important detail: exclusion filters on the `_Default` sink only affect what gets stored in the `_Default` bucket. If you have created custom sinks that export logs to BigQuery, Cloud Storage, or Pub/Sub, those sinks still see the excluded logs.

This is actually useful. You can exclude noisy logs from Cloud Logging storage (saving ingestion costs) while still routing them to a cheaper destination like Cloud Storage for archival.

## Terraform Configuration

```hcl
# Exclusion filter for health check logs
resource "google_logging_project_exclusion" "health_checks" {
  name        = "exclude-health-checks"
  description = "Exclude health check request logs to reduce ingestion costs"
  filter      = "httpRequest.requestUrl=\"/healthz\" OR httpRequest.requestUrl=\"/readyz\""
}

# Exclusion filter for GKE system logs
resource "google_logging_project_exclusion" "gke_system" {
  name        = "exclude-gke-system-info"
  description = "Exclude informational GKE system namespace logs"
  filter      = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\" AND severity<WARNING"
}

# Exclusion filter for debug logs
resource "google_logging_project_exclusion" "debug" {
  name        = "exclude-debug-logs"
  description = "Exclude debug-level application logs"
  filter      = "severity=DEBUG"
}
```

## Measuring the Impact

After applying exclusion filters, monitor the impact:

1. Check the **Logs Storage** page in the console to see updated ingestion volumes
2. Compare your Cloud Logging costs month-over-month in the Billing console
3. Use this Cloud Monitoring metric to track ingestion:

```
# Monitor log ingestion volume over time
fetch global
| metric 'logging.googleapis.com/billing/bytes_ingested'
| group_by [], [val: sum(value.bytes_ingested)]
| every 1h
```

## Safety Tips

A few things to keep in mind before you start excluding logs:

1. **Start with a percentage**: Exclusion filters support a `disabled` flag and a percentage-based exclusion. Start by excluding 50 percent of a log type to test the impact before going to 100 percent.

2. **Do not exclude audit logs you need**: Admin Activity audit logs are free and always collected. Data Access audit logs are not free but may be required for compliance.

3. **Export before excluding**: If you might need the logs later, set up an export sink to Cloud Storage before creating the exclusion filter.

4. **Test filters in Logs Explorer first**: Paste your filter into Logs Explorer to see exactly which logs match before applying it as an exclusion.

## Wrapping Up

Exclusion filters are the single most effective way to reduce Cloud Logging costs. Most GCP projects have significant volumes of low-value logs that are being ingested and paid for without anyone ever looking at them. Start by identifying your highest-volume log sources, verify they are not needed for operations or compliance, and create exclusion filters to drop them. The savings can be substantial - I have seen teams cut their logging costs by 50 percent or more just by excluding health checks and system logs.
