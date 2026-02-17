# How to Exclude Noisy Kubernetes System Logs from Cloud Logging Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Cloud Logging, Kubernetes, Cost Optimization

Description: Learn how to identify and exclude noisy Kubernetes system logs from Cloud Logging ingestion to reduce costs while keeping important operational data.

---

If you have ever looked at the Cloud Logging bill for a GKE cluster, you know that Kubernetes system logs can be a significant chunk of it. Components like kube-proxy, kube-dns, fluentbit, gke-metrics-agent, and various system controllers generate constant streams of logs that most teams never look at. You are paying for log ingestion on data that goes straight into a black hole.

In this post, I will help you identify which system logs are eating your budget and show you how to exclude them without losing the logs that actually matter.

## Understanding GKE System Log Volume

A typical GKE cluster generates logs from two categories:

1. **Application logs**: Output from your workloads running in application namespaces
2. **System logs**: Output from Kubernetes system components running in kube-system and other system namespaces

System logs often account for 30-60 percent of total log volume, depending on cluster size and workload. For a 20-node cluster, system logs alone can easily produce 10-20 GiB per day.

## Identifying the Noisiest System Logs

Before excluding anything, figure out what is actually consuming the most volume. Run this query in the Logs Explorer:

```
resource.type="k8s_container"
resource.labels.namespace_name="kube-system"
```

Then look at the histogram at the top to see the volume. You can also break it down by container name to find the worst offenders.

If you have Log Analytics enabled, this SQL query gives you exact numbers:

```sql
-- Top system containers by log entry count in the last 24 hours
SELECT
  resource.labels.namespace_name AS namespace,
  resource.labels.container_name AS container,
  COUNT(*) AS entry_count,
  ROUND(SUM(LENGTH(COALESCE(text_payload, TO_JSON_STRING(json_payload)))) / 1048576, 2) AS approx_mb
FROM
  `my-project.global._Default._AllLogs`
WHERE
  resource.type = 'k8s_container'
  AND resource.labels.namespace_name IN ('kube-system', 'gke-managed-system', 'config-management-system', 'gke-gmp-system', 'istio-system')
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  namespace, container
ORDER BY
  entry_count DESC
```

## Common Noisy System Components

Here are the system components that typically generate the most noise:

### kube-proxy
Logs network rule updates for every service change. On clusters with many services, this generates constant output.

### fluentbit / fluentd
The log collection agent itself generates logs about its own operation - processing counts, buffer stats, connection events.

### gke-metrics-agent
The metrics collection agent logs its own scraping activity. Informational level logs are rarely useful.

### kube-dns / coredns
DNS resolution logs for every internal DNS query. In a busy cluster, this is enormous.

### event-exporter
Exports Kubernetes events to Cloud Logging. Events are useful but can be voluminous.

### csi-driver and pdcsi-node
Storage driver logs that are mostly informational.

### ip-masq-agent
IP masquerading agent logs that are routine operational output.

## Creating Exclusion Filters

### Exclude All kube-system Info Logs

The safest starting point is to exclude informational-level logs from kube-system while keeping warnings and errors:

```bash
# Exclude kube-system logs below WARNING severity
gcloud logging sinks update _Default \
  --add-exclusion="name=gke-system-info-logs,filter=resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\" AND severity<WARNING" \
  --project=my-project
```

This single exclusion typically cuts system log volume by 70-80 percent.

### Exclude Specific Noisy Containers

If you want more granular control, target the noisiest containers individually:

```bash
# Exclude kube-proxy info logs
gcloud logging sinks update _Default \
  --add-exclusion="name=kube-proxy-info,filter=resource.type=\"k8s_container\" AND resource.labels.container_name=\"kube-proxy\" AND severity<WARNING" \
  --project=my-project

# Exclude fluentbit info logs
gcloud logging sinks update _Default \
  --add-exclusion="name=fluentbit-info,filter=resource.type=\"k8s_container\" AND resource.labels.container_name=\"fluentbit\" AND severity<WARNING" \
  --project=my-project

# Exclude gke-metrics-agent info logs
gcloud logging sinks update _Default \
  --add-exclusion="name=metrics-agent-info,filter=resource.type=\"k8s_container\" AND resource.labels.container_name=\"gke-metrics-agent\" AND severity<WARNING" \
  --project=my-project
```

### Exclude Multiple System Namespaces

GKE uses several system namespaces beyond kube-system:

```bash
# Exclude info logs from all GKE system namespaces
gcloud logging sinks update _Default \
  --add-exclusion="name=all-system-namespaces-info,filter=resource.type=\"k8s_container\" AND (resource.labels.namespace_name=\"kube-system\" OR resource.labels.namespace_name=\"gke-managed-system\" OR resource.labels.namespace_name=\"config-management-system\" OR resource.labels.namespace_name=\"gke-gmp-system\") AND severity<WARNING" \
  --project=my-project
```

### Exclude Node-Level System Logs

GKE nodes generate their own system logs:

```bash
# Exclude node-level informational system logs
gcloud logging sinks update _Default \
  --add-exclusion="name=node-info-logs,filter=resource.type=\"k8s_node\" AND severity<WARNING" \
  --project=my-project
```

### Exclude Pod Event Logs

