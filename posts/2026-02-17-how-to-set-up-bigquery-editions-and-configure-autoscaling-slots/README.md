# How to Set Up BigQuery Editions and Configure Autoscaling Slots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery Editions, Autoscaling, Slot, Cost Management

Description: Learn how to set up BigQuery Editions with autoscaling slots to balance performance and cost for your analytical workloads.

---

BigQuery pricing changed significantly with the introduction of Editions. Instead of choosing between on-demand pricing (pay per byte scanned) and flat-rate pricing (fixed monthly slot commitments), you now have a more flexible model with three editions - Standard, Enterprise, and Enterprise Plus - each with autoscaling capabilities. This gives you the cost predictability of slot-based pricing with the flexibility to scale up during peak demand.

In this post, I will walk through how BigQuery Editions work, how to set up autoscaling, and how to configure the right baseline and maximum slots for your workload.

## Understanding BigQuery Editions

BigQuery offers three editions, each with different capabilities and price points.

Standard edition is the entry-level option. It includes autoscaling and standard features, but it does not support baseline slots or capacity commitments. It also does not include advanced features like row-level security, column-level security, or BI Engine query acceleration. The slot price is the lowest of the three editions.

Enterprise edition adds advanced security features, BI Engine query acceleration, and support for commitments that reduce per-slot pricing. This is the most common choice for production workloads.

Enterprise Plus adds premium features such as Assured Workloads compliance controls and managed disaster recovery. The per-slot price is higher, but the additional features can provide significant value for large-scale analytics.

All three editions use slots as the unit of compute. A slot represents a unit of computational capacity. More slots means more queries can run concurrently and complex queries complete faster.

## Creating a Capacity Commitment

If you use Enterprise or Enterprise Plus and want discounted baseline capacity, the first step is creating a capacity commitment. A commitment is not required for autoscaling, but it can cover baseline slots at a lower rate than pay-as-you-go capacity.

```bash
# Create an Enterprise edition commitment to cover 100 baseline slots

# Using an annual commitment for better pricing
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --capacity_commitment=true \
  --edition=ENTERPRISE \
  --plan=ANNUAL \
  --renewal_plan=NONE \
  --slots=100
```

The commitment plan affects pricing. Annual commitments offer a lower per-slot rate but require a one-year minimum, and three-year commitments offer a larger discount with a longer minimum term. If you do not purchase a commitment, baseline slots are billed at the pay-as-you-go rate, which is useful for testing before committing.

You can also create this using the BigQuery API.

```python
from google.cloud import bigquery_reservation_v1

# Create a capacity commitment client
client = bigquery_reservation_v1.ReservationServiceClient()

# Define the parent location
parent = "projects/my-project/locations/us-central1"

# Create the capacity commitment
commitment = bigquery_reservation_v1.CapacityCommitment(
    plan=bigquery_reservation_v1.CapacityCommitment.CommitmentPlan.ANNUAL,
    renewal_plan=bigquery_reservation_v1.CapacityCommitment.CommitmentPlan.NONE,
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
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --reservation \
  --edition=ENTERPRISE \
  --slots=100 \
  --ignore_idle_slots=false \
  --autoscale_max_slots=300 \
  my-analytics-reservation
```

In this configuration, you always have 100 baseline slots, and the capacity commitment can cover those slots at a committed rate. When demand exceeds what 100 slots can handle, BigQuery automatically provisions additional slots up to 300 more (for a total of 400). The autoscaled slots are billed at capacity compute pricing for your edition while the reservation is upscaled.

This is the key benefit of the autoscaling model. You pay for your baseline continuously, and autoscaled slots are billed at capacity compute pricing for your edition only while the reservation is upscaled, subject to the one-minute minimum.

## Assigning Projects to Reservations

After creating a reservation, you need to assign projects to it. Without an assignment, projects default to on-demand pricing.

