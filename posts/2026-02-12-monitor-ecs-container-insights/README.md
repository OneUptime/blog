# How to Monitor ECS with Container Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, CloudWatch, Monitoring, Containers

Description: A complete guide to setting up and using Amazon CloudWatch Container Insights to monitor your ECS clusters, services, and tasks in production.

---

Running containers on ECS without proper monitoring is flying blind. You might know that your service is responding to requests, but do you know how much CPU headroom you have? Whether a specific task is leaking memory? If your cluster is about to hit its resource limits?

CloudWatch Container Insights answers all of these questions. It collects, aggregates, and visualizes metrics at the cluster, service, task, and container level. Let's set it up and look at what it can tell you.

## What Container Insights Gives You

Out of the box, Container Insights provides:

- **Cluster-level metrics** - CPU utilization, memory utilization, network I/O, task counts
- **Service-level metrics** - Running task count, desired task count, CPU and memory per service
- **Task-level metrics** - Per-task CPU, memory, network, and storage metrics
- **Container-level metrics** - Individual container resource usage within a task

This is significantly more granular than the default ECS metrics in CloudWatch, which only give you service-level CPU and memory utilization. With Container Insights, you can drill down to see which specific container in a multi-container task is consuming resources.

## Enabling Container Insights on Your Cluster

For new clusters, you can enable Container Insights at creation time:

```bash
# Create a new ECS cluster with Container Insights enabled
aws ecs create-cluster \
  --cluster-name production-cluster \
  --settings "name=containerInsights,value=enabled"
```

For existing clusters, you can update the setting:

```bash
# Enable Container Insights on an existing cluster
aws ecs update-cluster-settings \
  --cluster production-cluster \
  --settings "name=containerInsights,value=enabled"
```

That's it for Fargate. If you're running EC2 launch type, you'll also need the CloudWatch agent installed on your EC2 instances, but for Fargate, ECS handles everything automatically.

## Verifying It's Working

After enabling Container Insights, give it about five minutes to start collecting data. Then check that metrics are flowing:

```bash
# List the Container Insights metric namespaces
aws cloudwatch list-metrics \
  --namespace "ECS/ContainerInsights" \
  --dimensions Name=ClusterName,Value=production-cluster \
  --query "Metrics[*].MetricName" \
  --output table
```

You should see metrics like `CpuUtilized`, `MemoryUtilized`, `NetworkRxBytes`, `NetworkTxBytes`, `StorageReadBytes`, `StorageWriteBytes`, and several others.

## Key Metrics to Watch

Not all metrics are equally important. Here are the ones you should definitely have on your dashboards and set alarms for.

### CPU Metrics

Container Insights reports CPU in two ways:

- **CpuUtilized** - The actual CPU units being used
- **CpuReserved** - The CPU units reserved (allocated) for the task

The ratio between these tells you your CPU utilization efficiency. If a task reserves 512 CPU units but only uses 100, you're over-provisioned.

