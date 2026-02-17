# How to Optimize Compute Engine Costs by Rightsizing VM Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Rightsizing, Cost Optimization, Google Cloud

Description: Learn how to identify over-provisioned VMs on Google Cloud and rightsize them to cut compute costs without sacrificing performance.

---

One of the most common ways teams waste money on Google Cloud is running VMs that are larger than they need to be. It is natural to over-provision when you are setting up infrastructure - nobody wants to be the person who under-sized a production server and caused an outage. But that extra safety margin adds up fast, and in many cases, VMs are running at 10-20% CPU utilization around the clock.

Rightsizing is the process of matching your VM resources to your actual workload needs. Google Cloud gives you tools to identify over-provisioned instances and recommends better sizes. This guide walks through the entire process.

## The Cost of Over-Provisioning

Consider a common scenario. Your team provisions n2-standard-8 instances (8 vCPUs, 32 GB RAM) for your application servers because "we might need the headroom." After a few months in production, average CPU utilization sits at 15% and memory usage hovers around 8 GB.

You could run the same workload on n2-standard-2 (2 vCPUs, 8 GB RAM) instances and save 75% on those VMs. Multiply that across 20 instances and you are looking at significant monthly savings.

## Step 1: Check the Rightsizing Recommendations

Google Cloud automatically generates rightsizing recommendations based on your VM usage patterns over the past eight days. These recommendations show up in two places.

### In the Cloud Console

Go to Compute Engine and click on "VM instances." You will see a column called "Recommendations" that flags instances with sizing suggestions. You can also find them under the Recommendations Hub.

### Using the gcloud CLI

Pull rightsizing recommendations programmatically:

```bash
# List rightsizing recommendations for a specific project and zone
gcloud recommender recommendations list \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=us-central1-a \
  --project=my-project \
  --format="table(content.operationGroups[0].operations[0].resource, \
    content.operationGroups[0].operations[0].value.machineType, \
    primaryImpact.costProjection.cost.units)"
```

This command shows you which VMs have recommendations, what machine type they should be changed to, and the estimated cost impact.

## Step 2: Analyze VM Utilization Yourself

While Google's recommendations are helpful, you should also do your own analysis. The recommendations only look at eight days of data, which might not capture your full usage pattern, especially if your workload has weekly or monthly cycles.

### Using Cloud Monitoring

Cloud Monitoring collects CPU, memory, and disk metrics for all your VMs. You can build a dashboard or run MQL queries to find underutilized instances.

Here is a Monitoring Query Language (MQL) query to find VMs with average CPU utilization below 20% over the past 30 days:

```
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| group_by [resource.instance_id], 30d, [avg_utilization: mean(val())]
| filter avg_utilization < 0.2
```

### Using BigQuery with Billing Export

If you have billing export enabled, you can correlate cost data with utilization:

```sql
-- Find VMs with high cost but low utilization
-- Requires billing export and monitoring metrics export
SELECT
  labels.value AS instance_name,
  SUM(cost) AS monthly_cost,
  AVG(usage.amount_in_pricing_units) AS avg_usage
FROM
  `my-project.billing_export.gcp_billing_export_v1_*`
WHERE
  service.description = 'Compute Engine'
  AND sku.description LIKE '%Instance Core%'
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  instance_name
HAVING
  monthly_cost > 50
ORDER BY
  monthly_cost DESC
```

## Step 3: Choose the Right Machine Type

GCP offers several machine families, and picking the right one is part of rightsizing:

- **E2**: Cost-optimized, good for small to medium workloads. Has built-in resource sharing.
- **N2/N2D**: Balanced performance and cost. Good general-purpose choice.
- **C2/C2D**: Compute-optimized for CPU-intensive workloads.
- **M2/M3**: Memory-optimized for in-memory databases and analytics.
- **T2D**: Tau VMs for scale-out workloads with consistent performance needs.

If your VM is running a web server that peaks at 40% CPU, an E2 instance might give you the same performance at a lower price than an N2.

### Custom Machine Types

