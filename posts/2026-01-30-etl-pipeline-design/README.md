# How to Implement ETL Pipeline Design

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ETL, Data Pipeline, Data Engineering, Architecture

Description: Learn how to design extract, transform, load pipelines for data integration and warehousing.

---

Data engineering relies heavily on ETL (Extract, Transform, Load) pipelines to move and process data from source systems into data warehouses and analytics platforms. A well-designed ETL pipeline ensures data quality, reliability, and scalability. This guide covers the fundamental patterns and provides practical implementation examples using popular tools like Apache Airflow and dbt.

## Understanding ETL Architecture

Before diving into implementation, let us understand the high-level architecture of an ETL pipeline:

```mermaid
flowchart LR
    subgraph Sources
        A1[Database]
        A2[API]
        A3[Files]
    end

    subgraph Extract
        B[Data Extraction Layer]
    end

    subgraph Transform
        C[Data Transformation Layer]
    end

    subgraph Load
        D[Data Loading Layer]
    end

    subgraph Destinations
        E1[Data Warehouse]
        E2[Data Lake]
        E3[Analytics DB]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    B --> C
    C --> D
    D --> E1
    D --> E2
    D --> E3
```

## ETL vs ELT: Choosing the Right Approach

Modern data architectures often use ELT (Extract, Load, Transform) instead of traditional ETL. Here is a comparison:

```mermaid
flowchart TB
    subgraph ETL["Traditional ETL"]
        direction LR
        E1[Extract] --> T1[Transform] --> L1[Load]
    end

    subgraph ELT["Modern ELT"]
        direction LR
        E2[Extract] --> L2[Load] --> T2[Transform]
    end
```

**When to use ETL:**
- Data needs cleansing before storage
- Storage costs are a concern
- Compliance requires data masking before loading

**When to use ELT:**
- You have a powerful data warehouse (Snowflake, BigQuery)
- Raw data needs to be preserved
- Transformations may change over time

## Part 1: Data Extraction Patterns

### Pattern 1: Full Extraction

Full extraction pulls all data from the source system each time. This is simple but resource-intensive.

```python
# full_extraction.py
# Full extraction pattern for database sources
# Use this when data volumes are small or you need complete refreshes

import pandas as pd
from sqlalchemy import create_engine

def full_extract(connection_string: str, table_name: str) -> pd.DataFrame:
    """
    Extract all records from a source table.

    Args:
        connection_string: Database connection string
        table_name: Name of the table to extract

    Returns:
        DataFrame containing all records from the source table
    """
    # Create database engine
    engine = create_engine(connection_string)

    # Build extraction query
    query = f"SELECT * FROM {table_name}"

    # Execute extraction and return results
    with engine.connect() as connection:
        df = pd.read_sql(query, connection)

    return df


# Example usage
if __name__ == "__main__":
    # Configuration for source database
    SOURCE_DB = "postgresql://user:password@localhost:5432/source_db"

    # Extract all customer records
    customers_df = full_extract(SOURCE_DB, "customers")

    print(f"Extracted {len(customers_df)} records")
```

### Pattern 2: Incremental Extraction

Incremental extraction only pulls new or changed data, reducing load on source systems.

```python
# incremental_extraction.py
# Incremental extraction using timestamp-based change detection
# This is the preferred approach for large datasets

import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime, timedelta

def incremental_extract(
    connection_string: str,
    table_name: str,
    timestamp_column: str,
    last_extracted: datetime
) -> pd.DataFrame:
    """
    Extract only records modified since the last extraction.

    Args:
        connection_string: Database connection string
        table_name: Name of the table to extract
        timestamp_column: Column containing modification timestamp
        last_extracted: Timestamp of the last successful extraction

    Returns:
        DataFrame containing only new or modified records
    """
    engine = create_engine(connection_string)

    # Query for records modified after last extraction
    query = f"""
        SELECT *
        FROM {table_name}
        WHERE {timestamp_column} > %(last_extracted)s
        ORDER BY {timestamp_column}
    """

    with engine.connect() as connection:
        df = pd.read_sql(
            query,
            connection,
            params={"last_extracted": last_extracted}
        )

    return df


def get_last_extraction_timestamp(metadata_db: str, pipeline_name: str) -> datetime:
    """
    Retrieve the timestamp of the last successful extraction.

    Args:
        metadata_db: Connection string for metadata database
        pipeline_name: Identifier for the pipeline

    Returns:
        Timestamp of last extraction, or default start date
    """
    engine = create_engine(metadata_db)

    query = """
        SELECT MAX(extraction_timestamp) as last_ts
        FROM pipeline_metadata
        WHERE pipeline_name = %(pipeline_name)s
        AND status = 'success'
    """

    with engine.connect() as connection:
        result = pd.read_sql(query, connection, params={"pipeline_name": pipeline_name})

    # Return last timestamp or default to 30 days ago
    if result["last_ts"].iloc[0] is None:
        return datetime.now() - timedelta(days=30)

    return result["last_ts"].iloc[0]
```

### Pattern 3: Change Data Capture (CDC)

