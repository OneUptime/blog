# How to Read and Write Delta Lake Tables in Azure Databricks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Delta Lake, Azure Databricks, Data Lake, Apache Spark, Data Engineering, ACID Transactions

Description: Learn how to read and write Delta Lake tables in Azure Databricks including creating tables, performing upserts, time travel, and optimizing performance.

---

Delta Lake is the default storage format in Azure Databricks, and for good reason. It brings ACID transactions, schema enforcement, time travel, and performance optimizations to your data lake. If you have been storing data as plain Parquet files, switching to Delta Lake is one of the highest-impact improvements you can make.

In this post, I will cover everything you need to know about reading and writing Delta Lake tables in Azure Databricks - from basic operations to advanced features like upserts, time travel, and optimization.

## What Delta Lake Adds to Parquet

Delta Lake uses Parquet as the underlying file format but adds a transaction log that tracks every change to the table. This transaction log enables:

- **ACID transactions** - reads and writes are isolated and consistent
- **Schema enforcement** - prevents writing data that does not match the table schema
- **Schema evolution** - add new columns without rewriting existing data
- **Time travel** - query previous versions of the data
- **Upserts (MERGE)** - update existing records and insert new ones in a single operation
- **Small file compaction** - automatically or manually compact many small files into fewer large ones

## Creating a Delta Table

There are several ways to create a Delta table in Databricks.

### Create from a DataFrame

The most common approach is to write a DataFrame as a Delta table.

```python
# create_delta_table.py - Create a Delta table from a DataFrame

# Create sample data
data = [
    (1, "Alice", "Engineering", 95000),
    (2, "Bob", "Marketing", 82000),
    (3, "Carol", "Engineering", 105000),
    (4, "Dave", "Sales", 78000),
]

# Define schema explicitly for clarity
from pyspark.sql.types import StructType, StructField, IntegerType, StringType

schema = StructType([
    StructField("employee_id", IntegerType(), False),
    StructField("name", StringType(), False),
    StructField("department", StringType(), False),
    StructField("salary", IntegerType(), False),
])

df = spark.createDataFrame(data, schema)

# Write as a Delta table to a specific path
df.write.format("delta").mode("overwrite").save("/mnt/datalake/silver/employees")

# Or register it as a managed table in the metastore
df.write.format("delta").mode("overwrite").saveAsTable("silver.employees")
```

### Create Using SQL

```sql
-- Create a managed Delta table using SQL
CREATE TABLE silver.employees (
    employee_id INT NOT NULL,
    name STRING NOT NULL,
    department STRING NOT NULL,
    salary INT NOT NULL
)
USING DELTA
COMMENT 'Employee master data';

-- Create from an existing dataset
CREATE TABLE silver.employees_v2
USING DELTA
AS SELECT * FROM bronze.raw_employees
WHERE is_active = true;
```

### Create with Partitioning

For large tables, partition by a column used frequently in WHERE clauses.

```python
# Write a partitioned Delta table
df.write \
    .format("delta") \
    .mode("overwrite") \
    .partitionBy("department") \
    .save("/mnt/datalake/silver/employees_partitioned")
```

## Reading Delta Tables

Reading Delta tables is straightforward.

```python
# Read from a path
df = spark.read.format("delta").load("/mnt/datalake/silver/employees")

# Read from a registered table
df = spark.table("silver.employees")

# Read with SQL
result = spark.sql("SELECT * FROM silver.employees WHERE department = 'Engineering'")

# Show the results
result.show()
```

## Writing Data

### Append Mode

Add new rows to an existing table.

```python
# Append new records to the Delta table
new_data = [
    (5, "Eve", "Engineering", 92000),
    (6, "Frank", "Marketing", 87000),
]
new_df = spark.createDataFrame(new_data, schema)

# Append mode adds rows without affecting existing data
new_df.write.format("delta").mode("append").saveAsTable("silver.employees")
```

### Overwrite Mode

Replace the entire table content.

```python
# Overwrite replaces all data in the table
df.write.format("delta").mode("overwrite").saveAsTable("silver.employees")
```

### Overwrite Specific Partitions

Replace data in specific partitions while keeping others intact.

```python
# Overwrite only the Engineering partition
engineering_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("replaceWhere", "department = 'Engineering'") \
    .saveAsTable("silver.employees")
```

## Upserts with MERGE

The MERGE operation is one of Delta Lake's most powerful features. It lets you update existing records and insert new ones in a single atomic operation.

