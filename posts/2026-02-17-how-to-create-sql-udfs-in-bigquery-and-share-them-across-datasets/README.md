# How to Create SQL UDFs in BigQuery and Share Them Across Datasets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL UDFs, Data Engineering, Code Reuse

Description: Learn how to create SQL User-Defined Functions in BigQuery and share them across datasets and projects for consistent, reusable data transformations.

---

Every analytics team ends up with the same problem: the same transformation logic scattered across dozens of queries. Maybe it is a revenue calculation that accounts for refunds and discounts, or a customer segmentation formula. Someone writes it one way in one query, someone else writes it slightly differently in another, and soon you have inconsistent results.

SQL UDFs in BigQuery solve this by letting you define reusable functions that live in a dataset and can be called from any query. Unlike JavaScript UDFs, SQL UDFs run natively within BigQuery's SQL engine, so there is no performance overhead.

## Creating a Basic SQL UDF

Here is a straightforward SQL UDF that calculates a net revenue figure.

```sql
-- SQL UDF for calculating net revenue after refunds and discounts
-- This centralizes the business logic so all queries use the same formula
CREATE OR REPLACE FUNCTION `my_project.my_dataset.net_revenue`(
  gross_amount NUMERIC,
  discount_pct FLOAT64,
  refund_amount NUMERIC
)
RETURNS NUMERIC
AS (
  -- Apply discount first, then subtract refunds, minimum zero
  GREATEST(gross_amount * (1 - COALESCE(discount_pct, 0) / 100) - COALESCE(refund_amount, 0), 0)
);
```

Now any query can use it.

```sql
-- Use the UDF in any query - the business logic is centralized
SELECT
  order_id,
  gross_amount,
  discount_pct,
  refund_amount,
  `my_project.my_dataset.net_revenue`(gross_amount, discount_pct, refund_amount) AS net_revenue
FROM `my_project.my_dataset.orders`;
```

## SQL UDFs vs JavaScript UDFs

Before diving deeper, it is worth understanding when to use SQL UDFs versus JavaScript UDFs.

SQL UDFs:
- Run natively in the BigQuery SQL engine
- No performance overhead compared to inline SQL
- Support all standard SQL functions
- Cannot use loops or complex procedural logic

JavaScript UDFs:
- Run in a JavaScript sandbox with some performance overhead
- Can implement complex logic with loops, regex, and string manipulation
- Useful for parsing non-standard formats

Whenever possible, prefer SQL UDFs. They are faster and integrate more cleanly with BigQuery's query optimizer.

## Organizing UDFs in a Shared Dataset

The key to sharing UDFs across teams is putting them in a dedicated dataset that everyone can access.

```sql
-- Create a shared dataset for UDFs
CREATE SCHEMA IF NOT EXISTS `my_project.shared_udfs`
OPTIONS (
  description = 'Shared User-Defined Functions for all teams',
  location = 'US'
);
```

Then create your UDFs in that dataset.

```sql
-- Customer segmentation UDF in the shared dataset
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.customer_segment`(
  total_orders INT64,
  total_spent NUMERIC,
  days_since_last_order INT64
)
RETURNS STRING
AS (
  CASE
    WHEN total_orders >= 20 AND total_spent >= 5000 THEN 'VIP'
    WHEN total_orders >= 10 AND total_spent >= 2000 THEN 'Loyal'
    WHEN total_orders >= 3 THEN 'Regular'
    WHEN days_since_last_order <= 30 THEN 'New'
    WHEN days_since_last_order > 180 THEN 'Churned'
    ELSE 'Casual'
  END
);

-- Date utility UDF
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.fiscal_quarter`(d DATE)
RETURNS STRING
AS (
  -- Fiscal year starts in April
  CONCAT(
    'FY',
    CAST(
      CASE
        WHEN EXTRACT(MONTH FROM d) >= 4 THEN EXTRACT(YEAR FROM d)
        ELSE EXTRACT(YEAR FROM d) - 1
      END AS STRING
    ),
    '-Q',
    CAST(
      CASE
        WHEN EXTRACT(MONTH FROM d) >= 4 THEN (EXTRACT(MONTH FROM d) - 4) / 3 + 1
        ELSE (EXTRACT(MONTH FROM d) + 8) / 3 + 1
      END AS STRING
    )
  )
);
```

## Granting Access to Shared UDFs

For other teams or projects to use your shared UDFs, they need the appropriate IAM permissions on the dataset.

```bash
# Grant BigQuery Data Viewer role on the UDF dataset
# This allows users to call the functions
bq update --dataset \
  --default_table_expiration 0 \
  my_project:shared_udfs

# Add a specific user
bq add-iam-policy-binding \
  --member="user:analyst@company.com" \
  --role="roles/bigquery.dataViewer" \
  my_project:shared_udfs

# Or add an entire group
bq add-iam-policy-binding \
  --member="group:data-team@company.com" \
  --role="roles/bigquery.dataViewer" \
  my_project:shared_udfs
```

Users from other projects can then call the functions using the full qualified name.

```sql
-- Calling a shared UDF from a different project
SELECT
  customer_id,
  `my_project.shared_udfs.customer_segment`(
    total_orders,
    total_spent,
    DATE_DIFF(CURRENT_DATE(), last_order_date, DAY)
  ) AS segment
FROM `other_project.other_dataset.customer_stats`;
```

## UDFs with Default Values

SQL UDFs do not natively support default parameter values, but you can work around this by creating wrapper functions.

