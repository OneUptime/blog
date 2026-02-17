# How to Build a Cost-Optimized Data Platform on GCP Using Committed Use Discounts and Slot Reservations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Optimization, FinOps, Data Platform

Description: Learn how to reduce your GCP data platform costs using BigQuery slot reservations, committed use discounts, and a practical approach to capacity planning across your organization.

---

Running a data platform on GCP gets expensive fast. Between BigQuery on-demand pricing, Compute Engine instances for your data tools, and storage costs, the bill adds up. The good news is that Google offers significant discounts if you are willing to commit to a certain level of usage. The challenge is figuring out the right commitment level without over-provisioning.

In this post, I will walk through how to use BigQuery slot reservations, committed use discounts for Compute Engine, and other cost optimization strategies to build a data platform that performs well without burning money.

## Understanding BigQuery Pricing Models

BigQuery offers two pricing models:

**On-demand pricing** charges you per TB of data scanned. As of this writing, that is $6.25 per TB in most regions. This is simple and requires no commitment, but it can get expensive if your team runs a lot of queries.

**Capacity pricing (slot reservations)** lets you buy a fixed amount of compute capacity measured in slots. You pay for the slots whether you use them or not, but you are not charged per query. This becomes cheaper than on-demand once your usage passes a certain threshold.

The break-even point varies, but a rough rule of thumb: if your team consistently scans more than 15-20 TB per month, slot reservations will save you money.

## Setting Up BigQuery Slot Reservations

Here is how to create slot reservations using the BigQuery Reservation API:

```bash
# Purchase a commitment of 500 slots for one year (annual commitment)
bq mk \
  --project_id=my-project \
  --location=US \
  --capacity_commitment \
  --plan=ANNUAL \
  --slots=500

# Create a reservation that allocates slots to a specific project
bq mk \
  --project_id=my-project \
  --location=US \
  --reservation \
  --slots=500 \
  --reservation_id=data-team-reservation

# Assign the reservation to your project
bq mk \
  --project_id=my-project \
  --location=US \
  --reservation_assignment \
  --reservation_id=data-team-reservation \
  --assignee_id=my-project \
  --assignee_type=PROJECT \
  --job_type=QUERY
```

You can also do this through Terraform for better infrastructure-as-code management:

```hcl
# Terraform configuration for BigQuery slot reservations
resource "google_bigquery_capacity_commitment" "annual" {
  project  = "my-project"
  location = "US"
  # 500 slots with annual commitment for the best discount
  slot_count = 500
  plan       = "ANNUAL"
}

resource "google_bigquery_reservation" "data_team" {
  project  = "my-project"
  location = "US"
  name     = "data-team-reservation"
  # Allocate all 500 committed slots
  slot_count = 500
}

resource "google_bigquery_reservation_assignment" "primary" {
  project    = "my-project"
  location   = "US"
  reservation = google_bigquery_reservation.data_team.id
  assignee   = "projects/my-project"
  job_type   = "QUERY"
}
```

## Choosing the Right Commitment Level

The key question is: how many slots do you need? Here is how to figure that out.

First, analyze your current on-demand usage:

```sql
-- Analyze BigQuery slot usage over the past 30 days
SELECT
  DATE(creation_time) AS query_date,
  COUNT(*) AS query_count,
  -- Total slot-milliseconds used
  SUM(total_slot_ms) AS total_slot_ms,
  -- Peak concurrent slot usage (approximate)
  MAX(total_slot_ms / TIMESTAMP_DIFF(end_time, start_time, MILLISECOND)) AS peak_slots,
  -- Average slot usage
  AVG(total_slot_ms / GREATEST(TIMESTAMP_DIFF(end_time, start_time, MILLISECOND), 1)) AS avg_slots,
  -- Total bytes scanned (for on-demand cost comparison)
  SUM(total_bytes_processed) / POW(1024, 4) AS total_tb_scanned
FROM `region-US`.INFORMATION_SCHEMA.JOBS
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY query_date
ORDER BY query_date DESC;
```

Then compare costs:

```sql
-- Compare on-demand vs reservation costs
WITH usage AS (
  SELECT
    SUM(total_bytes_processed) / POW(1024, 4) AS total_tb_scanned,
    SUM(total_slot_ms) / 1000 / 3600 AS total_slot_hours
  FROM `region-US`.INFORMATION_SCHEMA.JOBS
  WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    AND job_type = 'QUERY'
    AND state = 'DONE'
)
SELECT
  total_tb_scanned,
  total_slot_hours,
  -- On-demand cost at $6.25 per TB
  ROUND(total_tb_scanned * 6.25, 2) AS on_demand_cost_usd,
  -- Annual commitment cost (100 slots at roughly $2,040/month)
  ROUND(2040 * (total_slot_hours / (30 * 24 * 100)), 2) AS estimated_reservation_cost_usd
FROM usage;
```

## Multi-Tier Reservation Strategy

For organizations with different teams that have different usage patterns, set up a multi-tier reservation strategy:

```bash
# Create a parent reservation with your total committed slots
bq mk --reservation \
  --project_id=my-project \
  --location=US \
  --slots=1000 \
  --reservation_id=org-total

# Create child reservations for different teams
# Data engineering gets a guaranteed 400 slots
bq mk --reservation \
  --project_id=my-project \
  --location=US \
  --slots=400 \
  --reservation_id=org-total/data-engineering

# Analytics team gets 300 slots
bq mk --reservation \
  --project_id=my-project \
  --location=US \
  --slots=300 \
  --reservation_id=org-total/analytics

# The remaining 300 slots are shared by anyone who needs them
bq mk --reservation \
  --project_id=my-project \
  --location=US \
  --slots=300 \
  --reservation_id=org-total/shared-pool
```

The idle slots from one reservation can be borrowed by other reservations in the same commitment, so you do not waste capacity when one team is quiet.

## Committed Use Discounts for Compute Engine

If your data platform includes always-on Compute Engine instances (for Airflow workers, Kafka brokers, or processing nodes), committed use discounts can save 57% for a 3-year commitment or 20% for 1 year.

```bash
# Purchase a 1-year commitment for n2-standard-8 instances
gcloud compute commitments create data-platform-commitment \
  --region=us-central1 \
  --plan=12-month \
  --resources=vcpu=32,memory=128GB \
  --type=GENERAL_PURPOSE \
  --project=my-project
```

For workloads that can tolerate interruptions, Spot VMs offer even larger discounts (60-91% off):

```bash
# Create a managed instance group with Spot VMs for batch processing
gcloud compute instance-templates create batch-worker-spot \
  --machine-type=n2-standard-4 \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --project=my-project

gcloud compute instance-groups managed create batch-workers \
  --template=batch-worker-spot \
  --size=0 \
  --zone=us-central1-a \
  --project=my-project
```

## Storage Optimization

Storage costs are often overlooked but can be significant for data platforms:

```sql
-- Find tables with high storage costs that might benefit from optimization
SELECT
  table_schema,
  table_name,
  -- Total logical bytes
  ROUND(total_logical_bytes / POW(1024, 3), 2) AS logical_gb,
  -- Total physical bytes (after compression)
  ROUND(total_physical_bytes / POW(1024, 3), 2) AS physical_gb,
  -- Long-term storage bytes (data not modified in 90 days, half price)
  ROUND(long_term_logical_bytes / POW(1024, 3), 2) AS long_term_gb,
  -- Percentage of data in long-term storage
  ROUND(SAFE_DIVIDE(long_term_logical_bytes, total_logical_bytes) * 100, 1) AS long_term_pct
FROM `my-project.region-US`.INFORMATION_SCHEMA.TABLE_STORAGE
WHERE total_logical_bytes > 0
ORDER BY total_logical_bytes DESC
LIMIT 20;
```

Key storage optimizations:

1. **Use partitioning and clustering.** Partitioned tables cost the same to store but less to query because BigQuery skips irrelevant partitions.

2. **Set partition expiration.** If you only need 90 days of detailed data, let BigQuery auto-delete old partitions:

```sql
-- Set partition expiration to 90 days
ALTER TABLE `my-project.analytics.events`
SET OPTIONS (partition_expiration_days = 90);
```

3. **Use BigQuery Storage API for physical billing.** Physical billing charges for compressed bytes instead of logical bytes, which can be 70-80% cheaper for well-compressed data.

## Building a Cost Dashboard

Create a dashboard that tracks your data platform costs:

```sql
-- Daily cost tracking query for BigQuery usage
SELECT
  DATE(creation_time) AS date,
  user_email,
  -- On-demand equivalent cost
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS on_demand_equivalent_usd,
  -- Slot usage
  ROUND(SUM(total_slot_ms) / 1000 / 3600, 1) AS slot_hours,
  -- Query count
  COUNT(*) AS query_count
FROM `region-US`.INFORMATION_SCHEMA.JOBS
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY date, user_email
ORDER BY on_demand_equivalent_usd DESC;
```

## Flex Slots for Burst Capacity

When you have occasional spikes in demand (end-of-month reporting, data backfills), use flex slots instead of permanently increasing your commitment:

```bash
# Purchase flex slots (billed per second, no long-term commitment)
bq mk \
  --project_id=my-project \
  --location=US \
  --capacity_commitment \
  --plan=FLEX \
  --slots=500
```

Flex slots cost more per slot than annual commitments, but you only pay for the time you use them. You can automate purchasing and releasing flex slots based on a schedule:

```python
# Python script to buy flex slots during business hours
from google.cloud import bigquery_reservation_v1
from datetime import datetime

def manage_flex_slots():
    client = bigquery_reservation_v1.ReservationServiceClient()
    parent = f"projects/my-project/locations/US"

    hour = datetime.utcnow().hour

    # Buy flex slots during peak hours (8 AM - 6 PM UTC)
    if 8 <= hour < 18:
        commitment = client.create_capacity_commitment(
            parent=parent,
            capacity_commitment=bigquery_reservation_v1.CapacityCommitment(
                plan="FLEX",
                slot_count=500,
            ),
        )
        print(f"Purchased flex slots: {commitment.name}")
    else:
        # Release flex slots outside peak hours
        commitments = client.list_capacity_commitments(parent=parent)
        for c in commitments:
            if c.plan.name == "FLEX":
                client.delete_capacity_commitment(name=c.name)
                print(f"Released flex slots: {c.name}")
```

The combination of annual commitments for baseline usage and flex slots for peaks is the most cost-effective approach for most data platforms. Monitor your usage patterns with OneUptime to find the right balance between committed capacity and on-demand flexibility.