CDC captures changes at the database level for real-time data synchronization.

```mermaid
sequenceDiagram
    participant Source as Source Database
    participant CDC as CDC System
    participant Queue as Message Queue
    participant Target as Target System

    Source->>CDC: Transaction Log
    CDC->>CDC: Parse Changes
    CDC->>Queue: Publish Events
    Queue->>Target: Consume Events
    Target->>Target: Apply Changes
```

```python
# cdc_consumer.py
# Change Data Capture consumer using Debezium-style events
# Processes database changes in near real-time

from kafka import KafkaConsumer
import json

class CDCConsumer:
    """
    Consumer for CDC events from Debezium or similar systems.
    Processes INSERT, UPDATE, and DELETE operations.
    """

    def __init__(self, bootstrap_servers: list, topic: str, group_id: str):
        """
        Initialize the CDC consumer.

        Args:
            bootstrap_servers: List of Kafka broker addresses
            topic: Kafka topic containing CDC events
            group_id: Consumer group identifier
        """
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest"
        )

    def process_events(self, handler):
        """
        Process CDC events using the provided handler function.

        Args:
            handler: Function to process each event
        """
        for message in self.consumer:
            event = message.value

            # Extract operation type from CDC event
            operation = event.get("op")

            # Map Debezium operation codes to actions
            if operation == "c":
                # Create (INSERT) operation
                handler.handle_insert(event["after"])
            elif operation == "u":
                # Update operation
                handler.handle_update(event["before"], event["after"])
            elif operation == "d":
                # Delete operation
                handler.handle_delete(event["before"])

            # Commit offset after successful processing
            self.consumer.commit()
```

## Part 2: Data Transformation Patterns

### Transformation Flow

```mermaid
flowchart TB
    subgraph Raw["Raw Layer"]
        R1[Raw Data]
    end

    subgraph Staging["Staging Layer"]
        S1[Data Validation]
        S2[Type Casting]
        S3[Null Handling]
    end

    subgraph Transform["Transform Layer"]
        T1[Business Logic]
        T2[Aggregations]
        T3[Joins]
    end

    subgraph Marts["Data Marts"]
        M1[Finance Mart]
        M2[Sales Mart]
        M3[Operations Mart]
    end

    R1 --> S1 --> S2 --> S3
    S3 --> T1 --> T2 --> T3
    T3 --> M1
    T3 --> M2
    T3 --> M3
```

### Pattern 1: Data Validation

```python
# data_validation.py
# Comprehensive data validation framework
# Ensures data quality before transformation

from dataclasses import dataclass
from typing import List, Callable, Any
import pandas as pd

@dataclass
class ValidationRule:
    """
    Defines a single validation rule for data quality checks.
    """
    name: str                           # Human-readable rule name
    check: Callable[[pd.DataFrame], bool]  # Validation function
    severity: str                       # "error" or "warning"
    description: str                    # Rule description


class DataValidator:
    """
    Validates DataFrames against a set of rules.
    Supports both hard failures and warnings.
    """

    def __init__(self):
        self.rules: List[ValidationRule] = []
        self.validation_results: List[dict] = []

    def add_rule(self, rule: ValidationRule):
        """Add a validation rule to the validator."""
        self.rules.append(rule)

    def validate(self, df: pd.DataFrame) -> bool:
        """
        Run all validation rules against the DataFrame.

        Args:
            df: DataFrame to validate

        Returns:
            True if all error-level rules pass, False otherwise
        """
        self.validation_results = []
        all_passed = True

        for rule in self.rules:
            try:
                passed = rule.check(df)
            except Exception as e:
                passed = False

            # Record result
            self.validation_results.append({
                "rule": rule.name,
                "passed": passed,
                "severity": rule.severity
            })

            # Only fail on error-level rules
            if not passed and rule.severity == "error":
                all_passed = False

        return all_passed


# Example validation rules
def create_customer_validator() -> DataValidator:
    """
    Create a validator with rules for customer data.
    """
    validator = DataValidator()

    # Rule 1: Check for null customer IDs
    validator.add_rule(ValidationRule(
        name="no_null_customer_id",
        check=lambda df: df["customer_id"].notna().all(),
        severity="error",
        description="Customer ID must not be null"
    ))

    # Rule 2: Check for valid email format
    validator.add_rule(ValidationRule(
        name="valid_email_format",
        check=lambda df: df["email"].str.contains(r"^[\w\.-]+@[\w\.-]+\.\w+$", regex=True).all(),
        severity="warning",
        description="Email should match standard format"
    ))

    # Rule 3: Check for duplicate records
    validator.add_rule(ValidationRule(
        name="no_duplicates",
        check=lambda df: not df.duplicated(subset=["customer_id"]).any(),
        severity="error",
        description="No duplicate customer IDs allowed"
    ))

    return validator
```

### Pattern 2: Type Casting and Cleaning

