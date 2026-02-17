# How to Calculate and Optimize Cloud Logging Costs by Analyzing Ingestion Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Cost Optimization, Log Management, FinOps

Description: A practical guide to understanding Cloud Logging pricing, identifying high-volume log sources, and implementing strategies to reduce your logging bill without losing visibility.

---

Cloud Logging bills can sneak up on you. A service that logs a few lines per request does not seem like a big deal until you realize it handles 10 million requests a day and you are suddenly ingesting terabytes of logs per month. I have seen teams go from a manageable logging bill to a five-figure monthly charge just because someone added verbose logging to a high-traffic service.

The good news is that Cloud Logging gives you the tools to understand exactly where your log volume comes from and to make targeted cuts without losing the logs that matter.

## Understanding Cloud Logging Pricing

Cloud Logging pricing has three main components:

1. **Ingestion**: You get 50 GiB free per project per month. Beyond that, you pay per GiB ingested. This is usually the biggest cost driver.
2. **Storage**: Logs stored beyond the default retention period of each bucket incur storage charges per GiB per month.
3. **Log Analytics queries**: If you have linked buckets to BigQuery, you pay for query processing.

The `_Required` bucket (Admin Activity audit logs, System Events, Access Transparency logs) does not count toward the free tier and is not charged for ingestion. Everything else goes through the `_Default` sink and counts toward your ingestion volume.

## Step 1: Find Your Current Ingestion Volume

The first step is understanding how much you are ingesting and where it comes from. The Cloud Console has a useful breakdown.

Go to **Logging > Logs Storage** in the Cloud Console. This page shows you ingestion volume per log bucket and per log source over the selected time period.

For a programmatic approach, you can query the ingestion metrics directly.

```bash
# Get log ingestion volume by resource type for the last 7 days
gcloud monitoring time-series list \
  --filter='metric.type = "logging.googleapis.com/billing/bytes_ingested"' \
  --interval-start-time=$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ) \
  --format=json | \
  jq -r '.[] | "\(.resource.labels.resource_container) - \(.metric.labels.log) - \(.points[0].value.int64Value) bytes"' | \
  sort -t'-' -k3 -rn | head -20
```

## Step 2: Identify the Top Log Sources

Most of the time, 80% of your log volume comes from a handful of sources. Common culprits include:

- **Load balancer request logs**: Every single HTTP request generates a log entry. High-traffic services can produce enormous volumes.
- **GKE container stdout/stderr**: Applications that log every request or debug information to stdout.
- **VPC flow logs**: Network flow records for every connection in your VPC.
- **Data access audit logs**: Every API read call generates an audit log if enabled.
- **Cloud SQL query logs**: Every database query logged at the general log level.

Here is how to get a breakdown of ingestion by log name using the Logs Explorer.

```bash
# Count log entries by logName in the last 24 hours
gcloud logging read \
  'timestamp >= "2026-02-16T00:00:00Z"' \
  --limit=10000 \
  --format='value(logName)' | \
  sort | uniq -c | sort -rn | head -20
```

For a more accurate picture, use the Metrics Explorer in Cloud Monitoring. Search for the metric `logging.googleapis.com/billing/bytes_ingested` and group by `log` or `resource_type`.

## Step 3: Estimate Your Monthly Cost

Once you know your daily ingestion volume, calculating the monthly cost is straightforward.

```
Monthly cost = (Daily GiB ingested - (50 GiB free / 30 days)) * 30 * price per GiB
```

You can also check your actual spend in the Billing console. Go to **Billing > Reports** and filter by the Cloud Logging service.

Here is a quick script to estimate costs based on current ingestion rates.

```python
# Simple cost estimator for Cloud Logging
# Run this with your actual daily ingestion numbers

daily_ingestion_gib = 150  # Replace with your actual daily ingestion
free_tier_gib = 50  # Monthly free tier
price_per_gib = 0.50  # Current price, check for updates

monthly_ingestion = daily_ingestion_gib * 30
billable_gib = max(0, monthly_ingestion - free_tier_gib)
monthly_cost = billable_gib * price_per_gib

print(f"Monthly ingestion: {monthly_ingestion:.1f} GiB")
print(f"Billable volume: {billable_gib:.1f} GiB")
print(f"Estimated monthly cost: ${monthly_cost:.2f}")
```

