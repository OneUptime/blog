# How to Use the GCP Recommendations Hub to Identify Cost Savings Opportunities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations Hub, Cost Optimization, Google Cloud, FinOps

Description: Learn how to use the GCP Recommendations Hub to find and act on cost savings opportunities across your Google Cloud infrastructure.

---

Google Cloud analyzes your resource usage patterns and generates recommendations to help you save money, improve performance, and strengthen security. The Recommendations Hub is where all of these suggestions live in one place. Instead of manually auditing every VM, disk, and database, you can let Google's machine learning do the heavy lifting and point you to the biggest opportunities.

This guide covers how to navigate the Recommendations Hub, understand the different recommendation types, and build a workflow for regularly acting on them.

## What Is the Recommendations Hub?

The Recommendations Hub is a centralized console in GCP that aggregates recommendations from multiple services. It pulls in suggestions from various recommenders, including:

- **VM rightsizing** - Suggests smaller machine types for underutilized VMs
- **Idle resource cleanup** - Identifies VMs, disks, and IP addresses that are not being used
- **Committed use discounts** - Recommends CUD purchases based on your usage patterns
- **Unattended project cleanup** - Flags projects with no activity
- **IAM recommendations** - Suggests removing unused permissions
- **Network and firewall** - Identifies overly permissive firewall rules

Each recommendation includes an estimated cost impact, so you can prioritize the ones with the biggest savings.

## Accessing the Recommendations Hub

### Through the Console

Navigate to the Recommendations Hub by searching for "Recommendations" in the Cloud Console search bar, or go to the left navigation menu and find it under "Recommendations."

The dashboard shows a summary of all recommendations organized by category (Cost, Security, Performance, Manageability) along with the total estimated savings.

### Through the gcloud CLI

You can also pull recommendations programmatically:

```bash
# List all available recommenders
gcloud recommender recommenders list --format="table(name)"

# List cost recommendations for Compute Engine rightsizing
gcloud recommender recommendations list \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=us-central1-a \
  --project=my-project \
  --format="table(name, primaryImpact.costProjection.cost, stateInfo.state)"
```

To get recommendations across all zones in a region, you need to iterate:

```bash
# Script to get rightsizing recommendations across all zones
#!/bin/bash
PROJECT="my-project"
REGION="us-central1"

for ZONE in $(gcloud compute zones list --filter="region=$REGION" --format="value(name)"); do
  echo "=== Zone: $ZONE ==="
  gcloud recommender recommendations list \
    --recommender=google.compute.instance.MachineTypeRecommender \
    --location=$ZONE \
    --project=$PROJECT \
    --format="table(
      content.operationGroups[0].operations[0].resource,
      content.operationGroups[0].operations[0].value.machineType,
      primaryImpact.costProjection.cost.units,
      stateInfo.state)" 2>/dev/null
done
```

## Types of Cost Recommendations

### 1. VM Rightsizing

The most common and often most impactful recommendation. Google monitors CPU and memory utilization over an eight-day window and suggests smaller machine types for VMs that are consistently underutilized.

```bash
# Get detailed rightsizing recommendation
gcloud recommender recommendations describe RECOMMENDATION_ID \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=us-central1-a \
  --project=my-project
```

### 2. Idle VM Identification

VMs that have had near-zero CPU utilization for an extended period get flagged as idle:

```bash
# List idle VM recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.instance.IdleResourceRecommender \
  --location=us-central1-a \
  --project=my-project \
  --format="table(
    content.operationGroups[0].operations[0].resource,
    primaryImpact.costProjection.cost.units)"
```

### 3. Idle Persistent Disks

Disks that are not attached to any VM are costing you money for no reason:

```bash
# Find idle persistent disk recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.disk.IdleResourceRecommender \
  --location=us-central1-a \
  --project=my-project
```

### 4. Idle External IP Addresses

Static IP addresses that are reserved but not attached to a resource cost $0.01/hour ($7.30/month each):

```bash
# Find idle IP address recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.address.IdleResourceRecommender \
  --location=us-central1 \
  --project=my-project
```

### 5. CUD Recommendations

Based on your steady-state usage, Google recommends committed use discount purchases:

```bash
# Get CUD purchase recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.commitment.UsageCommitmentRecommender \
  --location=us-central1 \
  --project=my-project
```

## Acting on Recommendations

Each recommendation has a state: ACTIVE, CLAIMED, SUCCEEDED, or FAILED. Here is the workflow:

### Mark a Recommendation as Claimed

When you start working on a recommendation, mark it as claimed so others know it is being addressed:

```bash
# Claim a recommendation
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=us-central1-a \
  --project=my-project \
  --etag=ETAG_VALUE \
  --state-metadata=reviewer=your-name
```

