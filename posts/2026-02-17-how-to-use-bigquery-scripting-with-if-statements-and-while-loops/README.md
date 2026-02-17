# How to Use BigQuery Scripting with IF Statements and WHILE Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL Scripting, Control Flow, Data Engineering

Description: A hands-on guide to using BigQuery scripting features including variables, IF-ELSE statements, WHILE loops, and other control flow constructs for complex data processing.

---

Standard SQL is great for querying data, but sometimes you need conditional logic, loops, and variables to handle complex data processing workflows. BigQuery scripting adds procedural programming constructs to SQL, letting you write multi-step scripts that branch and iterate based on runtime conditions.

When I first started using BigQuery scripting, it felt like a game changer for tasks that previously required external orchestration tools. Let me walk through the key features.

## Variables

Everything in BigQuery scripting starts with variables. You declare them with DECLARE and assign values with SET.

```sql
-- Declare variables with types and optional default values
DECLARE target_date DATE DEFAULT CURRENT_DATE();
DECLARE batch_size INT64 DEFAULT 10000;
DECLARE total_processed INT64 DEFAULT 0;
DECLARE status STRING;

-- Assign values with SET
SET target_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- Assign from a query result
SET total_processed = (
  SELECT COUNT(*)
  FROM `my_project.my_dataset.orders`
  WHERE order_date = target_date
);

-- Display the value
SELECT target_date, total_processed;
```

You can also set multiple variables at once from a single query.

```sql
-- Set multiple variables from one query using a STRUCT
DECLARE min_date DATE;
DECLARE max_date DATE;
DECLARE row_count INT64;

SET (min_date, max_date, row_count) = (
  SELECT AS STRUCT
    MIN(order_date),
    MAX(order_date),
    COUNT(*)
  FROM `my_project.my_dataset.orders`
);

SELECT min_date, max_date, row_count;
```

## IF-ELSE Statements

IF statements let you conditionally execute blocks of SQL.

```sql
-- Basic IF-ELSE example
DECLARE row_count INT64;
SET row_count = (
  SELECT COUNT(*)
  FROM `my_project.my_dataset.staging_orders`
);

-- Only process if there is data in the staging table
IF row_count > 0 THEN
  -- Insert new data into the production table
  INSERT INTO `my_project.my_dataset.orders`
  SELECT * FROM `my_project.my_dataset.staging_orders`;

  -- Clear the staging table
  DELETE FROM `my_project.my_dataset.staging_orders` WHERE TRUE;

  SELECT CONCAT('Processed ', CAST(row_count AS STRING), ' rows') AS result;
ELSE
  SELECT 'No rows to process' AS result;
END IF;
```

You can chain multiple conditions with ELSEIF.

```sql
-- Multi-branch conditional logic based on data quality
DECLARE null_pct FLOAT64;
DECLARE duplicate_pct FLOAT64;

-- Check data quality metrics
SET null_pct = (
  SELECT COUNTIF(customer_id IS NULL) * 100.0 / COUNT(*)
  FROM `my_project.my_dataset.staging_orders`
);

SET duplicate_pct = (
  SELECT (COUNT(*) - COUNT(DISTINCT order_id)) * 100.0 / COUNT(*)
  FROM `my_project.my_dataset.staging_orders`
);

-- Branch based on quality thresholds
IF null_pct > 10 THEN
  -- Too many nulls, reject the batch
  INSERT INTO `my_project.my_dataset.quality_log`
  VALUES (CURRENT_TIMESTAMP(), 'REJECTED', 'Null rate too high', null_pct);

ELSEIF duplicate_pct > 5 THEN
  -- Deduplicate before loading
  INSERT INTO `my_project.my_dataset.orders`
  SELECT DISTINCT *
  FROM `my_project.my_dataset.staging_orders`
  WHERE customer_id IS NOT NULL;

  INSERT INTO `my_project.my_dataset.quality_log`
  VALUES (CURRENT_TIMESTAMP(), 'LOADED_DEDUPED', 'Duplicates removed', duplicate_pct);

ELSE
  -- Data quality is good, load directly
  INSERT INTO `my_project.my_dataset.orders`
  SELECT *
  FROM `my_project.my_dataset.staging_orders`;

  INSERT INTO `my_project.my_dataset.quality_log`
  VALUES (CURRENT_TIMESTAMP(), 'LOADED', 'Clean data', 0);
END IF;
```

