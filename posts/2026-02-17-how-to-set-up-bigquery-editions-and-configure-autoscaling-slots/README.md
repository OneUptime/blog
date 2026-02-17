# How to Set Up BigQuery Editions and Configure Autoscaling Slots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery Editions, Autoscaling, Slots, Cost Management

Description: Learn how to set up BigQuery Editions with autoscaling slots to balance performance and cost for your analytical workloads.

---

BigQuery pricing changed significantly with the introduction of Editions. Instead of choosing between on-demand pricing (pay per byte scanned) and flat-rate pricing (fixed monthly slot commitments), you now have a more flexible model with three editions - Standard, Enterprise, and Enterprise Plus - each with autoscaling capabilities. This gives you the cost predictability of slot-based pricing with the flexibility to scale up during peak demand.

In this post, I will walk through how BigQuery Editions work, how to set up autoscaling, and how to configure the right baseline and maximum slots for your workload.

## Understanding BigQuery Editions

BigQuery offers three editions, each with different capabilities and price points.

Standard edition is the entry-level option. It includes autoscaling, baseline slots, and standard features. It does not include advanced features like multi-statement transactions, row-level security, or column-level security. The slot price is the lowest of the three editions.

Enterprise edition adds advanced security features, multi-statement transactions, and support for longer commitments that reduce per-slot pricing. This is the most common choice for production workloads.

Enterprise Plus adds materialized views with automatic refresh, BI Engine, and other premium features. The per-slot price is higher, but the additional features can provide significant value for large-scale analytics.

All three editions use slots as the unit of compute. A slot represents a unit of computational capacity. More slots means more queries can run concurrently and complex queries complete faster.

## Creating a Capacity Commitment

The first step is creating a capacity commitment, which is your baseline slot allocation. This is the minimum number of slots you will always have available.

```bash
# Create an Enterprise edition commitment with 100 baseline slots
# Using a monthly commitment for better pricing
gcloud bq reservations create-capacity-commitment \
  --project=my-project \
  --location=us-central1 \
  --edition=ENTERPRISE \
  --slots=100 \
  --commitment-plan=MONTHLY
```

The commitment plan affects pricing. Annual commitments offer the best per-slot rate but require a one-year minimum. Monthly commitments are more flexible but cost more per slot. Flex commitments (pay-as-you-go) have no minimum term but the highest per-slot rate - useful for testing before committing.

You can also create this using the BigQuery API.

```python
from google.cloud import bigquery_reservation_v1

# Create a capacity commitment client
client = bigquery_reservation_v1.ReservationServiceClient()

# Define the parent location
parent = "projects/my-project/locations/us-central1"

# Create the capacity commitment
commitment = bigquery_reservation_v1.CapacityCommitment(
    plan=bigquery_reservation_v1.CapacityCommitment.CommitmentPlan.MONTHLY,
    slot_count=100,
    edition=bigquery_reservation_v1.Edition.ENTERPRISE,
)

# Execute the creation
response = client.create_capacity_commitment(
    parent=parent,
    capacity_commitment=commitment,
)

print(f"Created commitment: {response.name}")
print(f"Slots: {response.slot_count}")
print(f"State: {response.state}")
```

## Creating a Reservation with Autoscaling

A reservation allocates slots to specific projects or organizations. With autoscaling, you set a baseline and a maximum, and BigQuery automatically scales between them based on demand.

```bash
# Create a reservation with autoscaling
# Baseline: 100 slots, can scale up to 400 slots
gcloud bq reservations create my-analytics-reservation \
  --project=my-project \
  --location=us-central1 \
  --edition=ENTERPRISE \
  --slots=100 \
  --autoscale-max-slots=300
```

In this configuration, you always have 100 baseline slots from your capacity commitment. When demand exceeds what 100 slots can handle, BigQuery automatically provisions additional slots up to 300 more (for a total of 400). The autoscaled slots are billed at the flex rate - you only pay for them while they are in use.

This is the key benefit of the autoscaling model. You pay a committed rate for your baseline and a flex rate only for burst capacity when you need it.

## Assigning Projects to Reservations

After creating a reservation, you need to assign projects to it. Without an assignment, projects default to on-demand pricing.