```python
# upsert_example.py - Merge (upsert) data into a Delta table
from delta.tables import DeltaTable

# Load the target Delta table
target = DeltaTable.forPath(spark, "/mnt/datalake/silver/employees")

# Source data with updates and new records
updates = [
    (3, "Carol", "Engineering", 115000),   # Update: salary changed
    (7, "Grace", "Engineering", 98000),    # New record
]
source_df = spark.createDataFrame(updates, schema)

# Perform the merge (upsert)
target.alias("target").merge(
    source_df.alias("source"),
    # Match condition - how to find existing records
    "target.employee_id = source.employee_id"
).whenMatchedUpdate(
    # Update existing records with new values
    set={
        "name": "source.name",
        "department": "source.department",
        "salary": "source.salary"
    }
).whenNotMatchedInsert(
    # Insert new records
    values={
        "employee_id": "source.employee_id",
        "name": "source.name",
        "department": "source.department",
        "salary": "source.salary"
    }
).execute()
```

You can also do this with SQL.

```sql
-- MERGE using SQL syntax
MERGE INTO silver.employees AS target
USING staging.employee_updates AS source
ON target.employee_id = source.employee_id
WHEN MATCHED THEN
    UPDATE SET
        target.name = source.name,
        target.department = source.department,
        target.salary = source.salary
WHEN NOT MATCHED THEN
    INSERT (employee_id, name, department, salary)
    VALUES (source.employee_id, source.name, source.department, source.salary);
```

## Time Travel

Delta Lake keeps a history of all changes. You can query previous versions of your data.

```python
# Query a specific version of the table
df_v0 = spark.read.format("delta").option("versionAsOf", 0).load("/mnt/datalake/silver/employees")

# Query the table as it was at a specific timestamp
df_yesterday = spark.read.format("delta") \
    .option("timestampAsOf", "2026-02-15T00:00:00") \
    .load("/mnt/datalake/silver/employees")
```

```sql
-- Time travel with SQL
SELECT * FROM silver.employees VERSION AS OF 3;
SELECT * FROM silver.employees TIMESTAMP AS OF '2026-02-15';
```

### View Table History

```sql
-- See all changes made to the table
DESCRIBE HISTORY silver.employees;
```

This shows every operation (write, merge, delete, optimize) with timestamps, user info, and metrics.

### Restore a Previous Version

If something goes wrong, you can restore the table to a previous state.

```sql
-- Restore the table to version 5
RESTORE TABLE silver.employees TO VERSION AS OF 5;
```

## Schema Evolution

Delta Lake can handle schema changes gracefully.

```python
# Add a new column by enabling schema merge
new_data_with_bonus = [(8, "Heidi", "Sales", 81000, 5000)]
new_schema = schema.add("bonus", IntegerType(), True)
bonus_df = spark.createDataFrame(new_data_with_bonus, new_schema)

# Enable automatic schema merge
bonus_df.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .saveAsTable("silver.employees")

# Existing rows will have NULL for the new 'bonus' column
```

## Optimizing Delta Tables

Over time, Delta tables accumulate many small files from append and merge operations. This hurts read performance.

### OPTIMIZE

Compact small files into larger ones.

```sql
-- Compact small files into larger ones
OPTIMIZE silver.employees;

-- Optimize with Z-ORDER for better query performance on specific columns
OPTIMIZE silver.employees ZORDER BY (department, employee_id);
```

Z-ordering co-locates related data in the same files, which dramatically improves query performance when filtering on those columns.

### VACUUM

Remove old data files that are no longer referenced by the transaction log.

```sql
-- Remove files older than 7 days (default retention)
VACUUM silver.employees;

-- Remove files older than 24 hours (be careful - this limits time travel)
VACUUM silver.employees RETAIN 24 HOURS;
```

Note: VACUUM deletes old versions, which means time travel queries for those versions will fail. Set the retention period based on how far back you need to query.

### Auto-Optimization

Enable automatic optimization at the table or cluster level.

```sql
-- Enable auto-optimize on a specific table
ALTER TABLE silver.employees
SET TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);
```

## Delete and Update Operations

Delta Lake supports standard SQL delete and update operations.

```sql
-- Delete specific records
DELETE FROM silver.employees WHERE employee_id = 4;

-- Update records
UPDATE silver.employees SET salary = 120000 WHERE employee_id = 3;
```

```python
# Delete using Python API
delta_table = DeltaTable.forPath(spark, "/mnt/datalake/silver/employees")
delta_table.delete("employee_id = 4")

# Update using Python API
delta_table.update(
    condition="department = 'Engineering'",
    set={"salary": "salary * 1.10"}  # 10% raise for all engineers
)
```

## Wrapping Up

Delta Lake tables in Azure Databricks give you the reliability of a data warehouse with the flexibility of a data lake. ACID transactions prevent data corruption. Schema enforcement catches bad data before it enters your tables. Time travel lets you recover from mistakes. And MERGE operations simplify the common upsert pattern. Start by converting your existing Parquet tables to Delta format - it is as simple as changing the format from "parquet" to "delta" in your write statements. Then take advantage of OPTIMIZE and VACUUM to keep your tables performing well over time.
