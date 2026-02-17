# How to Use MERGE Statements in BigQuery for Upsert Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL, MERGE, Data Engineering

Description: A practical guide to using BigQuery MERGE statements for upsert operations, including patterns for incremental loading, CDC processing, and SCD management.

---

One of the most common data engineering tasks is keeping a target table in sync with incoming data. You need to insert new rows, update existing ones, and sometimes delete rows that no longer exist in the source. In traditional databases, this is called an upsert (update + insert). In BigQuery, the MERGE statement handles this elegantly in a single atomic operation. If you are still deleting and re-inserting data to handle updates, MERGE is a much better approach.

## Basic MERGE Syntax

The MERGE statement compares a source dataset with a target table using a join condition, then performs different actions depending on whether rows match.

```sql
-- Basic upsert: insert new customers, update existing ones
MERGE `my_project.crm.customers` AS target
USING `my_project.staging.customer_updates` AS source
ON target.customer_id = source.customer_id

-- When a matching row exists in both source and target, update it
WHEN MATCHED THEN
  UPDATE SET
    target.name = source.name,
    target.email = source.email,
    target.phone = source.phone,
    target.updated_at = CURRENT_TIMESTAMP()

-- When a row exists in source but not in target, insert it
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, email, phone, created_at, updated_at)
  VALUES (source.customer_id, source.name, source.email, source.phone,
          CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
```

This single statement does what would otherwise require separate UPDATE and INSERT operations (plus the logic to determine which to use for each row).

## MERGE with DELETE

You can also delete rows from the target when they match certain conditions:

```sql
-- Full sync: insert new, update existing, delete removed records
MERGE `my_project.inventory.products` AS target
USING `my_project.staging.product_feed` AS source
ON target.product_id = source.product_id

-- Update products that exist in both source and target
WHEN MATCHED AND source.is_active = TRUE THEN
  UPDATE SET
    target.name = source.name,
    target.price = source.price,
    target.stock_quantity = source.stock_quantity,
    target.updated_at = CURRENT_TIMESTAMP()

-- Delete products that are marked as inactive in the source
WHEN MATCHED AND source.is_active = FALSE THEN
  DELETE

-- Insert new products
WHEN NOT MATCHED BY TARGET THEN
  INSERT (product_id, name, price, stock_quantity, created_at, updated_at)
  VALUES (source.product_id, source.name, source.price,
          source.stock_quantity, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
```

## Handling NOT MATCHED BY SOURCE

BigQuery also supports `WHEN NOT MATCHED BY SOURCE`, which matches rows in the target that have no corresponding row in the source. This is useful for soft-deleting or flagging orphaned records:

```sql
-- Mark target records as deleted if they no longer appear in source
MERGE `my_project.crm.contacts` AS target
USING `my_project.staging.contact_export` AS source
ON target.contact_id = source.contact_id

WHEN MATCHED THEN
  UPDATE SET
    target.name = source.name,
    target.email = source.email,
    target.is_deleted = FALSE,
    target.updated_at = CURRENT_TIMESTAMP()

WHEN NOT MATCHED BY TARGET THEN
  INSERT (contact_id, name, email, is_deleted, created_at, updated_at)
  VALUES (source.contact_id, source.name, source.email, FALSE,
          CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())

-- Rows in target that do not exist in source are soft-deleted
WHEN NOT MATCHED BY SOURCE THEN
  UPDATE SET
    target.is_deleted = TRUE,
    target.updated_at = CURRENT_TIMESTAMP();
```

## Incremental Loading Pattern

One of the most practical MERGE patterns is incremental loading, where you process only the data that has changed since the last load:

```sql
-- Incremental load: only process records modified since last run
-- This is much more efficient than full table replacement
DECLARE last_load_timestamp TIMESTAMP;

-- Get the timestamp of the last successful load
SET last_load_timestamp = (
  SELECT MAX(load_timestamp)
  FROM `my_project.metadata.load_history`
  WHERE table_name = 'orders' AND status = 'success'
);

MERGE `my_project.warehouse.orders` AS target
USING (
  -- Source: only records modified since last load
  SELECT *
  FROM `my_project.staging.orders`
  WHERE modified_at > last_load_timestamp
) AS source
ON target.order_id = source.order_id

WHEN MATCHED AND source.modified_at > target.modified_at THEN
  UPDATE SET
    target.status = source.status,
    target.amount = source.amount,
    target.shipping_address = source.shipping_address,
    target.modified_at = source.modified_at

WHEN NOT MATCHED THEN
  INSERT (order_id, customer_id, status, amount, shipping_address,
          created_at, modified_at)
  VALUES (source.order_id, source.customer_id, source.status,
          source.amount, source.shipping_address,
          source.created_at, source.modified_at);
```