```bash
# Assign a project to the reservation
gcloud bq reservations assignments create \
  --project=my-project \
  --location=us-central1 \
  --reservation=my-analytics-reservation \
  --assignee=projects/my-analytics-project \
  --job-type=QUERY
```

You can assign different job types separately. For example, you might want queries to use one reservation while LOAD jobs use another, or fall back to on-demand.

```bash
# Assign ML training jobs to a separate reservation
gcloud bq reservations assignments create \
  --project=my-project \
  --location=us-central1 \
  --reservation=my-ml-reservation \
  --assignee=projects/my-analytics-project \
  --job-type=ML_EXTERNAL
```

## Choosing the Right Baseline

Setting the baseline correctly is important for both cost and performance. If the baseline is too low, you will be paying flex rates for slots you use constantly. If it is too high, you are paying for idle capacity.

To determine the right baseline, look at your current slot utilization patterns.

```sql
-- Analyze historical slot utilization to determine baseline
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  -- Average slot usage across all jobs
  AVG(period_slot_ms / (TIMESTAMP_DIFF(period_start,
    TIMESTAMP_SUB(period_start, INTERVAL 1 SECOND), MILLISECOND))) AS avg_slots_used,
  -- Peak slot usage
  MAX(period_slot_ms / (TIMESTAMP_DIFF(period_start,
    TIMESTAMP_SUB(period_start, INTERVAL 1 SECOND), MILLISECOND))) AS peak_slots_used
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
GROUP BY
  hour
ORDER BY
  hour;
```

Set your baseline to cover the consistent, steady-state slot usage. Then set the autoscaling maximum to handle peak demand. A common pattern is to set the baseline at the 50th percentile of slot usage and the max at the 95th percentile.

## Monitoring Autoscaling Behavior

Once autoscaling is active, you want to monitor how often it triggers and how many additional slots are being provisioned.

```sql
-- Monitor autoscaling events and slot utilization
SELECT
  TIMESTAMP_TRUNC(period_start, MINUTE) AS minute,
  SUM(period_slot_ms) / 60000 AS total_slot_minutes,
  COUNT(DISTINCT job_id) AS concurrent_jobs
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  minute
ORDER BY
  minute;
```

You can also check autoscaling metrics through Cloud Monitoring.

```bash
# View autoscaling metrics in Cloud Monitoring
gcloud monitoring time-series list \
  --filter='metric.type="bigquery.googleapis.com/reservation/slots/total_available" AND resource.labels.reservation_name="my-analytics-reservation"' \
  --interval-start-time=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ) \
  --format=json
```

## Adjusting Autoscaling Configuration

As your workload evolves, you may need to adjust the autoscaling configuration. You can update the baseline and maximum without recreating the reservation.

```bash
# Update the autoscaling maximum to allow more burst capacity
gcloud bq reservations update my-analytics-reservation \
  --project=my-project \
  --location=us-central1 \
  --autoscale-max-slots=500
```

If you find that autoscaling triggers frequently and stays at the maximum for extended periods, it is a sign that you should increase your baseline commitment. Conversely, if autoscaling rarely triggers, you might be able to reduce the baseline to save costs.

## Multiple Reservations for Workload Isolation

A common pattern is creating separate reservations for different workload types, each with their own autoscaling configuration.

```bash
# Reservation for interactive dashboard queries - low baseline, high autoscale
gcloud bq reservations create dashboard-reservation \
  --project=my-project \
  --location=us-central1 \
  --edition=ENTERPRISE \
  --slots=50 \
  --autoscale-max-slots=200

# Reservation for ETL/pipeline jobs - higher baseline, moderate autoscale
gcloud bq reservations create etl-reservation \
  --project=my-project \
  --location=us-central1 \
  --edition=ENTERPRISE \
  --slots=200 \
  --autoscale-max-slots=100
```

This ensures that heavy ETL jobs do not starve dashboard queries of compute resources, and vice versa.

## Wrapping Up

BigQuery Editions with autoscaling give you a pricing model that adapts to your workload. The key decisions are choosing the right edition for your feature needs, setting a baseline that covers steady-state usage, and configuring an autoscaling maximum that handles peaks without overspending. Monitor your slot utilization regularly and adjust these parameters as your workload changes. The goal is to minimize the gap between slots provisioned and slots actually used, and autoscaling is the mechanism that makes this possible.