## WHILE Loops

WHILE loops let you repeat a block of statements until a condition is met. This is useful for batch processing, retry logic, or iterating over date ranges.

```sql
-- Process data in daily batches using a WHILE loop
DECLARE current_date_val DATE DEFAULT '2026-01-01';
DECLARE end_date DATE DEFAULT '2026-01-31';
DECLARE daily_count INT64;

WHILE current_date_val <= end_date DO
  -- Process one day's worth of data
  INSERT INTO `my_project.my_dataset.daily_summary`
  SELECT
    current_date_val AS report_date,
    region,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue
  FROM `my_project.my_dataset.orders`
  WHERE order_date = current_date_val
  GROUP BY region;

  -- Log progress
  SET daily_count = (
    SELECT COUNT(*)
    FROM `my_project.my_dataset.orders`
    WHERE order_date = current_date_val
  );

  SELECT CONCAT('Processed ', CAST(current_date_val AS STRING),
                ': ', CAST(daily_count AS STRING), ' rows') AS progress;

  -- Move to next day
  SET current_date_val = DATE_ADD(current_date_val, INTERVAL 1 DAY);
END WHILE;
```

## Batch Processing with Loops

A common pattern is processing large tables in chunks to avoid timeouts or manage memory.

```sql
-- Process a large table in batches of 100,000 rows
DECLARE batch_start INT64 DEFAULT 0;
DECLARE batch_size INT64 DEFAULT 100000;
DECLARE max_id INT64;
DECLARE batches_processed INT64 DEFAULT 0;

-- Get the maximum ID to know when to stop
SET max_id = (SELECT MAX(row_id) FROM `my_project.my_dataset.raw_events`);

WHILE batch_start <= max_id DO
  -- Process one batch
  INSERT INTO `my_project.my_dataset.processed_events`
  SELECT
    row_id,
    event_type,
    UPPER(user_email) AS normalized_email,
    PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S', timestamp_string) AS parsed_timestamp
  FROM `my_project.my_dataset.raw_events`
  WHERE row_id >= batch_start
    AND row_id < batch_start + batch_size;

  SET batch_start = batch_start + batch_size;
  SET batches_processed = batches_processed + 1;
END WHILE;

SELECT CONCAT('Completed: ', CAST(batches_processed AS STRING), ' batches') AS result;
```

## LOOP and LEAVE

For more flexible loop control, use LOOP with LEAVE (break) and CONTINUE (skip).

```sql
-- Use LOOP with LEAVE for retry logic
DECLARE attempt INT64 DEFAULT 0;
DECLARE max_attempts INT64 DEFAULT 3;
DECLARE success BOOL DEFAULT FALSE;
DECLARE error_count INT64;

LOOP
  SET attempt = attempt + 1;

  -- Try to process the data
  INSERT INTO `my_project.my_dataset.output_table`
  SELECT *
  FROM `my_project.my_dataset.input_table`
  WHERE processed = FALSE;

  -- Check if all rows were processed successfully
  SET error_count = (
    SELECT COUNT(*)
    FROM `my_project.my_dataset.input_table`
    WHERE processed = FALSE
  );

  IF error_count = 0 THEN
    SET success = TRUE;
    LEAVE;  -- Exit the loop on success
  END IF;

  IF attempt >= max_attempts THEN
    LEAVE;  -- Exit after max attempts
  END IF;

  -- Brief pause logic could go here
  -- In practice, you might want to log the retry
  SELECT CONCAT('Retry attempt ', CAST(attempt AS STRING),
                ', remaining errors: ', CAST(error_count AS STRING)) AS retry_status;
END LOOP;

-- Report final status
IF success THEN
  SELECT 'Processing completed successfully' AS final_status;
ELSE
  SELECT CONCAT('Processing failed after ', CAST(max_attempts AS STRING), ' attempts') AS final_status;
END IF;
```

## CONTINUE Statement

CONTINUE skips the rest of the current loop iteration and moves to the next one.

