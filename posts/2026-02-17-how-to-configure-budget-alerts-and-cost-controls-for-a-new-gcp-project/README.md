# How to Configure Budget Alerts and Cost Controls for a New GCP Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Budget Alerts, Cost Management, Billing, FinOps, Cost Controls

Description: Set up budget alerts, cost controls, and spending limits for a new GCP project to prevent unexpected charges and maintain visibility into cloud spending from day one.

---

Nothing ruins a cloud project faster than an unexpected bill. I have seen teams spin up resources for testing, forget to clean them up, and end up with a five-figure surprise at the end of the month. The fix is straightforward - set up budget alerts and cost controls before you deploy anything. It takes 15 minutes and can save you thousands.

Here is how to configure billing controls for a new GCP project.

## Understanding GCP Billing

GCP billing works through billing accounts. A billing account is linked to one or more projects, and all resource charges for those projects are billed to that account. You can set budgets at the billing account level (covering all projects) or filter budgets to specific projects.

Key concepts:
- **Billing account**: The payment method and entity that pays for resource usage
- **Budget**: A spending target with alert thresholds
- **Budget alert**: A notification when spending exceeds a threshold
- **Billing export**: Raw billing data exported to BigQuery for analysis

## Step 1: Create Budget Alerts

Create a budget with multiple alert thresholds to get progressively urgent notifications:

```bash
# Create a budget for a specific project with multiple thresholds
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Production Project Budget" \
  --budget-amount=1000 \
  --filter-projects="projects/my-project" \
  --threshold-rule=percent=0.5,basis=current-spend \
  --threshold-rule=percent=0.75,basis=current-spend \
  --threshold-rule=percent=0.9,basis=current-spend \
  --threshold-rule=percent=1.0,basis=current-spend \
  --threshold-rule=percent=1.2,basis=current-spend \
  --all-updates-rule-monitoring-notification-channels=CHANNEL_ID
```

This creates alerts at 50%, 75%, 90%, 100%, and 120% of the $1,000 budget. The 120% threshold catches cases where spending continues after hitting the budget.

You can also set budgets based on the previous month's spend:

```bash
# Create a budget that alerts based on last month's actual spend
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Month-over-Month Spending Alert" \
  --last-period-amount \
  --filter-projects="projects/my-project" \
  --threshold-rule=percent=1.1,basis=current-spend \
  --threshold-rule=percent=1.25,basis=current-spend \
  --all-updates-rule-monitoring-notification-channels=CHANNEL_ID
```

This alerts when spending exceeds last month by 10% or 25%.

## Step 2: Set Up Billing Export to BigQuery

Export billing data to BigQuery for detailed cost analysis:

```bash
# Create a dataset for billing data
bq mk --dataset \
  --description="GCP billing data export" \
  --location=US \
  my-project:billing_data

# Enable billing export in the console:
# Billing > Billing export > BigQuery export
# Select the dataset and enable both Standard and Detailed usage cost exports
```

Once the export is running, you can query your costs:

```sql
-- Find the top 10 most expensive services this month
SELECT
  service.description AS service,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(cost) / (SELECT SUM(cost) FROM `billing_data.gcp_billing_export_v1_*` WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())) * 100, 1) AS percentage
FROM `billing_data.gcp_billing_export_v1_*`
WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())
GROUP BY service
ORDER BY total_cost DESC
LIMIT 10;

-- Find daily spending trend
SELECT
  DATE(usage_start_time) AS date,
  ROUND(SUM(cost), 2) AS daily_cost
FROM `billing_data.gcp_billing_export_v1_*`
WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date;

-- Find the most expensive individual resources
SELECT
  service.description AS service,
  sku.description AS sku,
  resource.name AS resource_name,
  ROUND(SUM(cost), 2) AS cost
FROM `billing_data.gcp_billing_export_v1_*`
WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())
  AND cost > 0
GROUP BY service, sku, resource_name
ORDER BY cost DESC
LIMIT 20;
```

## Step 3: Automate Cost Control Actions

