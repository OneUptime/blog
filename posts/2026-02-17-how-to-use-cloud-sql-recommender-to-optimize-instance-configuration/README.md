# How to Use Cloud SQL Recommender to Optimize Instance Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Recommender, Cost Optimization, Performance

Description: Learn how to use Cloud SQL Recommender to get actionable recommendations for right-sizing instances, improving performance, and reducing costs.

---

Most Cloud SQL instances are over-provisioned. You picked a machine type during setup, guessed at what you might need, and never went back to check. Cloud SQL Recommender analyzes your actual usage patterns and gives you specific recommendations to right-size instances, fix performance issues, and reduce costs. This guide shows how to access, interpret, and act on those recommendations.

## What Cloud SQL Recommender Provides

Cloud SQL Recommender analyzes your instance metrics over time and generates recommendations in several categories:

- **Machine type right-sizing**: Scale up or down based on actual CPU and memory usage
- **Storage right-sizing**: Reduce over-provisioned storage
- **High availability**: Enable HA for unprotected production instances
- **Backup configuration**: Improve backup settings
- **Idle instance detection**: Identify instances with no connections
- **Performance improvements**: Suggest flag changes and configuration adjustments

Each recommendation includes an estimated cost impact, priority level, and the specific change to make.

## Enabling the Recommender API

```bash
# Enable the Recommender API
gcloud services enable recommender.googleapis.com
```

You also need the `roles/recommender.viewer` role (or broader) to view recommendations:

```bash
# Grant recommender viewer role
gcloud projects add-iam-policy-binding my-project \
    --member="user:you@example.com" \
    --role="roles/recommender.viewer"
```

## Viewing Recommendations via gcloud

List all Cloud SQL recommendations for your project:

```bash
# List Cloud SQL instance performance recommendations
gcloud recommender recommendations list \
    --recommender=google.cloudsql.instance.PerformanceRecommender \
    --location=us-central1 \
    --project=my-project \
    --format="table(name, recommenderSubtype, priority, content.overview)"
```

For cost recommendations:

```bash
# List Cloud SQL cost optimization recommendations
gcloud recommender recommendations list \
    --recommender=google.cloudsql.instance.CostRecommender \
    --location=us-central1 \
    --project=my-project \
    --format="table(name, recommenderSubtype, priority, content.overview)"
```

For idle instance recommendations:

```bash
# List idle Cloud SQL instance recommendations
gcloud recommender recommendations list \
    --recommender=google.cloudsql.instance.IdleRecommender \
    --location=us-central1 \
    --project=my-project \
    --format="table(name, recommenderSubtype, priority, content.overview)"
```

## Viewing Recommendations in the Console

The easiest way to see recommendations is in the Cloud Console:

1. Go to **SQL** in the left navigation
2. Click on your instance
3. Look for the **Recommendations** banner at the top of the instance page
4. Or go to the **Recommendations Hub** from the main navigation

The Console view shows:

- A summary of potential cost savings
- Priority-ranked list of recommendations
- One-click application for some recommendations

## Understanding Recommendation Types

### Under-Provisioned Instance

This recommendation appears when your instance consistently runs close to or above resource limits:

```
Recommendation: Upgrade machine type
Current: db-custom-2-8192 (2 vCPUs, 8 GB RAM)
Suggested: db-custom-4-16384 (4 vCPUs, 16 GB RAM)
Reason: CPU utilization averaged 85% over the past 30 days
Impact: Improved query performance, reduced risk of CPU throttling
```

To apply:

```bash
# Apply the machine type upgrade recommendation
gcloud sql instances patch my-instance \
    --tier=db-custom-4-16384
```

### Over-Provisioned Instance

The most common recommendation. Your instance has more resources than it uses:

```
Recommendation: Downsize machine type
Current: db-custom-8-32768 (8 vCPUs, 32 GB RAM)
Suggested: db-custom-4-16384 (4 vCPUs, 16 GB RAM)
Reason: CPU utilization averaged 15% over the past 30 days
              Memory utilization averaged 25%
Estimated savings: $300/month
```

Before applying, verify that peak usage (not just average) fits the smaller tier:

```bash
# Check peak CPU utilization over the past 30 days
gcloud monitoring read \
    --resource-type=cloudsql_database \
    --metric-type=cloudsql.googleapis.com/database/cpu/utilization \
    --filter='resource.labels.database_id="my-project:my-instance"' \
    --start-time="-30d" \
    --aggregation-alignment-period=3600s \
    --aggregation-per-series-aligner=ALIGN_MAX
```

If peak CPU stays under 60% of the suggested tier, it is safe to downsize.

### Idle Instance

Instances with zero or near-zero connections over an extended period:

```
Recommendation: Delete idle instance
Instance: staging-db-old
Reason: No connections in the past 14 days
Estimated savings: $150/month
```

Before deleting, verify it is truly unused:

```bash
# Check recent connections
gcloud sql instances describe staging-db-old \
    --format="json(settings.tier, state)"

# Check connection count from Cloud Monitoring
gcloud monitoring read \
    --resource-type=cloudsql_database \
    --metric-type=cloudsql.googleapis.com/database/network/connections \
    --filter='resource.labels.database_id="my-project:staging-db-old"' \
    --start-time="-30d"
```

If it is genuinely idle, create a final backup before deleting:

```bash
# Create a final backup
gcloud sql backups create --instance=staging-db-old \
    --description="Final backup before deletion"

# Export data to Cloud Storage for archival
gcloud sql export sql staging-db-old \
    gs://my-backups/staging-db-old-final.sql \
    --database=mydb

# Delete the instance
gcloud sql instances delete staging-db-old
```

### Enable High Availability

For production instances without HA:

```
Recommendation: Enable high availability
Instance: production-db
Reason: Instance handles production traffic but has no failover capability
Impact: Approximately $300/month additional cost, but protects against zone failures
```

```bash
# Enable HA as recommended
gcloud sql instances patch production-db \
    --availability-type=REGIONAL
```

## Automating Recommendation Review

Set up a regular review of recommendations using a Cloud Function or script:

```python
# Script to list and summarize Cloud SQL recommendations
from google.cloud import recommender_v1

def list_recommendations():
    """List all Cloud SQL recommendations for the project."""
    client = recommender_v1.RecommenderClient()

    # Check multiple recommender types
    recommender_types = [
        "google.cloudsql.instance.CostRecommender",
        "google.cloudsql.instance.PerformanceRecommender",
        "google.cloudsql.instance.IdleRecommender",
    ]

    project = "my-project"
    location = "us-central1"

    for recommender_type in recommender_types:
        parent = (
            f"projects/{project}/locations/{location}"
            f"/recommenders/{recommender_type}"
        )

        recommendations = client.list_recommendations(parent=parent)

        for rec in recommendations:
            print(f"\nRecommender: {recommender_type}")
            print(f"  Priority: {rec.priority}")
            print(f"  State: {rec.state_info.state}")
            print(f"  Description: {rec.description}")
            if rec.primary_impact.cost_projection:
                cost = rec.primary_impact.cost_projection.cost
                print(f"  Estimated savings: ${abs(cost.units)}/month")

if __name__ == "__main__":
    list_recommendations()
```

## Acting on Recommendations

### Marking Recommendations

After reviewing a recommendation, mark it:

```bash
# Mark a recommendation as claimed (you plan to act on it)
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
    --recommender=google.cloudsql.instance.CostRecommender \
    --location=us-central1 \
    --project=my-project \
    --etag=RECOMMENDATION_ETAG \
    --state-metadata=reviewed-by=your-name

# Mark as succeeded after applying
gcloud recommender recommendations mark-succeeded RECOMMENDATION_ID \
    --recommender=google.cloudsql.instance.CostRecommender \
    --location=us-central1 \
    --project=my-project \
    --etag=RECOMMENDATION_ETAG

# Or dismiss if you decide not to act
gcloud recommender recommendations mark-dismissed RECOMMENDATION_ID \
    --recommender=google.cloudsql.instance.CostRecommender \
    --location=us-central1 \
    --project=my-project \
    --etag=RECOMMENDATION_ETAG
```

### Safe Application Process

Follow this process when applying recommendations:

1. **Review the recommendation** and understand the change
2. **Check peak usage**, not just average - the recommender uses averages
3. **Test in staging first** if possible
4. **Create a backup** before making changes
5. **Apply during low-traffic hours** for changes that require a restart
6. **Monitor after the change** to confirm the instance performs correctly

```bash
# Example: Safe downsizing workflow

# 1. Check current and recommended tiers
gcloud sql instances describe my-instance --format="value(settings.tier)"

# 2. Create a pre-change backup
gcloud sql backups create --instance=my-instance \
    --description="Pre-resize backup"

# 3. Apply the change during off-peak hours
gcloud sql instances patch my-instance \
    --tier=db-custom-4-16384

# 4. Monitor the instance for the next 24 hours
watch -n 60 "gcloud monitoring read \
    --resource-type=cloudsql_database \
    --metric-type=cloudsql.googleapis.com/database/cpu/utilization \
    --filter='resource.labels.database_id=\"my-project:my-instance\"' \
    --start-time='-1h' \
    --format='table(timeSeries.points.value.doubleValue)'"
```

## Insights (Complementary to Recommendations)

Cloud SQL Recommender also provides insights - observations about your instance that may not have specific action items:

```bash
# List insights for Cloud SQL instances
gcloud recommender insights list \
    --insight-type=google.cloudsql.instance.CostInsight \
    --location=us-central1 \
    --project=my-project \
    --format="table(name, insightSubtype, severity, description)"
```

Insights might include:

- "This instance's CPU utilization has been increasing steadily for the past 3 months"
- "This instance has 500 GB of storage but only uses 50 GB"
- "This instance's backup storage costs exceed the instance cost"

## Cost Optimization Report

Create a comprehensive cost optimization report for all your Cloud SQL instances:

```bash
#!/bin/bash
# cost-optimization-report.sh - Generate a Cloud SQL optimization report

echo "=== Cloud SQL Cost Optimization Report ==="
echo "Date: $(date)"
echo ""

# List all instances with their tiers and costs
echo "Current Instances:"
gcloud sql instances list \
    --format="table(name, region, settings.tier, settings.availabilityType, state)"

echo ""
echo "=== Cost Recommendations ==="
for region in us-central1 europe-west1 asia-east1; do
    echo ""
    echo "Region: ${region}"
    gcloud recommender recommendations list \
        --recommender=google.cloudsql.instance.CostRecommender \
        --location=${region} \
        --format="table(content.overview.instanceName, recommenderSubtype, priority)" \
        2>/dev/null || echo "  No recommendations"
done

echo ""
echo "=== Idle Instances ==="
for region in us-central1 europe-west1 asia-east1; do
    gcloud recommender recommendations list \
        --recommender=google.cloudsql.instance.IdleRecommender \
        --location=${region} \
        --format="table(content.overview.instanceName, recommenderSubtype)" \
        2>/dev/null || true
done

echo ""
echo "=== Performance Recommendations ==="
for region in us-central1 europe-west1 asia-east1; do
    gcloud recommender recommendations list \
        --recommender=google.cloudsql.instance.PerformanceRecommender \
        --location=${region} \
        --format="table(content.overview.instanceName, recommenderSubtype, priority)" \
        2>/dev/null || true
done
```

## Best Practices

1. **Review recommendations weekly**. Make it part of your team's operational routine.

2. **Do not blindly follow recommendations**. The recommender uses averages, which can miss traffic spikes or seasonal patterns.

3. **Start with the highest-priority recommendations**. They offer the best return on effort.

4. **Track savings**. After applying recommendations, note the before and after costs to quantify the impact.

5. **Set up alerts for new recommendations**. Use Cloud Monitoring to notify you when new recommendations appear.

6. **Consider the full picture**. A recommendation to downsize might save money but leave no headroom for traffic growth.

## Summary

Cloud SQL Recommender takes the guesswork out of instance sizing by analyzing your actual usage patterns. Access recommendations through the gcloud CLI, the Console, or the API. Focus on right-sizing over-provisioned instances for the quickest wins, delete idle instances to eliminate waste, and address performance recommendations to prevent issues before they impact users. Always verify recommendations against peak usage patterns before applying them, and monitor your instances after making changes.
