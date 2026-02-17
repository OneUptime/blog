# How to Build Data Clean Rooms in BigQuery for Privacy-Safe Data Collaboration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Clean Rooms, Privacy, Data Collaboration

Description: Learn how to build data clean rooms in BigQuery to enable privacy-safe data collaboration between organizations without exposing raw data.

---

Data collaboration between organizations is valuable but fraught with privacy concerns. A retailer wants to match their customer data with an advertiser's campaign data to measure ad effectiveness, but neither side wants to expose their raw customer records. Data clean rooms solve this by providing a controlled environment where multiple parties can combine and analyze their data without either party seeing the other's raw records. BigQuery provides the infrastructure to build these clean rooms natively.

## What Is a Data Clean Room

A data clean room is a secure environment where multiple data contributors can perform joint analysis on combined datasets while enforcing strict rules about what each party can see. The key principles are:

- No party can see the other party's raw data
- Only approved queries and aggregations are allowed
- Results must meet minimum aggregation thresholds (no singling out individuals)
- All access is audited

In BigQuery, you build clean rooms using a combination of Analytics Hub for data sharing, authorized routines for access control, and analysis rules to restrict what queries are allowed.

## Setting Up the Clean Room Architecture

The clean room involves at least two parties: Party A (for example, a retailer) and Party B (for example, an advertiser). Each party publishes their data into the clean room, and approved analysis routines run against both datasets.

Here is the architecture:

```
Party A Project          Clean Room Project         Party B Project
+-----------------+     +-------------------+     +-----------------+
| customer_data   | --> | linked_dataset_a  |     | campaign_data   |
|                 |     | linked_dataset_b  | <-- |                 |
|                 |     | analysis_routines |     |                 |
|                 |     | results_dataset   |     |                 |
+-----------------+     +-------------------+     +-----------------+
```

## Step 1: Create the Clean Room Project

Set up a dedicated project for the clean room:

```bash
# Create a project for the clean room
gcloud projects create clean-room-project \
  --name="Data Clean Room"

# Create datasets for linked data and analysis results
bq mk --location=US clean-room-project:analysis_routines
bq mk --location=US clean-room-project:results
```

## Step 2: Party A Publishes Data

Party A publishes their customer data through Analytics Hub, sharing it with the clean room project:

```sql
-- Party A: Create a view that prepares data for the clean room
-- Hash the customer identifier for privacy
CREATE VIEW `party_a_project.clean_room_share.customer_segments` AS
SELECT
  -- Hash the email for matching without exposing the raw value
  SHA256(LOWER(TRIM(email))) AS hashed_email,
  age_bucket,
  income_bucket,
  loyalty_tier,
  purchase_category,
  total_spend_bucket
FROM `party_a_project.internal.customers`;
```

Party A publishes this view through Analytics Hub, and the clean room project subscribes to it.

## Step 3: Party B Publishes Data

Party B does the same with their campaign data:

```sql
-- Party B: Prepare campaign exposure data for the clean room
CREATE VIEW `party_b_project.clean_room_share.campaign_exposures` AS
SELECT
  -- Same hashing algorithm as Party A for matching
  SHA256(LOWER(TRIM(email))) AS hashed_email,
  campaign_id,
  campaign_name,
  exposure_date,
  channel,
  ad_creative_id
FROM `party_b_project.internal.campaign_data`;
```

## Step 4: Create Analysis Routines

The clean room project contains authorized routines that enforce privacy rules. These routines can access both linked datasets but only return aggregated results:

```sql
-- Clean room analysis routine: campaign overlap analysis
-- Returns aggregate statistics, not individual records
CREATE OR REPLACE TABLE FUNCTION
  `clean-room-project.analysis_routines.campaign_audience_overlap`(
    campaign_filter STRING,
    min_group_size INT64  -- Minimum aggregation threshold
  )
AS (
  WITH matched_users AS (
    -- Join on hashed email to find overlap
    SELECT
      a.age_bucket,
      a.income_bucket,
      a.loyalty_tier,
      b.campaign_name,
      b.channel
    FROM `clean-room-project.linked_party_a.customer_segments` a
    INNER JOIN `clean-room-project.linked_party_b.campaign_exposures` b
      ON a.hashed_email = b.hashed_email
    WHERE b.campaign_name = campaign_filter
  )
  -- Only return aggregated results with minimum group sizes
  SELECT
    age_bucket,
    income_bucket,
    loyalty_tier,
    channel,
    COUNT(*) AS user_count
  FROM matched_users
  GROUP BY age_bucket, income_bucket, loyalty_tier, channel
  -- Enforce minimum group size to prevent individual identification
  HAVING COUNT(*) >= min_group_size
);
```

## Step 5: Enforce Analysis Rules

BigQuery clean rooms support analysis rules that restrict what queries subscribers can run on shared data. These rules are defined at the listing level:

```sql
-- Analysis rule: only allow aggregation queries with minimum thresholds
-- This prevents any query that could identify individuals
ALTER TABLE `clean-room-project.linked_party_a.customer_segments`
SET OPTIONS (
  -- Restrict to aggregation queries only
  -- No SELECT * or row-level access
  privacy_policy = JSON '''{
    "aggregation_threshold_policy": {
      "threshold": 50,
      "privacy_unit_columns": ["hashed_email"]
    }
  }'''
);
```

The aggregation threshold policy ensures that any query result must contain data from at least 50 distinct privacy units (users). Queries that would return results based on fewer than 50 users are blocked.

## Step 6: Run Clean Room Analysis

Both parties can now run approved analyses:

```sql
-- Run the campaign overlap analysis
-- Results are automatically aggregated with privacy thresholds enforced
SELECT *
FROM `clean-room-project.analysis_routines.campaign_audience_overlap`(
  'Summer Sale 2025',  -- Campaign to analyze
  50                    -- Minimum group size
)
ORDER BY user_count DESC;
```

## Measurement Use Case: Ad Attribution

A common clean room use case is measuring ad campaign effectiveness:

```sql
-- Clean room routine: measure conversion rates by campaign
CREATE OR REPLACE TABLE FUNCTION
  `clean-room-project.analysis_routines.campaign_conversion_analysis`(
    start_date DATE,
    end_date DATE,
    min_cohort_size INT64
  )
AS (
  WITH campaign_reach AS (
    -- Users exposed to campaigns
    SELECT DISTINCT
      b.hashed_email,
      b.campaign_name,
      b.channel
    FROM `clean-room-project.linked_party_b.campaign_exposures` b
    WHERE b.exposure_date BETWEEN start_date AND end_date
  ),
  conversions AS (
    -- Users who made purchases (from retailer data)
    SELECT DISTINCT
      a.hashed_email,
      a.purchase_category,
      a.total_spend_bucket
    FROM `clean-room-project.linked_party_a.customer_segments` a
  ),
  combined AS (
    SELECT
      cr.campaign_name,
      cr.channel,
      COUNTIF(c.hashed_email IS NOT NULL) AS converted_users,
      COUNT(*) AS reached_users
    FROM campaign_reach cr
    LEFT JOIN conversions c ON cr.hashed_email = c.hashed_email
    GROUP BY cr.campaign_name, cr.channel
  )
  SELECT
    campaign_name,
    channel,
    reached_users,
    converted_users,
    ROUND(SAFE_DIVIDE(converted_users, reached_users) * 100, 2) AS conversion_rate_pct
  FROM combined
  WHERE reached_users >= min_cohort_size
);
```

## Differential Privacy Integration

For even stronger privacy guarantees, BigQuery supports differential privacy in clean room queries:

```sql
-- Query with differential privacy
-- Adds calibrated noise to results to prevent re-identification
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS (
    epsilon = 1.0,              -- Privacy budget
    delta = 1e-5,               -- Failure probability
    max_groups_contributed = 3,  -- Max groups per user
    privacy_unit_column = hashed_email
  )
  campaign_name,
  channel,
  COUNT(*) AS approx_reach,
  AVG(CAST(converted AS FLOAT64)) AS approx_conversion_rate
FROM clean_room_combined_view
GROUP BY campaign_name, channel;
```

Differential privacy adds mathematical noise to the results, making it impossible to determine whether any individual was in the dataset. The `epsilon` parameter controls the privacy-utility trade-off: lower epsilon means more privacy but noisier results.

## Auditing Clean Room Activity

Every query in the clean room is logged for audit purposes:

```sql
-- Audit trail: all queries run in the clean room
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user,
  protopayload_auditlog.serviceData.jobCompletedEvent.job.jobConfiguration.query.query AS query_text,
  timestamp,
  protopayload_auditlog.serviceData.jobCompletedEvent.job.jobStatistics.totalBilledBytes AS bytes_billed
FROM `clean-room-project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
ORDER BY timestamp DESC;
```

## Best Practices

Always use hashed identifiers for matching. Never share raw PII in the clean room. Use consistent hashing algorithms (SHA-256 on normalized email is common) so both parties can match without exchanging raw data.

Set meaningful aggregation thresholds. A minimum of 50 users per group is a common starting point, but adjust based on your privacy requirements and the sensitivity of the data.

Limit the analysis routines to specific approved use cases. Do not create general-purpose query access - each routine should serve a specific business question.

Review and rotate access periodically. Clean rooms should have defined engagement periods. When a collaboration ends, revoke access and delete linked datasets.

Data clean rooms in BigQuery provide the technical infrastructure for privacy-safe collaboration. Combined with proper governance, legal agreements, and monitoring, they enable organizations to unlock the value of combined data without compromising the privacy of their customers.
