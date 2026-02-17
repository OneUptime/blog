# How to Build Data Quality Check Pipelines in BigQuery Using SQL Assertions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Quality, SQL Assertions, Data Engineering, Monitoring

Description: Learn how to build automated data quality check pipelines in BigQuery using SQL assertions, scheduled queries, and alerting to catch data issues before they reach dashboards.

---

Data quality problems are sneaky. A NULL value in a critical column, a duplicate primary key, a row count that drops to zero - these issues silently corrupt your dashboards and reports. By the time someone notices, the damage is done and trust in the data is lost.

SQL assertions are a practical way to catch these problems early. An assertion is a SQL query that should return zero rows. If it returns rows, something is wrong. By running a set of assertions after every data load, you create an automated quality gate that catches issues before they propagate to downstream consumers.

## The Assertion Pattern

Every data quality assertion follows the same structure:

```sql
-- An assertion is a query that returns rows only when there is a problem
-- Zero rows = pass, one or more rows = fail
SELECT
    'order_id is null' AS assertion_name,
    order_id,
    order_date
FROM `my-project.analytics.orders`
WHERE order_id IS NULL
```

If this query returns rows, you have NULL order IDs, which is a problem. If it returns zero rows, the assertion passes.

## Building a Quality Check Framework

Let us build a systematic framework for running assertions and tracking their results.

### Step 1: Create the Results Table

```sql
-- Create a table to store assertion results over time
-- This gives you a history of data quality for trending and alerting
CREATE TABLE `my-project.data_quality.assertion_results` (
    assertion_id STRING NOT NULL,
    assertion_name STRING NOT NULL,
    table_name STRING NOT NULL,
    severity STRING NOT NULL,           -- 'error' or 'warning'
    status STRING NOT NULL,             -- 'pass' or 'fail'
    failing_row_count INT64,
    run_timestamp TIMESTAMP NOT NULL,
    details STRING                      -- Optional context about failures
)
PARTITION BY DATE(run_timestamp);
```

### Step 2: Define Assertions

Organize your assertions in a script that runs them all and logs results:

```sql
-- Data quality assertion: No NULL primary keys in the orders table
-- Severity: error (this should block downstream processing)
DECLARE assertion_status STRING DEFAULT 'pass';
DECLARE fail_count INT64 DEFAULT 0;

SET fail_count = (
    SELECT COUNT(*)
    FROM `my-project.analytics.orders`
    WHERE order_id IS NULL
);

IF fail_count > 0 THEN
    SET assertion_status = 'fail';
END IF;

INSERT INTO `my-project.data_quality.assertion_results`
(assertion_id, assertion_name, table_name, severity, status, failing_row_count, run_timestamp)
VALUES (
    'orders-pk-not-null',
    'Order ID must not be null',
    'analytics.orders',
    'error',
    assertion_status,
    fail_count,
    CURRENT_TIMESTAMP()
);
```

### Step 3: Build a Reusable Assertion Procedure

Instead of writing the boilerplate for every assertion, create a stored procedure:

```sql
-- Stored procedure that runs any assertion query and logs the result
CREATE OR REPLACE PROCEDURE `my-project.data_quality.run_assertion`(
    p_assertion_id STRING,
    p_assertion_name STRING,
    p_table_name STRING,
    p_severity STRING,
    p_assertion_query STRING
)
BEGIN
    DECLARE fail_count INT64;
    DECLARE assertion_status STRING;

    -- Run the assertion query and count failing rows
    EXECUTE IMMEDIATE
        'SELECT COUNT(*) FROM (' || p_assertion_query || ')'
    INTO fail_count;

    -- Determine pass/fail
    SET assertion_status = IF(fail_count = 0, 'pass', 'fail');

    -- Log the result
    INSERT INTO `my-project.data_quality.assertion_results`
    (assertion_id, assertion_name, table_name, severity, status, failing_row_count, run_timestamp)
    VALUES (
        p_assertion_id,
        p_assertion_name,
        p_table_name,
        p_severity,
        assertion_status,
        fail_count,
        CURRENT_TIMESTAMP()
    );

    -- Raise an error if severity is 'error' and assertion failed
    IF assertion_status = 'fail' AND p_severity = 'error' THEN
        RAISE USING MESSAGE = CONCAT(
            'Data quality assertion failed: ', p_assertion_name,
            ' (', fail_count, ' failing rows)'
        );
    END IF;
END;
```

### Step 4: Call the Procedure for Each Assertion