Kubernetes pod lifecycle events can be noisy, especially during deployments:

```bash
# Exclude normal pod events (keep warnings and errors)
gcloud logging sinks update _Default \
  --add-exclusion="name=pod-normal-events,filter=resource.type=\"k8s_pod\" AND severity<WARNING" \
  --project=my-project
```

## Keeping Important System Logs

Not all system logs are noise. Here is what you should keep:

1. **Errors and warnings from any system component**: These indicate real problems - CrashLoopBackOff, OOM kills, network failures
2. **Cluster autoscaler logs**: Tells you when and why nodes are added or removed
3. **kubelet error logs**: Node-level problems that affect pod scheduling
4. **Certificate and security-related logs**: Authentication and authorization failures

The exclusion filters above already preserve these by only excluding logs below WARNING severity.

## Verifying the Impact

After applying exclusions, check the impact:

### Check Ingestion Volume

```bash
# View log ingestion metrics
gcloud logging metrics list --project=my-project
```

In the Cloud Console, go to **Logging** > **Log Storage** to see current ingestion rates.

### Monitor Costs with a Dashboard

Create a monitoring dashboard with this metric:

```
# Track log ingestion bytes over time
fetch global
| metric 'logging.googleapis.com/billing/bytes_ingested'
| group_by [resource.labels.log], [val: sum(value.bytes_ingested)]
| every 1h
```

### Compare Before and After

Wait a day after applying exclusions and compare the ingestion volume with the previous period. You should see a noticeable drop.

## Terraform Configuration

```hcl
# Exclude kube-system info-level logs
resource "google_logging_project_exclusion" "kube_system_info" {
  name        = "gke-kube-system-info-logs"
  description = "Exclude informational logs from kube-system to reduce ingestion costs"
  filter      = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\" AND severity<WARNING"
}

# Exclude other GKE system namespace info logs
resource "google_logging_project_exclusion" "gke_managed_system_info" {
  name        = "gke-managed-system-info-logs"
  description = "Exclude informational logs from gke-managed-system"
  filter      = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"gke-managed-system\" AND severity<WARNING"
}

# Exclude node-level info logs
resource "google_logging_project_exclusion" "node_info" {
  name        = "gke-node-info-logs"
  description = "Exclude informational node-level logs"
  filter      = "resource.type=\"k8s_node\" AND severity<WARNING"
}

# Exclude pod lifecycle info events
resource "google_logging_project_exclusion" "pod_info" {
  name        = "gke-pod-info-events"
  description = "Exclude informational pod lifecycle events"
  filter      = "resource.type=\"k8s_pod\" AND severity<WARNING"
}
```

## Alternative: Use GKE System Log Configuration

GKE also provides cluster-level configuration for which system logs are collected. You can disable system log collection entirely or configure which components send logs:

```bash
# Configure GKE logging to only collect workload logs (no system logs)
gcloud container clusters update prod-cluster \
  --logging=WORKLOAD \
  --region=us-central1 \
  --project=my-project
```

The available logging options are:

- **SYSTEM**: System component logs only
- **WORKLOAD**: Application workload logs only
- **SYSTEM,WORKLOAD**: Both (default)
- **API_SERVER**: API server logs
- **SCHEDULER**: Scheduler logs
- **CONTROLLER_MANAGER**: Controller manager logs

You can combine these:

```bash
# Collect workload logs and only critical system component logs
gcloud container clusters update prod-cluster \
  --logging=WORKLOAD,API_SERVER \
  --region=us-central1 \
  --project=my-project
```

This approach is more coarse-grained than exclusion filters but completely prevents system logs from being collected, which means zero ingestion cost for those log types.

## Recommended Strategy

Here is the approach I recommend:

1. **Start by measuring**: Use Log Analytics or the Logs Storage page to understand your current system log volume.

2. **Apply broad exclusions first**: Exclude all system namespace logs below WARNING severity. This is safe and captures most of the savings.

3. **Fine-tune as needed**: If specific system components still generate too much noise at WARNING level, add targeted exclusions.

4. **Archive before excluding**: If you think you might need system logs for debugging, set up a Cloud Storage export sink before applying exclusions. The storage cost is minimal compared to Cloud Logging ingestion.

5. **Monitor the results**: Track ingestion volume for a week after making changes to confirm the savings.

## Estimated Savings

Based on real-world clusters I have worked with:

| Cluster Size | Before Exclusions | After Exclusions | Savings |
|-------------|-------------------|------------------|---------|
| 5 nodes | ~5 GiB/day | ~2 GiB/day | 60% |
| 20 nodes | ~20 GiB/day | ~7 GiB/day | 65% |
| 50 nodes | ~55 GiB/day | ~18 GiB/day | 67% |

At $0.50 per GiB for Cloud Logging ingestion, a 50-node cluster could save roughly $550/month.

## Wrapping Up

Excluding noisy Kubernetes system logs is one of the quickest wins for reducing GKE logging costs. Most teams never look at informational kube-proxy or fluentbit logs, yet they are paying for every byte of ingestion. A single exclusion filter targeting kube-system info-level logs typically reduces total log volume by half or more, while preserving the warnings and errors that you actually need for troubleshooting. Measure first, exclude broadly, and fine-tune from there.