One of GCP's best features for rightsizing is custom machine types. Instead of picking from predefined sizes, you can specify the exact number of vCPUs and amount of memory you need:

```bash
# Create a VM with a custom machine type - 4 vCPUs and 10 GB RAM
gcloud compute instances create my-optimized-vm \
  --zone=us-central1-a \
  --machine-type=n2-custom-4-10240 \
  --image-family=debian-11 \
  --image-project=debian-cloud
```

This avoids paying for 16 GB of RAM when you only need 10 GB.

## Step 4: Implement the Changes

Once you have identified which VMs to resize, here is how to do it safely.

### Resize a Running VM

You need to stop the VM first, then change the machine type:

```bash
# Stop the VM
gcloud compute instances stop my-vm --zone=us-central1-a

# Change the machine type
gcloud compute instances set-machine-type my-vm \
  --zone=us-central1-a \
  --machine-type=n2-standard-2

# Start the VM back up
gcloud compute instances start my-vm --zone=us-central1-a
```

### Automate Rightsizing with a Script

For multiple VMs, you can script the process. This script applies rightsizing recommendations automatically:

```bash
#!/bin/bash
# Script to apply rightsizing recommendations for a given zone

PROJECT="my-project"
ZONE="us-central1-a"

# Get recommendations in JSON format
RECOMMENDATIONS=$(gcloud recommender recommendations list \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=$ZONE \
  --project=$PROJECT \
  --format=json)

# Process each recommendation
echo "$RECOMMENDATIONS" | jq -r '.[] | .content.operationGroups[0].operations[0] |
  "\(.resource) \(.value.machineType)"' | while read -r RESOURCE NEW_TYPE; do

  # Extract instance name from resource path
  INSTANCE_NAME=$(basename "$RESOURCE")

  echo "Resizing $INSTANCE_NAME to $NEW_TYPE"

  # Stop, resize, start
  gcloud compute instances stop "$INSTANCE_NAME" --zone="$ZONE" --quiet
  gcloud compute instances set-machine-type "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --machine-type="$NEW_TYPE"
  gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"
done
```

## Step 5: Monitor After Resizing

After rightsizing, keep a close eye on performance metrics for at least two weeks. Watch for:

- CPU utilization spikes that approach 100%
- Increased response latency
- Out-of-memory errors in application logs
- Disk I/O bottlenecks

If you see degradation, you can always resize back up. That is the beauty of cloud - changes are reversible.

## Building a Rightsizing Culture

Rightsizing should not be a one-time exercise. Make it part of your regular operations:

1. **Monthly reviews** - Set a calendar reminder to check rightsizing recommendations every month.

2. **Automated reporting** - Build a Cloud Function that runs monthly, pulls recommendations, and emails the results to team leads.

3. **Pre-launch sizing** - Before deploying new services, run load tests to determine the actual resource requirements instead of guessing.

4. **Use managed instance groups** - MIGs with autoscaling let you start small and scale up based on demand, rather than pre-provisioning for peak.

```bash
# Create an autoscaling managed instance group
gcloud compute instance-groups managed set-autoscaling my-mig \
  --zone=us-central1-a \
  --max-num-replicas=10 \
  --min-num-replicas=2 \
  --target-cpu-utilization=0.6 \
  --cool-down-period=90
```

## Common Mistakes to Avoid

- **Rightsizing based on a single day's data** - Look at at least 30 days to capture weekly patterns.
- **Ignoring memory metrics** - CPU is not the only dimension. Some workloads are memory-bound.
- **Not accounting for traffic spikes** - If you have predictable spikes (like end-of-month processing), make sure your rightsized instances can handle them, or set up autoscaling.
- **Resizing without testing** - Always test the new size in a staging environment before applying to production.

## Wrapping Up

Rightsizing is the lowest-hanging fruit in cloud cost optimization. Most teams can save 20-40% on their Compute Engine bill just by matching VM sizes to actual usage. Google Cloud's built-in recommendations make it easy to identify the opportunities, and custom machine types give you the flexibility to pick exactly the resources you need. Make it a habit, not a one-time project, and the savings compound over time.