```sql
-- Run a suite of data quality assertions
-- Each CALL checks one condition and logs the result

-- Assertion 1: No NULL primary keys
CALL `my-project.data_quality.run_assertion`(
    'orders-pk-not-null',
    'Order ID must not be null',
    'analytics.orders',
    'error',
    'SELECT order_id FROM `my-project.analytics.orders` WHERE order_id IS NULL'
);

-- Assertion 2: No duplicate primary keys
CALL `my-project.data_quality.run_assertion`(
    'orders-pk-unique',
    'Order ID must be unique',
    'analytics.orders',
    'error',
    'SELECT order_id, COUNT(*) as cnt FROM `my-project.analytics.orders` GROUP BY order_id HAVING COUNT(*) > 1'
);

-- Assertion 3: Total amount must be positive
CALL `my-project.data_quality.run_assertion`(
    'orders-positive-amount',
    'Total amount must be positive',
    'analytics.orders',
    'warning',
    'SELECT order_id, total_amount FROM `my-project.analytics.orders` WHERE total_amount <= 0'
);

-- Assertion 4: Order dates must be reasonable
CALL `my-project.data_quality.run_assertion`(
    'orders-valid-dates',
    'Order date must be within reasonable range',
    'analytics.orders',
    'warning',
    'SELECT order_id, order_date FROM `my-project.analytics.orders` WHERE order_date > CURRENT_DATE() OR order_date < DATE(2020, 1, 1)'
);

-- Assertion 5: Row count should be above minimum threshold
CALL `my-project.data_quality.run_assertion`(
    'orders-min-count',
    'Orders table must have at least 1000 rows',
    'analytics.orders',
    'error',
    'SELECT 1 FROM (SELECT COUNT(*) AS cnt FROM `my-project.analytics.orders`) WHERE cnt < 1000'
);
```

## Common Assertion Categories

### Completeness Assertions

Check that required fields are populated:

```sql
-- Completeness: required fields must not be null
SELECT order_id
FROM `my-project.analytics.orders`
WHERE customer_id IS NULL
   OR order_date IS NULL
   OR total_amount IS NULL
```

### Freshness Assertions

Check that data is not stale:

```sql
-- Freshness: the most recent order should be within the last 24 hours
SELECT
    MAX(order_date) AS latest_order_date,
    DATE_DIFF(CURRENT_DATE(), MAX(order_date), DAY) AS days_stale
FROM `my-project.analytics.orders`
HAVING DATE_DIFF(CURRENT_DATE(), MAX(order_date), DAY) > 1
```

### Volume Assertions

Check that row counts are within expected ranges:

```sql
-- Volume: today's event count should be within 50% of the 7-day average
WITH daily_counts AS (
    SELECT
        event_date,
        COUNT(*) AS event_count
    FROM `my-project.analytics.events`
    WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
    GROUP BY event_date
),
stats AS (
    SELECT
        AVG(CASE WHEN event_date < CURRENT_DATE() THEN event_count END) AS avg_count,
        MAX(CASE WHEN event_date = CURRENT_DATE() THEN event_count END) AS today_count
    FROM daily_counts
)
SELECT
    today_count,
    avg_count,
    ROUND(ABS(today_count - avg_count) / avg_count * 100, 1) AS pct_deviation
FROM stats
WHERE ABS(today_count - avg_count) / avg_count > 0.5
```

### Referential Integrity Assertions

Check that foreign keys reference valid records:

```sql
-- Referential integrity: every order should reference a valid customer
SELECT o.order_id, o.customer_id
FROM `my-project.analytics.orders` o
LEFT JOIN `my-project.analytics.customers` c
    ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL
```

### Distribution Assertions

Check that value distributions are reasonable:

```sql
-- Distribution: no single customer should have more than 5% of all orders
WITH customer_order_share AS (
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS pct_of_total
    FROM `my-project.analytics.orders`
    WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY customer_id
)
SELECT customer_id, order_count, pct_of_total
FROM customer_order_share
WHERE pct_of_total > 5.0
```

## Scheduling Quality Checks

Set up a BigQuery scheduled query to run your assertions after your data pipeline completes:

```bash
# Schedule the quality check suite to run daily at 7 AM UTC
# This should run after your data pipeline finishes
bq query \
  --use_legacy_sql=false \
  --schedule='every day 07:00' \
  --display_name='Daily Data Quality Checks' \
  < quality_checks.sql
```

## Building a Quality Dashboard

Query the assertion results table to build a monitoring dashboard:

```sql
-- Dashboard query: summary of recent assertion results
SELECT
    assertion_name,
    table_name,
    severity,
    status,
    failing_row_count,
    run_timestamp
FROM `my-project.data_quality.assertion_results`
WHERE run_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY run_timestamp DESC, severity DESC
```

```sql
-- Trend query: daily pass/fail rates over time
SELECT
    DATE(run_timestamp) AS check_date,
    COUNTIF(status = 'pass') AS passed,
    COUNTIF(status = 'fail') AS failed,
    ROUND(COUNTIF(status = 'pass') * 100.0 / COUNT(*), 1) AS pass_rate_pct
FROM `my-project.data_quality.assertion_results`
WHERE run_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY check_date
ORDER BY check_date
```

## Alerting on Failures

Use Cloud Monitoring to alert when assertions fail. Create a log-based metric that fires when the quality check procedure raises an error:

```bash
# Create a notification channel (e.g., email or Slack)
# Then create an alert policy based on BigQuery job failures
gcloud monitoring policies create \
  --display-name="Data Quality Alert" \
  --condition-display-name="Quality assertion failed" \
  --condition-filter='resource.type="bigquery_project" AND severity="ERROR" AND textPayload:"Data quality assertion failed"' \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Wrapping Up

SQL assertions are a lightweight but effective approach to data quality monitoring. They require no external tools - just BigQuery SQL, scheduled queries, and a results table. The pattern is simple: write queries that return rows when something is wrong, run them on a schedule, log the results, and alert on failures. Start with the basics (null checks, uniqueness, freshness) and gradually add more sophisticated checks (volume anomalies, distribution shifts, cross-table consistency) as you learn where your data tends to break.