```python
# data_cleaning.py
# Standard data cleaning and type conversion utilities
# Apply these transformations before business logic

import pandas as pd
from typing import Dict, Any

class DataCleaner:
    """
    Standardizes data types and handles common cleaning tasks.
    """

    def __init__(self, schema: Dict[str, str]):
        """
        Initialize with target schema.

        Args:
            schema: Dictionary mapping column names to target types
        """
        self.schema = schema

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply all cleaning transformations.

        Args:
            df: Raw DataFrame

        Returns:
            Cleaned DataFrame with correct types
        """
        df = df.copy()

        # Apply type conversions
        df = self._cast_types(df)

        # Standardize string columns
        df = self._clean_strings(df)

        # Handle null values
        df = self._handle_nulls(df)

        return df

    def _cast_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Cast columns to their target types.
        """
        for column, dtype in self.schema.items():
            if column not in df.columns:
                continue

            if dtype == "datetime":
                df[column] = pd.to_datetime(df[column], errors="coerce")
            elif dtype == "integer":
                df[column] = pd.to_numeric(df[column], errors="coerce").astype("Int64")
            elif dtype == "float":
                df[column] = pd.to_numeric(df[column], errors="coerce")
            elif dtype == "string":
                df[column] = df[column].astype(str)
            elif dtype == "boolean":
                df[column] = df[column].astype(bool)

        return df

    def _clean_strings(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize string columns by trimming whitespace and converting case.
        """
        string_columns = df.select_dtypes(include=["object"]).columns

        for column in string_columns:
            # Remove leading and trailing whitespace
            df[column] = df[column].str.strip()

            # Replace multiple spaces with single space
            df[column] = df[column].str.replace(r"\s+", " ", regex=True)

        return df

    def _handle_nulls(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Replace common null representations with proper NaN values.
        """
        # Common null value representations
        null_values = ["", "NULL", "null", "None", "N/A", "n/a", "NA"]

        df = df.replace(null_values, pd.NA)

        return df


# Example usage
if __name__ == "__main__":
    # Define target schema
    customer_schema = {
        "customer_id": "integer",
        "email": "string",
        "created_at": "datetime",
        "is_active": "boolean",
        "lifetime_value": "float"
    }

    cleaner = DataCleaner(customer_schema)

    # Apply cleaning
    raw_df = pd.DataFrame({
        "customer_id": ["1", "2", "3"],
        "email": ["  test@example.com  ", "user@test.com", "NULL"],
        "created_at": ["2024-01-15", "2024-02-20", "2024-03-10"],
        "is_active": [True, False, True],
        "lifetime_value": ["100.50", "250.00", "N/A"]
    })

    cleaned_df = cleaner.clean(raw_df)
```

### Pattern 3: Business Logic Transformations with dbt

dbt (data build tool) is the industry standard for transformation logic in modern data stacks.

```yaml
# dbt_project.yml
# Project configuration for dbt transformations

name: 'analytics'
version: '1.0.0'

profile: 'analytics'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]

vars:
  # Default date range for incremental models
  start_date: '2024-01-01'

  # Schema names
  raw_schema: 'raw'
  staging_schema: 'staging'
  marts_schema: 'marts'
```

```sql
-- models/staging/stg_orders.sql
-- Staging model for orders data
-- Cleans and standardizes raw order data

{{
    config(
        materialized='view',
        schema='staging'
    )
}}

with source as (
    -- Reference the raw orders table
    select * from {{ source('raw', 'orders') }}
),

cleaned as (
    select
        -- Primary key
        order_id,

        -- Foreign keys
        customer_id,
        product_id,

        -- Order details
        cast(quantity as integer) as quantity,
        cast(unit_price as decimal(10, 2)) as unit_price,

        -- Calculate line total
        cast(quantity as integer) * cast(unit_price as decimal(10, 2)) as line_total,

        -- Standardize status values
        case
            when lower(status) in ('pending', 'new') then 'PENDING'
            when lower(status) in ('processing', 'in_progress') then 'PROCESSING'
            when lower(status) in ('shipped', 'in_transit') then 'SHIPPED'
            when lower(status) in ('delivered', 'completed') then 'DELIVERED'
            when lower(status) in ('cancelled', 'canceled') then 'CANCELLED'
            else 'UNKNOWN'
        end as order_status,

        -- Parse and standardize timestamps
        cast(order_date as timestamp) as ordered_at,
        cast(ship_date as timestamp) as shipped_at,
        cast(delivery_date as timestamp) as delivered_at,

        -- Metadata
        current_timestamp as transformed_at

    from source

    -- Filter out test orders
    where order_id not like 'TEST%'
)

select * from cleaned
```