### Apply the Recommendation

For VM rightsizing, this means stopping the VM, changing the machine type, and starting it again:

```bash
# Apply a rightsizing recommendation
INSTANCE_NAME="my-underutilized-vm"
ZONE="us-central1-a"
NEW_TYPE="e2-standard-2"

# Stop the instance
gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE

# Change machine type
gcloud compute instances set-machine-type $INSTANCE_NAME \
  --zone=$ZONE \
  --machine-type=$NEW_TYPE

# Start the instance
gcloud compute instances start $INSTANCE_NAME --zone=$ZONE
```

### Mark as Succeeded

After applying, update the recommendation state:

```bash
# Mark recommendation as succeeded
gcloud recommender recommendations mark-succeeded RECOMMENDATION_ID \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --location=us-central1-a \
  --project=my-project \
  --etag=ETAG_VALUE
```

## Building an Automated Recommendations Pipeline

For organizations with many projects, manually checking recommendations does not scale. Here is how to automate the process.

### Export Recommendations to BigQuery

Use a Cloud Function on a schedule to export all recommendations:

```python
# Cloud Function to export recommendations to BigQuery
from google.cloud import recommender_v1
from google.cloud import bigquery
import datetime

def export_recommendations(event, context):
    """Export all cost recommendations to BigQuery."""
    recommender_client = recommender_v1.RecommenderClient()
    bq_client = bigquery.Client()

    # Define recommenders to check
    recommenders = [
        "google.compute.instance.MachineTypeRecommender",
        "google.compute.instance.IdleResourceRecommender",
        "google.compute.disk.IdleResourceRecommender",
        "google.compute.address.IdleResourceRecommender",
    ]

    project_id = "my-project"
    zones = ["us-central1-a", "us-central1-b", "us-central1-c"]
    rows = []

    for recommender_id in recommenders:
        for zone in zones:
            parent = (
                f"projects/{project_id}/locations/{zone}"
                f"/recommenders/{recommender_id}"
            )
            try:
                recommendations = recommender_client.list_recommendations(
                    parent=parent
                )
                for rec in recommendations:
                    rows.append({
                        "timestamp": datetime.datetime.utcnow().isoformat(),
                        "project": project_id,
                        "zone": zone,
                        "recommender": recommender_id,
                        "recommendation_id": rec.name,
                        "state": rec.state_info.state.name,
                        "description": rec.description,
                        "cost_savings": str(
                            rec.primary_impact.cost_projection.cost.units
                        ) if rec.primary_impact.cost_projection else "0",
                    })
            except Exception as e:
                print(f"Error fetching {recommender_id} for {zone}: {e}")

    # Insert rows into BigQuery
    if rows:
        table_ref = bq_client.dataset("cost_optimization").table(
            "recommendations"
        )
        errors = bq_client.insert_rows_json(table_ref, rows)
        if errors:
            print(f"BigQuery insert errors: {errors}")
        else:
            print(f"Inserted {len(rows)} recommendations")
```

### Create a Dashboard

Use Looker Studio or a similar tool to visualize recommendations over time. Track metrics like:

- Total estimated savings available
- Number of open recommendations by category
- Recommendations resolved per month
- Time from recommendation to resolution

## Prioritizing Recommendations

Not all recommendations deserve immediate action. Here is a framework for prioritization:

1. **High impact, low effort** - Idle resources that can be deleted, unused IP addresses. Do these first.
2. **High impact, medium effort** - VM rightsizing for non-production environments. Schedule these for maintenance windows.
3. **High impact, high effort** - CUD purchases that require financial approval. Start the process but expect it to take time.
4. **Low impact** - Small savings that might not be worth the operational risk. Review but do not rush.

## Best Practices

1. **Check recommendations weekly** - Make it part of your team's routine. Assign someone to review recommendations every Monday.

2. **Start with idle resources** - These are the safest recommendations. If something is idle, deleting it is usually risk-free (after confirming with the owner).

3. **Use insights alongside recommendations** - Insights provide the data behind recommendations. Review the insights to understand why a recommendation was made before acting on it.

4. **Track savings over time** - Record the savings from each recommendation you apply. This helps justify the time spent on cost optimization.

5. **Combine with budgets and alerts** - Recommendations tell you where to save. Budgets tell you if you are on track. Use both together.

## Wrapping Up

The Recommendations Hub is free and already analyzing your infrastructure. The recommendations are based on your actual usage data and can collectively save 20-40% on your cloud bill. The hardest part is building the habit of checking and acting on them regularly. Start with a weekly review cadence, prioritize the quick wins, and build automation as your optimization practice matures.