```sql
-- Skip weekends when processing daily data
DECLARE current_day DATE DEFAULT '2026-01-01';
DECLARE end_day DATE DEFAULT '2026-01-31';

WHILE current_day <= end_day DO
  -- Skip weekends
  IF EXTRACT(DAYOFWEEK FROM current_day) IN (1, 7) THEN
    SET current_day = DATE_ADD(current_day, INTERVAL 1 DAY);
    CONTINUE;
  END IF;

  -- Process weekday data
  INSERT INTO `my_project.my_dataset.weekday_summary`
  SELECT
    current_day AS business_date,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
  FROM `my_project.my_dataset.transactions`
  WHERE transaction_date = current_day;

  SET current_day = DATE_ADD(current_day, INTERVAL 1 DAY);
END WHILE;
```

## BEGIN-END Blocks with Exception Handling

You can use BEGIN-EXCEPTION-END blocks for error handling.

```sql
-- Error handling with BEGIN-EXCEPTION-END
DECLARE process_status STRING DEFAULT 'STARTED';

BEGIN
  -- Attempt a complex operation
  INSERT INTO `my_project.my_dataset.target_table`
  SELECT *
  FROM `my_project.my_dataset.source_table`
  WHERE validation_check = TRUE;

  SET process_status = 'COMPLETED';

EXCEPTION WHEN ERROR THEN
  -- Handle the error
  SET process_status = CONCAT('FAILED: ', @@error.message);

  -- Log the error
  INSERT INTO `my_project.my_dataset.error_log`
  VALUES (CURRENT_TIMESTAMP(), @@error.message, @@error.stack_trace);
END;

SELECT process_status;
```

## Practical Example: Data Pipeline Script

Here is a more complete example that combines several scripting features into a data pipeline.

```sql
-- Complete data pipeline script with validation, processing, and logging
DECLARE pipeline_date DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);
DECLARE source_count INT64;
DECLARE processed_count INT64;
DECLARE pipeline_id STRING DEFAULT GENERATE_UUID();

-- Step 1: Check source data availability
SET source_count = (
  SELECT COUNT(*)
  FROM `my_project.my_dataset.raw_events`
  WHERE event_date = pipeline_date
);

IF source_count = 0 THEN
  INSERT INTO `my_project.my_dataset.pipeline_log`
  VALUES (pipeline_id, pipeline_date, 'SKIPPED', 'No source data', CURRENT_TIMESTAMP());
ELSE
  BEGIN
    -- Step 2: Clean and transform data
    CREATE TEMP TABLE cleaned_events AS
    SELECT
      event_id,
      LOWER(TRIM(user_email)) AS user_email,
      event_type,
      event_date,
      event_timestamp,
      properties
    FROM `my_project.my_dataset.raw_events`
    WHERE event_date = pipeline_date
      AND event_id IS NOT NULL
      AND user_email IS NOT NULL;

    -- Step 3: Load into target table
    INSERT INTO `my_project.my_dataset.events`
    SELECT * FROM cleaned_events;

    SET processed_count = (SELECT COUNT(*) FROM cleaned_events);

    -- Step 4: Log success
    INSERT INTO `my_project.my_dataset.pipeline_log`
    VALUES (pipeline_id, pipeline_date, 'SUCCESS',
            CONCAT('Processed ', CAST(processed_count AS STRING), ' of ', CAST(source_count AS STRING), ' rows'),
            CURRENT_TIMESTAMP());

  EXCEPTION WHEN ERROR THEN
    INSERT INTO `my_project.my_dataset.pipeline_log`
    VALUES (pipeline_id, pipeline_date, 'FAILED', @@error.message, CURRENT_TIMESTAMP());
  END;
END IF;
```

## Wrapping Up

BigQuery scripting transforms SQL from a query language into a proper programming environment. Variables, IF statements, WHILE loops, and exception handling let you build sophisticated data processing workflows entirely within BigQuery. For many use cases, this eliminates the need for external orchestration tools - your logic stays close to your data.

If you are building production data pipelines with BigQuery scripting, [OneUptime](https://oneuptime.com) can help you monitor execution times, track failures, and set up alerts when your scripts do not complete as expected.