```sql
-- models/marts/fct_daily_sales.sql
-- Fact table for daily sales metrics
-- Aggregates order data for reporting

{{
    config(
        materialized='incremental',
        unique_key='date_day',
        schema='marts'
    )
}}

with orders as (
    -- Use the staged orders model
    select * from {{ ref('stg_orders') }}

    {% if is_incremental() %}
    -- Only process new data in incremental runs
    where ordered_at > (select max(date_day) from {{ this }})
    {% endif %}
),

daily_aggregates as (
    select
        -- Date dimension
        date_trunc('day', ordered_at) as date_day,

        -- Sales metrics
        count(distinct order_id) as total_orders,
        count(distinct customer_id) as unique_customers,
        sum(line_total) as gross_revenue,

        -- Order status breakdown
        count(case when order_status = 'DELIVERED' then 1 end) as delivered_orders,
        count(case when order_status = 'CANCELLED' then 1 end) as cancelled_orders,

        -- Average metrics
        avg(line_total) as avg_order_value,
        avg(quantity) as avg_items_per_order

    from orders
    group by 1
)

select
    date_day,
    total_orders,
    unique_customers,
    gross_revenue,
    delivered_orders,
    cancelled_orders,
    avg_order_value,
    avg_items_per_order,

    -- Calculate rates
    round(delivered_orders * 100.0 / nullif(total_orders, 0), 2) as delivery_rate,
    round(cancelled_orders * 100.0 / nullif(total_orders, 0), 2) as cancellation_rate,

    -- Metadata
    current_timestamp as refreshed_at

from daily_aggregates
```

```sql
-- models/marts/dim_customers.sql
-- Customer dimension table with aggregated metrics
-- Type 1 slowly changing dimension (overwrite)

{{
    config(
        materialized='table',
        schema='marts'
    )
}}

with customers as (
    select * from {{ ref('stg_customers') }}
),

orders as (
    select * from {{ ref('stg_orders') }}
),

customer_orders as (
    -- Aggregate order history per customer
    select
        customer_id,
        count(distinct order_id) as total_orders,
        sum(line_total) as lifetime_value,
        min(ordered_at) as first_order_at,
        max(ordered_at) as last_order_at,
        avg(line_total) as avg_order_value
    from orders
    where order_status != 'CANCELLED'
    group by 1
),

final as (
    select
        -- Customer attributes
        c.customer_id,
        c.email,
        c.first_name,
        c.last_name,
        c.created_at as customer_since,

        -- Derived attributes
        coalesce(o.total_orders, 0) as total_orders,
        coalesce(o.lifetime_value, 0) as lifetime_value,
        o.first_order_at,
        o.last_order_at,
        coalesce(o.avg_order_value, 0) as avg_order_value,

        -- Customer segments
        case
            when o.lifetime_value >= 10000 then 'PLATINUM'
            when o.lifetime_value >= 5000 then 'GOLD'
            when o.lifetime_value >= 1000 then 'SILVER'
            when o.total_orders > 0 then 'BRONZE'
            else 'PROSPECT'
        end as customer_tier,

        -- Recency calculation
        datediff('day', o.last_order_at, current_date) as days_since_last_order,

        -- Metadata
        current_timestamp as refreshed_at

    from customers c
    left join customer_orders o using (customer_id)
)

select * from final
```

## Part 3: Data Loading Patterns

### Loading Strategy Overview

```mermaid
flowchart TB
    subgraph Strategies["Loading Strategies"]
        A[Full Load]
        B[Incremental Load]
        C[Merge/Upsert]
        D[Append Only]
    end

    subgraph UseCases["Use Cases"]
        A --> A1[Small Tables]
        A --> A2[Dimension Refresh]
        B --> B1[Large Tables]
        B --> B2[Time Series Data]
        C --> C1[Slowly Changing Dims]
        C --> C2[Master Data]
        D --> D1[Event Logs]
        D --> D2[Audit Tables]
    end
```

### Pattern 1: Full Load

```python
# full_load.py
# Full table replacement loading pattern
# Use for small dimensions or when complete refresh is needed

import pandas as pd
from sqlalchemy import create_engine, text

def full_load(
    df: pd.DataFrame,
    connection_string: str,
    table_name: str,
    schema: str = "public"
) -> int:
    """
    Load data by completely replacing the target table.

    Args:
        df: DataFrame to load
        connection_string: Target database connection string
        table_name: Name of the target table
        schema: Database schema name

    Returns:
        Number of rows loaded
    """
    engine = create_engine(connection_string)

    with engine.begin() as connection:
        # Truncate existing data
        connection.execute(text(f"TRUNCATE TABLE {schema}.{table_name}"))

        # Load new data
        df.to_sql(
            name=table_name,
            con=connection,
            schema=schema,
            if_exists="append",
            index=False,
            method="multi",     # Use multi-row inserts for performance
            chunksize=10000     # Batch size for large datasets
        )

    return len(df)


# Example usage
if __name__ == "__main__":
    # Target warehouse configuration
    WAREHOUSE_DB = "postgresql://user:password@localhost:5432/warehouse"

    # Load dimension table
    dim_products = pd.read_csv("dim_products.csv")
    rows_loaded = full_load(dim_products, WAREHOUSE_DB, "dim_products", "marts")

    print(f"Loaded {rows_loaded} rows into dim_products")
```

### Pattern 2: Merge/Upsert Loading

