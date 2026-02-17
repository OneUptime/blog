# How to Use BigQuery Scripting with DECLARE SET and LOOP for Complex ETL Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL Scripting, ETL, Data Engineering

Description: Learn how to use BigQuery scripting features including DECLARE, SET, IF, LOOP, and WHILE for building complex ETL pipelines and procedural data logic.

---

Standard SQL is declarative - you describe what you want, and the engine figures out how to get it. But some data engineering tasks need procedural logic: iterating through date ranges, conditionally executing different transformations, accumulating results across multiple steps. BigQuery scripting adds procedural capabilities to SQL with variables, control flow, loops, and error handling. This lets you build complex ETL pipelines entirely in BigQuery without needing an external orchestrator for the logic.

## Variables with DECLARE and SET

Variables let you store values and use them across multiple statements in a script:

```sql
-- Declare variables for a parameterized ETL job
DECLARE start_date DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
DECLARE end_date DATE DEFAULT CURRENT_DATE();
DECLARE batch_size INT64 DEFAULT 10000;
DECLARE processed_count INT64;

-- SET assigns a value to a variable
SET start_date = '2025-01-01';

-- SET from a query result
SET processed_count = (
  SELECT COUNT(*)
  FROM `my_project.staging.raw_events`
  WHERE event_date BETWEEN start_date AND end_date
);

-- Use variables in queries
SELECT
  FORMAT('Processing %d records from %t to %t',
         processed_count, start_date, end_date) AS job_info;
```

You can declare multiple variables at once:

```sql
-- Declare multiple variables of the same type
DECLARE min_val, max_val, avg_val FLOAT64;

-- Set multiple variables from a single query
SET (min_val, max_val, avg_val) = (
  SELECT AS STRUCT MIN(value), MAX(value), AVG(value)
  FROM `my_project.metrics.measurements`
);
```

## IF-ELSE Conditional Logic

Use IF statements to execute different SQL blocks based on conditions:

```sql
-- Conditional ETL: different logic depending on data volume
DECLARE row_count INT64;

SET row_count = (
  SELECT COUNT(*)
  FROM `my_project.staging.incoming_data`
  WHERE load_date = CURRENT_DATE()
);

-- Choose processing strategy based on data volume
IF row_count > 1000000 THEN
  -- Large batch: use partitioned insert
  INSERT INTO `my_project.warehouse.events`
  SELECT * FROM `my_project.staging.incoming_data`
  WHERE load_date = CURRENT_DATE();

ELSEIF row_count > 0 THEN
  -- Small batch: use MERGE for upsert
  MERGE `my_project.warehouse.events` target
  USING `my_project.staging.incoming_data` source
  ON target.event_id = source.event_id
  WHEN MATCHED THEN UPDATE SET target.value = source.value
  WHEN NOT MATCHED THEN INSERT ROW;

ELSE
  -- No data: log a warning
  SELECT 'No data found for today' AS warning;
END IF;
```

## LOOP and WHILE for Iteration

Loops let you repeat operations, which is useful for processing data in batches or iterating through a set of values:

```sql
-- Process data in daily batches using a WHILE loop
DECLARE current_date DATE DEFAULT '2025-01-01';
DECLARE end_date DATE DEFAULT '2025-12-31';
DECLARE daily_count INT64;

WHILE current_date <= end_date DO
  -- Process one day at a time
  INSERT INTO `my_project.warehouse.daily_aggregates`
  SELECT
    current_date AS agg_date,
    product_category,
    COUNT(*) AS order_count,
    SUM(revenue) AS total_revenue
  FROM `my_project.staging.orders`
  WHERE order_date = current_date
  GROUP BY product_category;

  -- Track what we processed
  SET daily_count = @@row_count;
  SELECT FORMAT('Processed %t: %d rows', current_date, daily_count) AS status;

  -- Move to next day
  SET current_date = DATE_ADD(current_date, INTERVAL 1 DAY);
END WHILE;
```

The `@@row_count` system variable holds the number of rows affected by the last DML statement. This is useful for logging and validation.

## LOOP with BREAK and CONTINUE

For more flexible loops, use LOOP with BREAK and CONTINUE:

```sql
-- Process batches until no more data
DECLARE batch_num INT64 DEFAULT 0;
DECLARE rows_processed INT64;

LOOP
  SET batch_num = batch_num + 1;

  -- Process one batch of unprocessed records
  UPDATE `my_project.staging.queue`
  SET status = 'processing', batch_id = batch_num
  WHERE status = 'pending'
  LIMIT 1000;

  SET rows_processed = @@row_count;

  -- Exit when no more records to process
  IF rows_processed = 0 THEN
    LEAVE;  -- LEAVE exits the loop (same as BREAK)
  END IF;

  -- Transform and load the batch
  INSERT INTO `my_project.warehouse.processed_records`
  SELECT
    record_id,
    UPPER(name) AS name,
    ROUND(value, 2) AS value,
    CURRENT_TIMESTAMP() AS processed_at
  FROM `my_project.staging.queue`
  WHERE batch_id = batch_num AND status = 'processing';

  -- Mark batch as complete
  UPDATE `my_project.staging.queue`
  SET status = 'completed'
  WHERE batch_id = batch_num AND status = 'processing';

  -- Safety limit to prevent infinite loops
  IF batch_num >= 100 THEN
    LEAVE;
  END IF;
END LOOP;

SELECT FORMAT('Completed %d batches', batch_num) AS result;
```

## FOR Loop Over Query Results

The FOR loop iterates over the results of a query, which is perfect for dynamic operations:

```sql
-- Iterate over tables and run maintenance on each one
FOR record IN (
  SELECT table_name, partition_column
  FROM `my_project.metadata.table_registry`
  WHERE requires_daily_partition_cleanup = TRUE
)
DO
  -- Build and execute dynamic SQL for each table
  EXECUTE IMMEDIATE FORMAT("""
    DELETE FROM `my_project.warehouse.%s`
    WHERE %s < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  """, record.table_name, record.partition_column);

  SELECT FORMAT('Cleaned up %s', record.table_name) AS status;
END FOR;
```

## Error Handling with BEGIN-EXCEPTION

Wrap statements in BEGIN-EXCEPTION blocks to handle errors gracefully:

```sql
-- ETL with error handling
DECLARE error_message STRING;

BEGIN
  -- Attempt the transformation
  INSERT INTO `my_project.warehouse.metrics`
  SELECT
    metric_date,
    metric_name,
    SAFE_CAST(metric_value AS FLOAT64) AS value
  FROM `my_project.staging.raw_metrics`
  WHERE load_date = CURRENT_DATE();

  -- Log success
  INSERT INTO `my_project.metadata.etl_log`
  VALUES (CURRENT_TIMESTAMP(), 'metrics_load', 'SUCCESS', NULL);

EXCEPTION WHEN ERROR THEN
  -- Capture the error
  SET error_message = @@error.message;

  -- Log the failure
  INSERT INTO `my_project.metadata.etl_log`
  VALUES (CURRENT_TIMESTAMP(), 'metrics_load', 'FAILED', error_message);

  -- Optionally re-raise the error
  -- RAISE USING MESSAGE = error_message;
END;
```

## Dynamic SQL with EXECUTE IMMEDIATE

For queries that need to be constructed at runtime:

```sql
-- Build and run queries dynamically
DECLARE target_table STRING DEFAULT 'orders_2025';
DECLARE aggregation_column STRING DEFAULT 'product_category';

EXECUTE IMMEDIATE FORMAT("""
  SELECT
    %s AS dimension,
    COUNT(*) AS record_count,
    SUM(revenue) AS total_revenue
  FROM `my_project.warehouse.%s`
  GROUP BY 1
  ORDER BY total_revenue DESC
  LIMIT 20
""", aggregation_column, target_table);
```

You can also use parameterized dynamic SQL for safer variable substitution:

```sql
-- Parameterized EXECUTE IMMEDIATE - safer against SQL injection
DECLARE target_date DATE DEFAULT CURRENT_DATE();

EXECUTE IMMEDIATE """
  SELECT COUNT(*) AS total_events
  FROM `my_project.analytics.events`
  WHERE event_date = @date_param
""" USING target_date AS date_param;
```

## Building a Complete ETL Pipeline

Here is a realistic ETL pipeline that combines multiple scripting features:

```sql
-- Complete ETL pipeline script
DECLARE pipeline_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
DECLARE step_name STRING;
DECLARE tables_processed INT64 DEFAULT 0;

-- Step 1: Validate incoming data
BEGIN
  SET step_name = 'validation';

  DECLARE invalid_count INT64;
  SET invalid_count = (
    SELECT COUNT(*)
    FROM `my_project.staging.incoming`
    WHERE event_id IS NULL OR event_timestamp IS NULL
  );

  IF invalid_count > 0 THEN
    -- Quarantine invalid records
    INSERT INTO `my_project.staging.quarantine`
    SELECT *, CURRENT_TIMESTAMP() AS quarantined_at, 'missing_required_fields' AS reason
    FROM `my_project.staging.incoming`
    WHERE event_id IS NULL OR event_timestamp IS NULL;
  END IF;
EXCEPTION WHEN ERROR THEN
  INSERT INTO `my_project.metadata.pipeline_errors`
  VALUES (pipeline_start, step_name, @@error.message);
  RETURN;  -- Exit the script
END;

-- Step 2: Transform and load
BEGIN
  SET step_name = 'transform_load';

  MERGE `my_project.warehouse.events` target
  USING (
    SELECT * FROM `my_project.staging.incoming`
    WHERE event_id IS NOT NULL AND event_timestamp IS NOT NULL
  ) source
  ON target.event_id = source.event_id
  WHEN MATCHED THEN UPDATE SET
    target.event_data = source.event_data,
    target.updated_at = CURRENT_TIMESTAMP()
  WHEN NOT MATCHED THEN INSERT ROW;

  SET tables_processed = tables_processed + 1;
EXCEPTION WHEN ERROR THEN
  INSERT INTO `my_project.metadata.pipeline_errors`
  VALUES (pipeline_start, step_name, @@error.message);
END;

-- Step 3: Update aggregates
BEGIN
  SET step_name = 'aggregation';

  INSERT INTO `my_project.warehouse.daily_summary`
  SELECT
    DATE(event_timestamp) AS event_date,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM `my_project.warehouse.events`
  WHERE DATE(event_timestamp) = CURRENT_DATE()
  GROUP BY event_date, event_type;

  SET tables_processed = tables_processed + 1;
EXCEPTION WHEN ERROR THEN
  INSERT INTO `my_project.metadata.pipeline_errors`
  VALUES (pipeline_start, step_name, @@error.message);
END;

-- Log completion
INSERT INTO `my_project.metadata.pipeline_runs`
VALUES (
  pipeline_start,
  CURRENT_TIMESTAMP(),
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), pipeline_start, SECOND),
  tables_processed,
  'COMPLETED'
);
```

BigQuery scripting turns BigQuery from a query engine into a complete ETL platform. You can build sophisticated data pipelines with conditional logic, error handling, batch processing, and dynamic SQL - all running inside BigQuery without needing external orchestration tools for the processing logic itself. For complex ETL that goes beyond what a single SQL statement can express, scripting is the answer.