## Change Data Capture (CDC) Processing

MERGE is ideal for processing CDC events from databases. Here is how to apply a stream of insert, update, and delete events:

```sql
-- Process CDC events from a source database
-- Events have an operation type: I (insert), U (update), D (delete)
MERGE `my_project.warehouse.accounts` AS target
USING (
  -- Deduplicate CDC events, keeping only the latest per account
  SELECT * EXCEPT(row_num)
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY account_id
        ORDER BY event_timestamp DESC
      ) AS row_num
    FROM `my_project.staging.cdc_events`
    WHERE event_date = CURRENT_DATE()
  )
  WHERE row_num = 1
) AS source
ON target.account_id = source.account_id

-- Apply updates from U events
WHEN MATCHED AND source.operation = 'U' THEN
  UPDATE SET
    target.account_name = source.account_name,
    target.balance = source.balance,
    target.updated_at = source.event_timestamp

-- Apply deletes from D events
WHEN MATCHED AND source.operation = 'D' THEN
  DELETE

-- Apply inserts from I events
WHEN NOT MATCHED AND source.operation = 'I' THEN
  INSERT (account_id, account_name, balance, created_at, updated_at)
  VALUES (source.account_id, source.account_name, source.balance,
          source.event_timestamp, source.event_timestamp);
```

## Slowly Changing Dimensions (Type 2)

MERGE can implement Type 2 slowly changing dimensions, where you maintain history by closing old records and inserting new ones:

```sql
-- SCD Type 2: maintain history of customer changes
MERGE `my_project.warehouse.dim_customer` AS target
USING `my_project.staging.customer_changes` AS source
ON target.customer_id = source.customer_id
   AND target.is_current = TRUE

-- When the current record differs from the source, close it
WHEN MATCHED
  AND (target.name != source.name OR target.email != source.email) THEN
  UPDATE SET
    target.is_current = FALSE,
    target.valid_to = CURRENT_TIMESTAMP()

-- When there is no current record, insert a new one
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, email, is_current, valid_from, valid_to)
  VALUES (source.customer_id, source.name, source.email,
          TRUE, CURRENT_TIMESTAMP(), TIMESTAMP('9999-12-31'));
```

Note that SCD Type 2 with MERGE requires two passes: first to close old records, then to insert new ones. You can handle this by running the MERGE twice or by using a separate INSERT after the MERGE.

## Performance Tips for MERGE

MERGE operations in BigQuery have some important performance characteristics.

First, the ON clause should be as selective as possible. BigQuery needs to join the source and target tables, so a selective join key reduces the amount of data processed.

Second, partition pruning applies to MERGE. If your target table is partitioned, include the partition column in the ON clause or in a WHERE filter to avoid scanning the entire table:

```sql
-- Partition-pruned MERGE - only scans today's partition
MERGE `my_project.warehouse.events` AS target
USING `my_project.staging.new_events` AS source
ON target.event_id = source.event_id
   AND target.event_date = CURRENT_DATE()  -- Prunes partitions

WHEN MATCHED THEN
  UPDATE SET target.status = source.status

WHEN NOT MATCHED THEN
  INSERT (event_id, event_date, user_id, event_type, status)
  VALUES (source.event_id, source.event_date, source.user_id,
          source.event_type, source.status);
```

Third, keep the source dataset as small as possible. If you are merging from a staging table, filter it down to only the rows you actually need to process.

MERGE is one of those SQL features that simplifies what used to require complex multi-step ETL logic. It handles the insert-or-update decision atomically, supports conditional logic for different scenarios, and works efficiently at BigQuery scale. Once you start using it for your data pipelines, you will find yourself reaching for it constantly.