```python
# merge_load.py
# Upsert loading pattern for handling updates and inserts
# Use for slowly changing dimensions and master data

import pandas as pd
from sqlalchemy import create_engine, text
from typing import List

def merge_load(
    df: pd.DataFrame,
    connection_string: str,
    table_name: str,
    schema: str,
    key_columns: List[str],
    update_columns: List[str]
) -> dict:
    """
    Load data using merge/upsert pattern (insert or update).

    Args:
        df: DataFrame to load
        connection_string: Target database connection string
        table_name: Name of the target table
        schema: Database schema name
        key_columns: Columns that define record uniqueness
        update_columns: Columns to update on conflict

    Returns:
        Dictionary with insert and update counts
    """
    engine = create_engine(connection_string)

    # Build the MERGE statement (PostgreSQL syntax using ON CONFLICT)
    columns = df.columns.tolist()
    column_list = ", ".join(columns)
    value_placeholders = ", ".join([f":{col}" for col in columns])
    key_list = ", ".join(key_columns)

    # Build UPDATE SET clause
    update_set = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_columns])

    merge_sql = f"""
        INSERT INTO {schema}.{table_name} ({column_list})
        VALUES ({value_placeholders})
        ON CONFLICT ({key_list})
        DO UPDATE SET {update_set}
    """

    with engine.begin() as connection:
        # Execute merge for each row
        for _, row in df.iterrows():
            connection.execute(
                text(merge_sql),
                row.to_dict()
            )

    return {"rows_processed": len(df)}


# Snowflake-specific MERGE implementation
def snowflake_merge_load(
    df: pd.DataFrame,
    connection_string: str,
    table_name: str,
    schema: str,
    key_columns: List[str]
) -> dict:
    """
    Load data using Snowflake MERGE statement.
    Provides detailed metrics on inserts and updates.
    """
    from snowflake.connector.pandas_tools import write_pandas
    import snowflake.connector

    # Create staging table name
    staging_table = f"stg_{table_name}_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S')}"

    # Parse connection string components
    conn_params = parse_snowflake_connection(connection_string)

    with snowflake.connector.connect(**conn_params) as conn:
        cursor = conn.cursor()

        try:
            # Create temporary staging table
            cursor.execute(f"""
                CREATE TEMPORARY TABLE {schema}.{staging_table}
                LIKE {schema}.{table_name}
            """)

            # Load data into staging
            write_pandas(conn, df, staging_table, schema=schema)

            # Build MERGE statement
            join_condition = " AND ".join(
                [f"target.{col} = source.{col}" for col in key_columns]
            )

            all_columns = df.columns.tolist()
            non_key_columns = [col for col in all_columns if col not in key_columns]

            update_set = ", ".join(
                [f"target.{col} = source.{col}" for col in non_key_columns]
            )

            insert_columns = ", ".join(all_columns)
            insert_values = ", ".join([f"source.{col}" for col in all_columns])

            merge_sql = f"""
                MERGE INTO {schema}.{table_name} AS target
                USING {schema}.{staging_table} AS source
                ON {join_condition}
                WHEN MATCHED THEN
                    UPDATE SET {update_set}
                WHEN NOT MATCHED THEN
                    INSERT ({insert_columns})
                    VALUES ({insert_values})
            """

            # Execute merge and get results
            cursor.execute(merge_sql)

            # Get merge statistics
            cursor.execute("SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))")
            result = cursor.fetchone()

            return {
                "rows_inserted": result[0] if result else 0,
                "rows_updated": result[1] if result else 0
            }

        finally:
            # Clean up staging table
            cursor.execute(f"DROP TABLE IF EXISTS {schema}.{staging_table}")
```

### Pattern 3: Append-Only Loading

```python
# append_load.py
# Append-only loading for event and log data
# Optimized for high-volume time-series data

import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime

def append_load(
    df: pd.DataFrame,
    connection_string: str,
    table_name: str,
    schema: str,
    partition_column: str = None
) -> dict:
    """
    Append data to table without modifying existing records.

    Args:
        df: DataFrame to load
        connection_string: Target database connection string
        table_name: Name of the target table
        schema: Database schema name
        partition_column: Optional column for partition pruning

    Returns:
        Dictionary with load statistics
    """
    engine = create_engine(connection_string)

    # Add load metadata
    df = df.copy()
    df["_loaded_at"] = datetime.now()
    df["_batch_id"] = datetime.now().strftime("%Y%m%d%H%M%S")

    # Load data
    df.to_sql(
        name=table_name,
        con=engine,
        schema=schema,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=50000     # Larger chunks for append operations
    )

    return {
        "rows_loaded": len(df),
        "batch_id": df["_batch_id"].iloc[0],
        "partition_value": df[partition_column].max() if partition_column else None
    }
```

## Part 4: Orchestrating ETL with Apache Airflow

```mermaid
flowchart TB
    subgraph Airflow["Apache Airflow"]
        direction TB
        S[Scheduler]
        W[Workers]
        M[Metadata DB]
        UI[Web UI]

        S --> W
        S --> M
        UI --> M
    end

    subgraph DAG["ETL DAG"]
        direction LR
        T1[Extract] --> T2[Validate]
        T2 --> T3[Transform]
        T3 --> T4[Load]
        T4 --> T5[Test]
    end

    Airflow --> DAG
```

### Complete ETL Pipeline DAG