## Step 4: Reduce Ingestion with Exclusion Filters

The most effective way to cut costs is to exclude logs you do not need. Exclusion filters drop matching log entries before they are ingested, so you never pay for them.

These commands add exclusion filters to the default sink for common high-volume, low-value logs.

```bash
# Exclude load balancer health check logs (often the biggest volume)
gcloud logging sinks update _Default \
  --add-exclusion=name=exclude-health-checks,filter='resource.type="http_load_balancer" AND httpRequest.requestUrl="/health" OR httpRequest.requestUrl="/healthz" OR httpRequest.requestUrl="/readiness"'

# Exclude debug-level logs from all services
gcloud logging sinks update _Default \
  --add-exclusion=name=exclude-debug,filter='severity="DEBUG"'

# Exclude VPC flow logs for internal traffic
gcloud logging sinks update _Default \
  --add-exclusion=name=exclude-internal-vpc-flows,filter='resource.type="gce_subnetwork" AND jsonPayload.connection.src_ip=~"^10\\."'
```

Be careful with exclusions - once logs are excluded, they are gone. You cannot recover them. Always test your exclusion filter in the Logs Explorer first to make sure it only matches what you intend.

## Step 5: Reduce Log Volume at the Source

Sometimes it is better to reduce logging at the source rather than excluding after the fact.

**For GKE workloads**, adjust your application's log level in production. Most applications do not need DEBUG or TRACE logging in production.

**For VPC Flow Logs**, reduce the sampling rate instead of logging every flow.

```bash
# Set VPC flow log sampling to 50% instead of 100%
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --logging-flow-sampling=0.5
```

**For Load Balancer logs**, consider sampling at the backend service level.

```bash
# Set load balancer logging sample rate to 10%
gcloud compute backend-services update my-backend \
  --global \
  --logging-sample-rate=0.1
```

**For Data Access Audit Logs**, be selective about which services you enable them for. Not every service needs data access logging.

## Step 6: Route to Cheaper Storage

For logs you need to keep but do not query often, route them to Cloud Storage instead of keeping them in Cloud Logging. Storage is significantly cheaper than Cloud Logging retention.

```bash
# Create a Cloud Storage sink for archival
gcloud logging sinks create archive-sink \
  storage.googleapis.com/my-log-archive-bucket \
  --log-filter='severity="INFO"' \
  --description="Archive INFO logs to Cloud Storage"

# Set the storage bucket to use Nearline or Coldline for further savings
gcloud storage buckets update gs://my-log-archive-bucket \
  --default-storage-class=NEARLINE
```

## Step 7: Monitor Your Optimization

After implementing changes, track the impact over time.

Create a Cloud Monitoring dashboard with these metrics to keep an eye on your log volume trends.

```bash
# Create an alert if daily ingestion exceeds your budget threshold
gcloud monitoring policies create \
  --display-name="Log Ingestion Budget Alert" \
  --condition-display-name="Daily ingestion exceeds 200 GiB" \
  --condition-filter='metric.type="logging.googleapis.com/billing/bytes_ingested"' \
  --condition-threshold-value=214748364800 \
  --condition-threshold-duration=0s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"86400s","perSeriesAligner":"ALIGN_SUM","crossSeriesReducer":"REDUCE_SUM"}'
```

## Cost Optimization Checklist

Here is a quick checklist to work through:

1. Check your current ingestion volume in Logs Storage
2. Identify the top 5 log sources by volume
3. For each high-volume source, ask: "Do I actually need these logs?"
4. Exclude health check and heartbeat logs
5. Lower sampling rates for VPC flow logs and load balancer logs
6. Reduce application log verbosity in production
7. Route archival logs to Cloud Storage instead of keeping them in Cloud Logging
8. Set appropriate retention periods on custom buckets
9. Disable data access audit logs for services that do not need them
10. Set up a budget alert for log ingestion costs

## Wrapping Up

Cloud Logging costs are controllable once you know where your volume comes from. The process is straightforward: measure your ingestion, identify the biggest sources, and apply targeted reductions through exclusion filters, source-level sampling, and cheaper storage tiers. Most teams can cut their logging bill by 40-60% without losing any logs they actually use for debugging or compliance.