Budget alerts alone do not stop spending. To actually limit costs, set up automated responses:

### Automated Resource Shutdown

Create a Cloud Function that responds to budget alerts and shuts down non-critical resources:

```python
# cost_control.py - Cloud Function triggered by budget alerts via Pub/Sub
import base64
import json
import logging
from google.cloud import compute_v1
from google.cloud import billing_v1

def handle_budget_alert(event, context):
    """Respond to budget alert notifications."""
    pubsub_data = json.loads(base64.b64decode(event['data']).decode('utf-8'))

    cost_amount = pubsub_data.get('costAmount', 0)
    budget_amount = pubsub_data.get('budgetAmount', 0)

    if budget_amount == 0:
        return

    percentage = (cost_amount / budget_amount) * 100
    logging.info(f'Budget alert: {percentage:.1f}% consumed (${cost_amount} of ${budget_amount})')

    # At 90%: Stop non-production instances
    if percentage >= 90:
        stop_tagged_instances('environment', 'development')
        logging.warning(f'Stopped development instances at {percentage:.1f}% budget consumption')

    # At 100%: Disable billing on the project (nuclear option)
    if percentage >= 120:
        logging.critical(f'Budget exceeded by 20% - consider disabling billing')
        # Uncomment the line below to actually disable billing
        # disable_billing(pubsub_data.get('budgetDisplayName', ''))


def stop_tagged_instances(label_key, label_value):
    """Stop all instances with a specific label."""
    client = compute_v1.InstancesClient()

    # List all instances across all zones
    request = compute_v1.AggregatedListInstancesRequest(
        project='my-project',
        filter=f'labels.{label_key}={label_value}'
    )

    for zone, response in client.aggregated_list(request=request):
        if response.instances:
            for instance in response.instances:
                if instance.status == 'RUNNING':
                    zone_name = zone.split('/')[-1]
                    client.stop(
                        project='my-project',
                        zone=zone_name,
                        instance=instance.name
                    )
                    logging.info(f'Stopped instance {instance.name} in {zone_name}')
```

Deploy the function:

```bash
# Create a Pub/Sub topic for budget alerts
gcloud pubsub topics create budget-alerts

# Deploy the cost control function
gcloud functions deploy handle-budget-alert \
  --runtime=python311 \
  --trigger-topic=budget-alerts \
  --entry-point=handle_budget_alert \
  --region=us-central1

# Update the budget to publish to the Pub/Sub topic
gcloud billing budgets update BUDGET_ID \
  --billing-account=BILLING_ACCOUNT_ID \
  --all-updates-rule-pubsub-topic=projects/my-project/topics/budget-alerts
```

## Step 4: Set Up Cost-Saving Practices

### Use Labels for Cost Allocation

Labels help you track costs by team, environment, or application:

```bash
# Label all resources consistently
gcloud compute instances update my-vm \
  --zone=us-central1-a \
  --update-labels="environment=production,team=platform,cost-center=eng-001"

gcloud sql instances patch my-database \
  --update-labels="environment=production,team=platform"

gcloud storage buckets update gs://my-bucket \
  --update-labels="environment=production,team=data"
```

Query costs by label in BigQuery:

```sql
-- Cost breakdown by team label
SELECT
  (SELECT value FROM UNNEST(labels) WHERE key = 'team') AS team,
  ROUND(SUM(cost), 2) AS total_cost
FROM `billing_data.gcp_billing_export_v1_*`
WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())
GROUP BY team
ORDER BY total_cost DESC;
```

### Schedule Development Resource Cleanup

Development resources should not run 24/7. Schedule them to stop outside business hours:

```bash
# Create a Cloud Scheduler job to stop dev instances at 7 PM
gcloud scheduler jobs create http stop-dev-instances \
  --schedule="0 19 * * 1-5" \
  --uri="https://us-central1-my-project.cloudfunctions.net/stop-dev-instances" \
  --http-method=POST \
  --time-zone="America/New_York" \
  --oidc-service-account-email=scheduler@my-project.iam.gserviceaccount.com

# Create a Cloud Scheduler job to start dev instances at 8 AM
gcloud scheduler jobs create http start-dev-instances \
  --schedule="0 8 * * 1-5" \
  --uri="https://us-central1-my-project.cloudfunctions.net/start-dev-instances" \
  --http-method=POST \
  --time-zone="America/New_York" \
  --oidc-service-account-email=scheduler@my-project.iam.gserviceaccount.com
```