```python
# dags/etl_sales_pipeline.py
# Complete ETL pipeline for sales data
# Runs daily at 6 AM UTC

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.utils.dates import days_ago
from airflow.utils.task_group import TaskGroup
from datetime import datetime, timedelta

# Default arguments for all tasks
default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "email": ["data-alerts@company.com"],
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

# Create the DAG
dag = DAG(
    dag_id="etl_sales_pipeline",
    default_args=default_args,
    description="Daily ETL pipeline for sales data",
    schedule_interval="0 6 * * *",      # Run at 6 AM UTC daily
    start_date=days_ago(1),
    catchup=False,                       # Do not backfill
    tags=["etl", "sales", "production"],
    max_active_runs=1,                   # Prevent concurrent runs
)


def extract_sales_data(**context):
    """
    Extract sales data from source systems.
    Uses incremental extraction based on execution date.
    """
    from includes.extractors import SalesExtractor

    # Get execution date from Airflow context
    execution_date = context["execution_date"]

    extractor = SalesExtractor(
        connection_id="source_db",
        start_date=execution_date - timedelta(days=1),
        end_date=execution_date
    )

    # Extract and save to staging
    df = extractor.extract()
    staging_path = f"/data/staging/sales/{execution_date.strftime('%Y%m%d')}"
    df.to_parquet(staging_path)

    # Push metadata to XCom for downstream tasks
    context["ti"].xcom_push(key="record_count", value=len(df))
    context["ti"].xcom_push(key="staging_path", value=staging_path)

    return staging_path


def validate_extracted_data(**context):
    """
    Validate extracted data quality.
    Fails the task if critical validations fail.
    """
    from includes.validators import SalesValidator
    import pandas as pd

    # Get staging path from upstream task
    staging_path = context["ti"].xcom_pull(
        task_ids="extract_sales",
        key="staging_path"
    )

    # Load and validate
    df = pd.read_parquet(staging_path)
    validator = SalesValidator()

    is_valid = validator.validate(df)

    if not is_valid:
        # Log validation failures
        for result in validator.get_failed_rules():
            print(f"Validation failed: {result['rule']} - {result['message']}")

        raise ValueError("Data validation failed")

    return True


def transform_sales_data(**context):
    """
    Apply business transformations to sales data.
    """
    from includes.transformers import SalesTransformer
    import pandas as pd

    staging_path = context["ti"].xcom_pull(
        task_ids="extract_sales",
        key="staging_path"
    )

    df = pd.read_parquet(staging_path)
    transformer = SalesTransformer()

    # Apply transformations
    transformed_df = transformer.transform(df)

    # Save transformed data
    execution_date = context["execution_date"]
    transform_path = f"/data/transformed/sales/{execution_date.strftime('%Y%m%d')}"
    transformed_df.to_parquet(transform_path)

    context["ti"].xcom_push(key="transform_path", value=transform_path)

    return transform_path


def load_to_warehouse(**context):
    """
    Load transformed data to the data warehouse.
    Uses merge pattern for idempotent loads.
    """
    from includes.loaders import WarehouseLoader
    import pandas as pd

    transform_path = context["ti"].xcom_pull(
        task_ids="transform_sales",
        key="transform_path"
    )

    df = pd.read_parquet(transform_path)

    loader = WarehouseLoader(connection_id="warehouse_db")
    result = loader.merge_load(
        df=df,
        table="fct_sales",
        schema="marts",
        key_columns=["sale_id"],
        update_columns=["quantity", "amount", "status", "updated_at"]
    )

    context["ti"].xcom_push(key="load_result", value=result)

    return result


# Define task dependencies
with dag:

    # Extraction task
    extract_sales = PythonOperator(
        task_id="extract_sales",
        python_callable=extract_sales_data,
    )

    # Validation task
    validate_data = PythonOperator(
        task_id="validate_data",
        python_callable=validate_extracted_data,
    )

    # Run dbt transformations
    with TaskGroup(group_id="dbt_transforms") as dbt_transforms:

        dbt_staging = BashOperator(
            task_id="dbt_staging",
            bash_command="cd /opt/dbt && dbt run --select staging.stg_sales",
        )

        dbt_marts = BashOperator(
            task_id="dbt_marts",
            bash_command="cd /opt/dbt && dbt run --select marts.fct_daily_sales",
        )

        dbt_staging >> dbt_marts

    # Load to warehouse
    load_warehouse = PythonOperator(
        task_id="load_warehouse",
        python_callable=load_to_warehouse,
    )

    # Run dbt tests
    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command="cd /opt/dbt && dbt test --select marts.fct_daily_sales",
    )

    # Data quality notification
    notify_success = BashOperator(
        task_id="notify_success",
        bash_command='echo "ETL pipeline completed successfully"',
        trigger_rule="all_success",
    )

    # Define task flow
    extract_sales >> validate_data >> dbt_transforms >> load_warehouse >> dbt_test >> notify_success
```

### Airflow Sensor for Dependencies