```bash
# Get CPU utilization for a specific service over the last hour
aws cloudwatch get-metric-statistics \
  --namespace "ECS/ContainerInsights" \
  --metric-name CpuUtilized \
  --dimensions \
    Name=ClusterName,Value=production-cluster \
    Name=ServiceName,Value=backend-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Memory Metrics

Memory is often the constraint that catches people off guard. Watch these:

- **MemoryUtilized** - Actual memory usage in MB
- **MemoryReserved** - Reserved memory for the task

A task that consistently uses 90%+ of its reserved memory is a ticking time bomb. One traffic spike and you'll hit OOM errors. For debugging memory issues, check out our guide on [troubleshooting ECS out-of-memory errors](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ecs-out-of-memory-errors/view).

### Network Metrics

- **NetworkRxBytes** - Bytes received
- **NetworkTxBytes** - Bytes transmitted
- **NetworkRxPackets** / **NetworkTxPackets** - Packet counts

Network metrics are great for spotting unusual traffic patterns. A sudden spike in received bytes might indicate a traffic surge or a DDoS attempt.

### Task Count Metrics

- **RunningTaskCount** - How many tasks are currently running
- **DesiredTaskCount** - How many tasks should be running
- **PendingTaskCount** - Tasks that are pending placement

If `RunningTaskCount` is consistently below `DesiredTaskCount`, something is preventing tasks from starting. Could be resource constraints, image pull failures, or health check failures.

## Building a Container Insights Dashboard

The CloudWatch console has a built-in Container Insights dashboard, but you can also build custom dashboards. Here's a CloudFormation snippet for a dashboard that covers the essentials:

```json
{
  "Type": "AWS::CloudWatch::Dashboard",
  "Properties": {
    "DashboardName": "ECS-Production-Overview",
    "DashboardBody": {
      "widgets": [
        {
          "type": "metric",
          "properties": {
            "metrics": [
              ["ECS/ContainerInsights", "CpuUtilized", "ClusterName", "production-cluster", {"stat": "Average"}],
              ["ECS/ContainerInsights", "CpuReserved", "ClusterName", "production-cluster", {"stat": "Average"}]
            ],
            "title": "Cluster CPU Utilization",
            "period": 300,
            "view": "timeSeries"
          }
        },
        {
          "type": "metric",
          "properties": {
            "metrics": [
              ["ECS/ContainerInsights", "MemoryUtilized", "ClusterName", "production-cluster", {"stat": "Average"}],
              ["ECS/ContainerInsights", "MemoryReserved", "ClusterName", "production-cluster", {"stat": "Average"}]
            ],
            "title": "Cluster Memory Utilization",
            "period": 300,
            "view": "timeSeries"
          }
        },
        {
          "type": "metric",
          "properties": {
            "metrics": [
              ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", "production-cluster", {"stat": "Average"}],
              ["ECS/ContainerInsights", "PendingTaskCount", "ClusterName", "production-cluster", {"stat": "Average"}]
            ],
            "title": "Task Counts",
            "period": 60,
            "view": "timeSeries"
          }
        }
      ]
    }
  }
}
```

## Setting Up Alarms

Dashboards are great for visual monitoring, but you need alarms for automated alerting. Here are the most important ones:

```bash
# Alert when CPU utilization exceeds 80% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-HighCPU-BackendAPI" \
  --namespace "ECS/ContainerInsights" \
  --metric-name CpuUtilized \
  --dimensions Name=ClusterName,Value=production-cluster Name=ServiceName,Value=backend-api \
  --statistic Average \
  --period 300 \
  --threshold 410 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"

# Alert when memory is above 85% of reserved
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-HighMemory-BackendAPI" \
  --namespace "ECS/ContainerInsights" \
  --metric-name MemoryUtilized \
  --dimensions Name=ClusterName,Value=production-cluster Name=ServiceName,Value=backend-api \
  --statistic Average \
  --period 300 \
  --threshold 870 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

For more on CloudWatch alarms, see our guide on [creating CloudWatch metric alarms](https://oneuptime.com/blog/post/2026-02-12-create-cloudwatch-metric-alarms/view).

## Container-Level Metrics

One of the most powerful features of Container Insights is container-level visibility. If you're running sidecar containers, you can see exactly how much resources each container is consuming within a task.

This is invaluable for right-sizing. You might discover that your Envoy sidecar is using more memory than expected, or that your log router sidecar is consuming significant CPU during high-traffic periods.

To query container-level metrics, use CloudWatch Logs Insights on the `/aws/ecs/containerinsights/{cluster-name}/performance` log group:

```sql
-- Find the top 10 containers by memory usage
fields @timestamp, TaskId, ContainerName, CpuUtilized, MemoryUtilized
| filter Type = "Container"
| sort MemoryUtilized desc
| limit 10
```

```sql
-- Track memory growth over time for a specific service
fields @timestamp, MemoryUtilized, MemoryReserved
| filter Type = "Task" and ServiceName = "backend-api"
| stats avg(MemoryUtilized) as avg_mem by bin(5m)
| sort @timestamp asc
```

## Performance Log Groups

Container Insights stores detailed performance data in CloudWatch Logs. These log groups contain structured JSON data that you can query with Logs Insights:

- `/aws/ecs/containerinsights/{cluster}/performance` - Performance metrics
- Task-level, service-level, and cluster-level data all flow here

The log data is richer than the CloudWatch metrics alone. You can find specific task IDs, container names, and correlate performance data with application events.

## Cost Considerations

Container Insights isn't free. It generates CloudWatch metrics and logs, both of which have associated costs. For a cluster with hundreds of tasks, the additional CloudWatch costs can be noticeable.

To manage costs:
- Enable Container Insights only on clusters that need it
- Set appropriate log retention periods on the performance log groups
- Use metric filters instead of querying raw logs when possible
- Consider enabling it on staging/production but not on development clusters

## Wrapping Up

Container Insights transforms ECS monitoring from guesswork to data-driven decision making. You get visibility into every layer - from the cluster down to individual containers - without installing agents or modifying your applications.

Enable it on your production clusters, build dashboards for the key metrics, set up alarms for critical thresholds, and use Logs Insights queries for deep investigations. Your future self will thank you when you're troubleshooting an incident at 3 AM and you can actually see what's happening inside your containers.