### Use Committed Use Discounts

For predictable workloads, committed use discounts save 37-57% compared to on-demand pricing:

```bash
# Purchase a committed use discount for Compute Engine
# This commits to a specific machine type for 1 or 3 years
gcloud compute commitments create my-commitment \
  --plan=twelve-month \
  --resources=vcpu=8,memory=32GB \
  --region=us-central1 \
  --type=GENERAL_PURPOSE
```

### Recommendations API

Use the Recommender API to find cost-saving opportunities:

```bash
# Get VM right-sizing recommendations
gcloud recommender recommendations list \
  --project=my-project \
  --location=us-central1-a \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --format="table(name, description, primaryImpact.costProjection)"

# Get idle resource recommendations
gcloud recommender recommendations list \
  --project=my-project \
  --location=us-central1-a \
  --recommender=google.compute.instance.IdleResourceRecommender
```

## Step 5: Create a Cost Dashboard

Build a monitoring dashboard for cost visibility:

```bash
# Create a billing metrics dashboard
gcloud monitoring dashboards create --config-from-file=/dev/stdin << 'DASHBOARD'
{
  "displayName": "Cost and Billing Overview",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "Daily Estimated Charges",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"billing.googleapis.com/billing/gcp/charges\" resource.type=\"global\"",
                "aggregation": {
                  "alignmentPeriod": "86400s",
                  "perSeriesAligner": "ALIGN_SUM",
                  "crossSeriesReducer": "REDUCE_SUM",
                  "groupByFields": ["metric.label.service"]
                }
              }
            },
            "plotType": "STACKED_BAR"
          }]
        }
      },
      {
        "title": "Budget Utilization",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"billing.googleapis.com/billing/gcp/charges\" resource.type=\"global\"",
              "aggregation": {
                "alignmentPeriod": "2592000s",
                "perSeriesAligner": "ALIGN_SUM",
                "crossSeriesReducer": "REDUCE_SUM"
              }
            }
          }
        }
      }
    ]
  }
}
DASHBOARD
```

## Cost Control Checklist

For every new project:

- [ ] Budget created with thresholds at 50%, 75%, 90%, 100%, and 120%
- [ ] Budget alerts sent to the team's notification channel
- [ ] Billing export to BigQuery enabled
- [ ] Automated cost control function deployed (optional but recommended)
- [ ] Resources labeled for cost allocation
- [ ] Development resource scheduling configured
- [ ] Cost dashboard created
- [ ] Recommender API reviewed for savings opportunities
- [ ] Committed use discounts evaluated for predictable workloads
- [ ] Monthly cost review process established

## Common Cost Surprises and How to Avoid Them

**Forgotten development resources**: Schedule automatic cleanup. Label everything with an environment tag.

**Egress charges**: Data leaving GCP is charged. Keep processing within GCP when possible. Use internal IPs between services.

**Logging costs**: High log volume can be expensive. Use exclusion filters for noisy, low-value logs.

**Persistent disk charges**: Disks attached to stopped VMs still incur charges. Delete unneeded disks and use snapshots instead.

**Load balancer charges**: Load balancers have a minimum monthly charge. Remove unused load balancers.

## Wrapping Up

Cost control on GCP starts with visibility and ends with automation. Set up budget alerts before deploying any resources so you are never surprised by a bill. Export billing data to BigQuery for detailed analysis and track costs by labels. Automate responses to budget alerts for development environments, and use scheduling to stop non-production resources outside business hours. Review the Recommender API monthly for right-sizing and idle resource opportunities. The small investment in cost controls at project setup prevents the much larger cost of an unexpected billing surprise.