```python
# dags/includes/sensors.py
# Custom sensors for ETL dependency management

from airflow.sensors.base import BaseSensorOperator
from airflow.utils.decorators import apply_defaults

class DataQualitySensor(BaseSensorOperator):
    """
    Sensor that waits for upstream data quality checks to pass.
    Useful for cross-pipeline dependencies.
    """

    @apply_defaults
    def __init__(
        self,
        table_name: str,
        schema: str,
        connection_id: str,
        quality_threshold: float = 0.95,
        *args,
        **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.table_name = table_name
        self.schema = schema
        self.connection_id = connection_id
        self.quality_threshold = quality_threshold

    def poke(self, context):
        """
        Check if data quality meets threshold.
        """
        from airflow.hooks.base import BaseHook
        import pandas as pd

        # Get connection
        conn = BaseHook.get_connection(self.connection_id)

        # Query data quality metrics
        query = f"""
            SELECT
                quality_score,
                checked_at
            FROM data_quality.metrics
            WHERE table_name = '{self.table_name}'
            AND schema_name = '{self.schema}'
            AND checked_at >= CURRENT_DATE
            ORDER BY checked_at DESC
            LIMIT 1
        """

        # Execute and check
        df = pd.read_sql(query, conn.get_uri())

        if df.empty:
            self.log.info(f"No quality metrics found for {self.schema}.{self.table_name}")
            return False

        quality_score = df["quality_score"].iloc[0]

        if quality_score >= self.quality_threshold:
            self.log.info(f"Quality check passed: {quality_score} >= {self.quality_threshold}")
            return True

        self.log.info(f"Quality check pending: {quality_score} < {self.quality_threshold}")
        return False
```

## Part 5: Error Handling and Monitoring

### Error Handling Framework

```python
# error_handling.py
# Comprehensive error handling for ETL pipelines
# Implements retry logic, dead letter queues, and alerting

from dataclasses import dataclass
from typing import Callable, Optional, Any
from functools import wraps
import logging
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ETLError:
    """
    Structured error information for ETL failures.
    """
    error_type: str
    message: str
    timestamp: datetime
    pipeline_name: str
    task_name: str
    record_id: Optional[str]
    stack_trace: str


class ETLErrorHandler:
    """
    Centralized error handling for ETL operations.
    Supports retry logic and dead letter queue routing.
    """

    def __init__(self, pipeline_name: str, max_retries: int = 3):
        self.pipeline_name = pipeline_name
        self.max_retries = max_retries
        self.errors: list = []

    def handle_error(
        self,
        error: Exception,
        task_name: str,
        record_id: Optional[str] = None
    ) -> ETLError:
        """
        Process and log an error.
        """
        etl_error = ETLError(
            error_type=type(error).__name__,
            message=str(error),
            timestamp=datetime.now(),
            pipeline_name=self.pipeline_name,
            task_name=task_name,
            record_id=record_id,
            stack_trace=traceback.format_exc()
        )

        self.errors.append(etl_error)

        # Log the error
        logger.error(
            f"ETL Error in {self.pipeline_name}.{task_name}: "
            f"{etl_error.error_type} - {etl_error.message}"
        )

        return etl_error

    def send_to_dead_letter_queue(self, record: dict, error: ETLError):
        """
        Route failed records to dead letter queue for manual review.
        """
        dlq_record = {
            "original_record": record,
            "error_info": {
                "type": error.error_type,
                "message": error.message,
                "timestamp": error.timestamp.isoformat(),
                "pipeline": error.pipeline_name,
                "task": error.task_name
            }
        }

        # Write to DLQ (implement based on your infrastructure)
        self._write_to_dlq(dlq_record)

        logger.info(f"Record {error.record_id} sent to dead letter queue")

    def _write_to_dlq(self, record: dict):
        """Write record to dead letter queue storage."""
        # Implementation depends on your DLQ system
        # Could be S3, Kafka topic, database table, etc.
        pass


def retry_with_backoff(max_retries: int = 3, backoff_factor: float = 2.0):
    """
    Decorator that implements exponential backoff retry logic.

    Args:
        max_retries: Maximum number of retry attempts
        backoff_factor: Multiplier for wait time between retries
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import time

            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e

                    if attempt < max_retries:
                        wait_time = backoff_factor ** attempt
                        logger.warning(
                            f"Attempt {attempt + 1} failed: {e}. "
                            f"Retrying in {wait_time} seconds..."
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries + 1} attempts failed. "
                            f"Final error: {e}"
                        )

            raise last_exception

        return wrapper
    return decorator


# Example usage with retry decorator
@retry_with_backoff(max_retries=3, backoff_factor=2.0)
def extract_from_api(endpoint: str) -> dict:
    """
    Extract data from API with automatic retry on failure.
    """
    import requests

    response = requests.get(endpoint, timeout=30)
    response.raise_for_status()

    return response.json()
```

### Pipeline Monitoring