```bash
# Assign a project to the reservation
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --reservation_assignment \
  --reservation_id=my-analytics-reservation \
  --assignee_id=my-analytics-project \
  --assignee_type=PROJECT \
  --job_type=QUERY
```

You can assign different job types separately. For example, you might want queries to use one reservation while pipeline jobs use another, or fall back to on-demand.

```bash
# Assign ML training jobs to a separate reservation
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --reservation_assignment \
  --reservation_id=my-ml-reservation \
  --assignee_id=my-analytics-project \
  --assignee_type=PROJECT \
  --job_type=ML_EXTERNAL
```

## Choosing the Right Baseline

Setting the baseline correctly is important for both cost and performance. If the baseline is too low, you will be paying autoscaling rates for slots you use constantly. If it is too high, you are paying for idle capacity.

To determine the right baseline, look at your current slot utilization patterns.

```sql
-- Analyze historical slot utilization to determine baseline
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  AVG(slots_used) AS avg_slots_used,
  MAX(slots_used) AS peak_slots_used
FROM (
  SELECT
    period_start,
    SUM(period_slot_ms) / 1000 AS slots_used
  FROM
    `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
  WHERE
    period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    AND job_type = 'QUERY'
    AND (statement_type != 'SCRIPT' OR statement_type IS NULL)
  GROUP BY
    period_start
)
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
  s.start_time,
  reservation_id,
  s.slots_assigned AS baseline_slots,
  s.autoscale_current_slots AS autoscaled_slots,
  s.autoscale_max_slots AS max_autoscale_slots
FROM
  `region-us-central1`.INFORMATION_SCHEMA.RESERVATIONS_TIMELINE,
  UNNEST(per_second_details) AS s
WHERE
  period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND reservation_name = 'my-analytics-reservation'
ORDER BY
  s.start_time;
```

You can also check autoscaling metrics through Cloud Monitoring.

```bash
# View autoscaling metrics in Cloud Monitoring
gcloud monitoring time-series list \
  --filter='metric.type="bigquery.googleapis.com/slots/max_assigned" AND metric.labels.reservation="my-analytics-reservation"' \
  --interval-start-time=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --format=json
```

## Adjusting Autoscaling Configuration

As your workload evolves, you may need to adjust the autoscaling configuration. You can update the baseline and maximum without recreating the reservation.

```bash
# Update the autoscaling maximum to allow more burst capacity
bq update \
  --project_id=my-project \
  --location=us-central1 \
  --slots=100 \
  --autoscale_max_slots=500 \
  --reservation my-analytics-reservation
```

If you find that autoscaling triggers frequently and stays at the maximum for extended periods, it is a sign that you should increase your baseline slots and make sure your commitments cover them if you want discounted committed pricing. Conversely, if autoscaling rarely triggers, you might be able to reduce the baseline to save costs.

## Multiple Reservations for Workload Isolation

A common pattern is creating separate reservations for different workload types, each with their own autoscaling configuration.

```bash
# Reservation for interactive dashboard queries - low baseline, high autoscale
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --reservation \
  --edition=ENTERPRISE \
  --slots=50 \
  --ignore_idle_slots=false \
  --autoscale_max_slots=200 \
  dashboard-reservation

# Reservation for ETL/pipeline jobs - higher baseline, moderate autoscale
bq mk \
  --project_id=my-project \
  --location=us-central1 \
  --reservation \
  --edition=ENTERPRISE \
  --slots=200 \
  --ignore_idle_slots=false \
  --autoscale_max_slots=100 \
  etl-reservation
```

This ensures that heavy ETL jobs do not starve dashboard queries of compute resources, and vice versa.

## Wrapping Up

BigQuery Editions with autoscaling give you a pricing model that adapts to your workload. The key decisions are choosing the right edition for your feature needs, setting a baseline that covers steady-state usage, and configuring an autoscaling maximum that handles peaks without overspending. Monitor your slot utilization regularly and adjust these parameters as your workload changes. The goal is to minimize the gap between slots provisioned and slots actually used, and autoscaling is the mechanism that makes this possible.