```sql
-- Base function with all parameters
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.format_currency_full`(
  amount NUMERIC,
  currency_code STRING,
  decimal_places INT64
)
RETURNS STRING
AS (
  CONCAT(
    currency_code, ' ',
    FORMAT('%.' || CAST(decimal_places AS STRING) || 'f', amount)
  )
);

-- Convenience wrapper with common defaults (USD, 2 decimal places)
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.format_currency`(
  amount NUMERIC
)
RETURNS STRING
AS (
  `my_project.shared_udfs.format_currency_full`(amount, 'USD', 2)
);
```

## Templated SQL UDFs

BigQuery supports templated SQL UDFs that work with any data type using the ANY TYPE keyword.

```sql
-- Templated UDF that works with any comparable type
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.clamp`(
  value ANY TYPE,
  min_val ANY TYPE,
  max_val ANY TYPE
)
AS (
  -- Clamp a value between min and max bounds
  GREATEST(LEAST(value, max_val), min_val)
);

-- Works with INT64
SELECT `my_project.shared_udfs.clamp`(150, 0, 100);  -- Returns 100

-- Works with FLOAT64
SELECT `my_project.shared_udfs.clamp`(3.14, 0.0, 1.0);  -- Returns 1.0

-- Works with DATE
SELECT `my_project.shared_udfs.clamp`(
  DATE '2026-03-15',
  DATE '2026-01-01',
  DATE '2026-02-28'
);  -- Returns 2026-02-28
```

## Building a UDF Library

Here is a practical set of UDFs that most analytics teams find useful.

```sql
-- URL parsing UDF
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.extract_url_param`(
  url STRING,
  param_name STRING
)
RETURNS STRING
AS (
  REGEXP_EXTRACT(url, CONCAT(param_name, '=([^&]*)'))
);

-- Safe division that returns null instead of error on divide by zero
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.safe_divide`(
  numerator NUMERIC,
  denominator NUMERIC
)
RETURNS NUMERIC
AS (
  IF(denominator = 0, NULL, numerator / denominator)
);

-- Percentage calculation with rounding
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.pct`(
  part NUMERIC,
  total NUMERIC,
  decimal_places INT64
)
RETURNS FLOAT64
AS (
  ROUND(
    IF(total = 0, 0, CAST(part AS FLOAT64) / CAST(total AS FLOAT64) * 100),
    decimal_places
  )
);

-- Business days between two dates (excludes weekends)
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.business_days_between`(
  start_date DATE,
  end_date DATE
)
RETURNS INT64
AS (
  (SELECT COUNT(*)
   FROM UNNEST(GENERATE_DATE_ARRAY(start_date, end_date)) AS d
   WHERE EXTRACT(DAYOFWEEK FROM d) NOT IN (1, 7))
);
```

## Testing Your UDFs

Always test UDFs with edge cases before making them available to the team.

```sql
-- Test the net_revenue UDF with various edge cases
SELECT
  'normal' AS test_case,
  `my_project.shared_udfs.net_revenue`(100, 10, 5) AS result,
  85 AS expected
UNION ALL
SELECT 'zero discount', `my_project.shared_udfs.net_revenue`(100, 0, 0), 100
UNION ALL
SELECT 'full refund', `my_project.shared_udfs.net_revenue`(100, 0, 150), 0
UNION ALL
SELECT 'null discount', `my_project.shared_udfs.net_revenue`(100, NULL, 10), 90
UNION ALL
SELECT 'null refund', `my_project.shared_udfs.net_revenue`(100, 10, NULL), 90;
```

## Versioning UDFs

Since CREATE OR REPLACE overwrites the function, consider a versioning strategy for production UDFs.

```sql
-- Version 1 of the scoring function
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.engagement_score_v1`(
  page_views INT64,
  time_on_site FLOAT64
)
RETURNS FLOAT64
AS (page_views * 0.3 + time_on_site * 0.7);

-- Version 2 with updated weights
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.engagement_score_v2`(
  page_views INT64,
  time_on_site FLOAT64,
  interactions INT64
)
RETURNS FLOAT64
AS (page_views * 0.2 + time_on_site * 0.5 + interactions * 0.3);

-- Current version alias (recreate when bumping versions)
CREATE OR REPLACE FUNCTION `my_project.shared_udfs.engagement_score`(
  page_views INT64,
  time_on_site FLOAT64,
  interactions INT64
)
RETURNS FLOAT64
AS (`my_project.shared_udfs.engagement_score_v2`(page_views, time_on_site, interactions));
```

## Listing and Managing UDFs

You can find all UDFs in a dataset using INFORMATION_SCHEMA.

```sql
-- List all routines (UDFs and stored procedures) in a dataset
SELECT
  routine_name,
  routine_type,
  routine_definition,
  created,
  last_altered
FROM `my_project.shared_udfs.INFORMATION_SCHEMA.ROUTINES`
ORDER BY routine_name;
```

## Wrapping Up

SQL UDFs in BigQuery are the best way to centralize business logic and ensure consistency across your analytics. Put them in a shared dataset, grant access to your teams, and treat them like any other shared code - with testing, versioning, and documentation. The performance is identical to inline SQL, so there is no reason not to use them for any calculation that appears in more than one query.

For monitoring the queries and pipelines that depend on your shared UDFs, [OneUptime](https://oneuptime.com) can help you track performance and catch issues across your BigQuery workloads.