```mermaid
flowchart LR
    subgraph Pipeline["ETL Pipeline"]
        P1[Extract]
        P2[Transform]
        P3[Load]
    end

    subgraph Metrics["Metrics Collection"]
        M1[Duration]
        M2[Record Count]
        M3[Error Rate]
        M4[Data Quality]
    end

    subgraph Monitoring["Monitoring Stack"]
        Mon1[Prometheus]
        Mon2[Grafana]
        Mon3[PagerDuty]
    end

    P1 --> M1
    P2 --> M2
    P3 --> M3
    P3 --> M4

    M1 --> Mon1
    M2 --> Mon1
    M3 --> Mon1
    M4 --> Mon1

    Mon1 --> Mon2
    Mon1 --> Mon3
```

```python
# monitoring.py
# Pipeline monitoring and metrics collection
# Integrates with Prometheus for observability

from prometheus_client import Counter, Histogram, Gauge, start_http_server
from functools import wraps
from typing import Callable
import time

# Define metrics
RECORDS_PROCESSED = Counter(
    "etl_records_processed_total",
    "Total number of records processed",
    ["pipeline", "stage"]
)

RECORDS_FAILED = Counter(
    "etl_records_failed_total",
    "Total number of records that failed processing",
    ["pipeline", "stage", "error_type"]
)

PROCESSING_DURATION = Histogram(
    "etl_processing_duration_seconds",
    "Time spent processing records",
    ["pipeline", "stage"],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

DATA_QUALITY_SCORE = Gauge(
    "etl_data_quality_score",
    "Current data quality score",
    ["pipeline", "table"]
)

PIPELINE_STATUS = Gauge(
    "etl_pipeline_status",
    "Current pipeline status (1=running, 0=idle, -1=failed)",
    ["pipeline"]
)


class PipelineMonitor:
    """
    Monitors ETL pipeline execution and collects metrics.
    """

    def __init__(self, pipeline_name: str, metrics_port: int = 9090):
        self.pipeline_name = pipeline_name
        self.metrics_port = metrics_port

        # Start Prometheus metrics server
        start_http_server(self.metrics_port)

    def track_stage(self, stage_name: str):
        """
        Decorator to track metrics for a pipeline stage.
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Set pipeline status to running
                PIPELINE_STATUS.labels(pipeline=self.pipeline_name).set(1)

                start_time = time.time()

                try:
                    result = func(*args, **kwargs)

                    # Track successful processing
                    duration = time.time() - start_time
                    PROCESSING_DURATION.labels(
                        pipeline=self.pipeline_name,
                        stage=stage_name
                    ).observe(duration)

                    # Track record count if result contains it
                    if isinstance(result, dict) and "record_count" in result:
                        RECORDS_PROCESSED.labels(
                            pipeline=self.pipeline_name,
                            stage=stage_name
                        ).inc(result["record_count"])

                    return result

                except Exception as e:
                    # Track failure
                    RECORDS_FAILED.labels(
                        pipeline=self.pipeline_name,
                        stage=stage_name,
                        error_type=type(e).__name__
                    ).inc()

                    PIPELINE_STATUS.labels(pipeline=self.pipeline_name).set(-1)

                    raise

                finally:
                    # Reset status to idle after completion
                    PIPELINE_STATUS.labels(pipeline=self.pipeline_name).set(0)

            return wrapper
        return decorator

    def record_quality_score(self, table_name: str, score: float):
        """
        Record data quality score for monitoring.
        """
        DATA_QUALITY_SCORE.labels(
            pipeline=self.pipeline_name,
            table=table_name
        ).set(score)


# Example usage
monitor = PipelineMonitor("sales_etl", metrics_port=9090)

@monitor.track_stage("extract")
def extract_stage():
    # Extraction logic
    return {"record_count": 10000}

@monitor.track_stage("transform")
def transform_stage():
    # Transformation logic
    return {"record_count": 9500}

@monitor.track_stage("load")
def load_stage():
    # Loading logic
    return {"record_count": 9500}
```

## Best Practices Summary

### Design Principles

1. **Idempotency**: Design pipelines that can be safely re-run without creating duplicates
2. **Atomicity**: Use transactions to ensure all-or-nothing loading
3. **Lineage**: Track data provenance through the entire pipeline
4. **Modularity**: Build reusable components for extraction, transformation, and loading

### Performance Optimization

1. **Parallel Processing**: Process independent tasks concurrently
2. **Batch Operations**: Use bulk inserts instead of row-by-row operations
3. **Incremental Loading**: Only process changed data when possible
4. **Partition Pruning**: Leverage table partitions to minimize data scanned

### Data Quality

1. **Validate Early**: Check data quality at extraction before expensive transformations
2. **Schema Enforcement**: Define and enforce schemas at each stage
3. **Anomaly Detection**: Monitor for unexpected patterns in data volumes and values
4. **Automated Testing**: Use dbt tests or Great Expectations for automated quality checks

## Conclusion

Building robust ETL pipelines requires careful attention to extraction patterns, transformation logic, and loading strategies. By leveraging tools like Apache Airflow for orchestration and dbt for transformations, you can create maintainable, scalable data pipelines. Remember to implement comprehensive error handling and monitoring to ensure pipeline reliability in production environments.

The patterns and code examples in this guide provide a foundation for building production-grade ETL systems. Adapt these approaches to your specific requirements, data volumes, and infrastructure constraints.
