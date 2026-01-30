# How to Implement Data Loading Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Data Pipeline, Data Loading, ETL, Data Warehouse

Description: Learn to implement data loading patterns for efficiently writing data to target systems.

---

Data loading is the final and most critical step in any data pipeline. Whether you are building an ETL process, a real-time streaming system, or a batch data warehouse, how you write data to your target system determines performance, consistency, and reliability. This guide covers the core loading patterns you need to build production-grade data pipelines.

## Why Loading Patterns Matter

Loading data seems straightforward until you hit real-world challenges:

- **Duplicate records** from retried loads
- **Partial failures** leaving data in inconsistent states
- **Performance bottlenecks** from inefficient write strategies
- **Schema evolution** breaking existing pipelines
- **Concurrent writes** causing race conditions

Choosing the right loading pattern prevents these issues and ensures data integrity at scale.

---

## Loading Pattern Overview

```mermaid
flowchart TD
    subgraph Source["Data Source"]
        S1[Extracted Data]
    end

    subgraph Patterns["Loading Patterns"]
        A[Append Only]
        O[Overwrite / Truncate]
        U[Upsert / Merge]
        D[Delta / CDC]
        P[Partition Replace]
    end

    subgraph Target["Target System"]
        T1[(Data Warehouse)]
        T2[(Database)]
        T3[(Data Lake)]
    end

    S1 --> A
    S1 --> O
    S1 --> U
    S1 --> D
    S1 --> P

    A --> T1
    A --> T3
    O --> T1
    O --> T2
    U --> T2
    U --> T1
    D --> T1
    D --> T3
    P --> T3
    P --> T1
```

| Pattern | Best For | Trade-offs |
|---------|----------|------------|
| **Append** | Event logs, immutable data | Simple but grows unbounded |
| **Overwrite** | Full refreshes, small tables | Complete but expensive |
| **Upsert/Merge** | Slowly changing dimensions | Efficient but complex |
| **Delta/CDC** | Large tables, incremental | Fast but requires tracking |
| **Partition Replace** | Time-series, large datasets | Isolated but partition-aware |

---

## Pattern 1: Append Only

Append loading adds new records without modifying existing data. It is the simplest pattern and works well for immutable event data like logs, clickstreams, and audit trails.

```mermaid
flowchart LR
    subgraph Before["Target Table"]
        B1["Row 1"]
        B2["Row 2"]
        B3["Row 3"]
    end

    subgraph NewData["New Records"]
        N1["Row 4"]
        N2["Row 5"]
    end

    subgraph After["After Append"]
        A1["Row 1"]
        A2["Row 2"]
        A3["Row 3"]
        A4["Row 4"]
        A5["Row 5"]
    end

    Before --> |"+ New Data"| After
    NewData --> After
```

### Python Implementation

```python
"""
Append-only data loader for event-style data.
Suitable for logs, metrics, and immutable event streams.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import Optional
import logging

# Configure logging for visibility into load operations
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AppendLoader:
    """
    Loads data using append-only strategy.

    Features:
    - Adds new records without modifying existing data
    - Automatically adds load timestamp for lineage tracking
    - Supports batched inserts for large datasets
    - Idempotent when combined with deduplication downstream
    """

    def __init__(self, connection_string: str):
        # Create SQLAlchemy engine for database operations
        self.engine = create_engine(connection_string)

    def load(
        self,
        df: pd.DataFrame,
        table_name: str,
        batch_size: int = 10000,
        add_metadata: bool = True
    ) -> dict:
        """
        Append records to the target table.

        Args:
            df: DataFrame containing records to load
            table_name: Target table name
            batch_size: Number of rows per insert batch
            add_metadata: Whether to add load timestamp column

        Returns:
            Dictionary with load statistics
        """
        if df.empty:
            logger.warning("Empty DataFrame provided, skipping load")
            return {"rows_loaded": 0, "status": "skipped"}

        # Add load metadata for data lineage tracking
        if add_metadata:
            df = df.copy()
            df["_loaded_at"] = datetime.utcnow()
            df["_load_id"] = self._generate_load_id()

        total_rows = len(df)
        rows_loaded = 0

        logger.info(f"Starting append load of {total_rows} rows to {table_name}")

        # Process in batches to manage memory and transaction size
        for i in range(0, total_rows, batch_size):
            batch = df.iloc[i:i + batch_size]

            # Use pandas to_sql with append mode
            batch.to_sql(
                name=table_name,
                con=self.engine,
                if_exists="append",  # Key: append mode adds rows
                index=False,
                method="multi"  # Multi-row insert for better performance
            )

            rows_loaded += len(batch)
            logger.info(f"Loaded batch {i // batch_size + 1}: {rows_loaded}/{total_rows} rows")

        logger.info(f"Append load completed: {rows_loaded} rows loaded to {table_name}")

        return {
            "rows_loaded": rows_loaded,
            "table": table_name,
            "status": "success",
            "load_timestamp": datetime.utcnow().isoformat()
        }

    def _generate_load_id(self) -> str:
        """Generate unique identifier for this load operation."""
        from uuid import uuid4
        return str(uuid4())


# Usage example
if __name__ == "__main__":
    # Create loader instance
    loader = AppendLoader("postgresql://user:pass@localhost:5432/warehouse")

    # Sample event data
    events = pd.DataFrame({
        "event_id": ["evt_001", "evt_002", "evt_003"],
        "event_type": ["page_view", "click", "purchase"],
        "user_id": ["user_123", "user_456", "user_123"],
        "timestamp": pd.to_datetime(["2026-01-30 10:00", "2026-01-30 10:05", "2026-01-30 10:10"]),
        "properties": ['{"page": "/home"}', '{"button": "buy"}', '{"amount": 99.99}']
    })

    # Execute append load
    result = loader.load(events, "user_events", batch_size=1000)
    print(f"Load result: {result}")
```

### When to Use Append

- Event logs and audit trails
- Time-series metrics and telemetry
- Clickstream and user activity data
- Message queues and streaming sinks
- Data that should never be modified

---

## Pattern 2: Overwrite (Truncate and Load)

Overwrite completely replaces the target table contents. This pattern ensures the target always matches the source exactly, making it ideal for full refresh scenarios and small reference tables.

```mermaid
flowchart LR
    subgraph Before["Target Table"]
        B1["Old Row 1"]
        B2["Old Row 2"]
        B3["Old Row 3"]
    end

    subgraph NewData["Source Data"]
        N1["New Row 1"]
        N2["New Row 2"]
    end

    subgraph After["After Overwrite"]
        A1["New Row 1"]
        A2["New Row 2"]
    end

    Before --> |"Truncate"| Empty["Empty Table"]
    Empty --> |"Insert All"| After
    NewData --> After
```

### Python Implementation

```python
"""
Overwrite loader for full table replacement.
Best for small tables, reference data, and full refresh scenarios.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from contextlib import contextmanager
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class OverwriteLoader:
    """
    Loads data using truncate-and-load strategy.

    Features:
    - Atomic replacement using transactions
    - Optional backup before overwrite
    - Schema preservation during reload
    - Suitable for complete data refreshes
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    @contextmanager
    def _transaction(self):
        """Context manager for atomic transactions."""
        connection = self.engine.connect()
        transaction = connection.begin()
        try:
            yield connection
            transaction.commit()
        except Exception as e:
            transaction.rollback()
            logger.error(f"Transaction rolled back due to: {e}")
            raise
        finally:
            connection.close()

    def load(
        self,
        df: pd.DataFrame,
        table_name: str,
        backup: bool = False,
        preserve_schema: bool = True
    ) -> dict:
        """
        Overwrite target table with new data.

        Args:
            df: DataFrame containing complete dataset
            table_name: Target table name
            backup: Create backup table before overwrite
            preserve_schema: Keep existing table schema

        Returns:
            Dictionary with load statistics
        """
        start_time = datetime.utcnow()

        with self._transaction() as conn:
            # Optionally backup existing data
            if backup:
                backup_table = f"{table_name}_backup_{start_time.strftime('%Y%m%d_%H%M%S')}"
                logger.info(f"Creating backup: {backup_table}")
                conn.execute(text(
                    f"CREATE TABLE {backup_table} AS SELECT * FROM {table_name}"
                ))

            # Get row count before truncate for logging
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            rows_before = result.scalar()

            # Truncate is faster than DELETE and resets auto-increment
            logger.info(f"Truncating table {table_name} ({rows_before} existing rows)")
            conn.execute(text(f"TRUNCATE TABLE {table_name}"))

            # Add load metadata
            df = df.copy()
            df["_loaded_at"] = start_time

            # Insert new data
            df.to_sql(
                name=table_name,
                con=conn,
                if_exists="append",  # Table exists but is empty after truncate
                index=False,
                method="multi"
            )

            rows_after = len(df)

        logger.info(f"Overwrite completed: {rows_before} rows replaced with {rows_after} rows")

        return {
            "rows_before": rows_before,
            "rows_after": rows_after,
            "table": table_name,
            "backup_created": backup,
            "status": "success",
            "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
        }


class SafeOverwriteLoader:
    """
    Swap-table strategy for zero-downtime overwrites.
    Creates new table, loads data, then swaps atomically.
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def load(self, df: pd.DataFrame, table_name: str) -> dict:
        """
        Safe overwrite using table swap pattern.

        Steps:
        1. Create staging table with new data
        2. Swap staging and production tables atomically
        3. Drop old production table

        This ensures readers always see complete data.
        """
        staging_table = f"{table_name}_staging"
        old_table = f"{table_name}_old"

        with self.engine.begin() as conn:
            # Step 1: Drop staging if exists and create fresh
            conn.execute(text(f"DROP TABLE IF EXISTS {staging_table}"))

            # Create staging table with same schema as production
            conn.execute(text(
                f"CREATE TABLE {staging_table} (LIKE {table_name} INCLUDING ALL)"
            ))

        # Step 2: Load data into staging table
        df["_loaded_at"] = datetime.utcnow()
        df.to_sql(
            name=staging_table,
            con=self.engine,
            if_exists="append",
            index=False
        )

        # Step 3: Atomic swap using rename
        with self.engine.begin() as conn:
            conn.execute(text(f"DROP TABLE IF EXISTS {old_table}"))
            conn.execute(text(f"ALTER TABLE {table_name} RENAME TO {old_table.split('.')[-1]}"))
            conn.execute(text(f"ALTER TABLE {staging_table} RENAME TO {table_name.split('.')[-1]}"))
            conn.execute(text(f"DROP TABLE IF EXISTS {old_table}"))

        logger.info(f"Safe overwrite completed for {table_name}")

        return {
            "rows_loaded": len(df),
            "table": table_name,
            "status": "success",
            "method": "table_swap"
        }


# Usage example
if __name__ == "__main__":
    loader = OverwriteLoader("postgresql://user:pass@localhost:5432/warehouse")

    # Complete reference data
    products = pd.DataFrame({
        "product_id": ["SKU001", "SKU002", "SKU003"],
        "name": ["Widget A", "Widget B", "Gadget C"],
        "price": [19.99, 29.99, 49.99],
        "category": ["widgets", "widgets", "gadgets"],
        "active": [True, True, False]
    })

    result = loader.load(products, "dim_products", backup=True)
    print(f"Overwrite result: {result}")
```

### When to Use Overwrite

- Small dimension tables (under 1 million rows)
- Reference data from external systems
- Configuration and lookup tables
- When source system does not provide change tracking
- Daily/weekly full refresh schedules

---

## Pattern 3: Upsert (Merge)

Upsert combines insert and update operations: new records are inserted, existing records are updated. This is the most common pattern for slowly changing dimension tables and transactional data.

```mermaid
flowchart TD
    subgraph Source["Source Records"]
        S1["ID=1, Name=Alice (existing)"]
        S2["ID=2, Name=Bob (existing)"]
        S3["ID=4, Name=Diana (new)"]
    end

    subgraph Target["Target Before"]
        T1["ID=1, Name=Alice"]
        T2["ID=2, Name=Robert"]
        T3["ID=3, Name=Charlie"]
    end

    subgraph Logic["Upsert Logic"]
        M{Match on ID?}
        U[Update existing]
        I[Insert new]
    end

    subgraph Result["Target After"]
        R1["ID=1, Name=Alice (unchanged)"]
        R2["ID=2, Name=Bob (updated)"]
        R3["ID=3, Name=Charlie (unchanged)"]
        R4["ID=4, Name=Diana (inserted)"]
    end

    Source --> M
    Target --> M
    M -->|Yes| U
    M -->|No| I
    U --> Result
    I --> Result
```

### Python Implementation

```python
"""
Upsert (Merge) loader for incremental data updates.
Handles both new records and updates to existing records.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class UpsertLoader:
    """
    Loads data using upsert (merge) strategy.

    Features:
    - Inserts new records based on key columns
    - Updates existing records when data changes
    - Tracks row-level changes with metadata
    - Supports composite primary keys
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def load_postgres(
        self,
        df: pd.DataFrame,
        table_name: str,
        key_columns: List[str],
        update_columns: Optional[List[str]] = None
    ) -> dict:
        """
        PostgreSQL upsert using ON CONFLICT.

        Args:
            df: DataFrame with records to upsert
            table_name: Target table name
            key_columns: Columns that identify unique records
            update_columns: Columns to update on conflict (None = all non-key columns)

        Returns:
            Dictionary with load statistics
        """
        if df.empty:
            return {"rows_processed": 0, "status": "skipped"}

        # Add metadata columns
        df = df.copy()
        df["_updated_at"] = datetime.utcnow()

        # Determine columns to update on conflict
        all_columns = list(df.columns)
        if update_columns is None:
            update_columns = [c for c in all_columns if c not in key_columns]

        # Build column lists for SQL
        columns_str = ", ".join(all_columns)
        placeholders = ", ".join([f":{col}" for col in all_columns])
        key_str = ", ".join(key_columns)

        # Build UPDATE SET clause for conflict resolution
        update_set = ", ".join([
            f"{col} = EXCLUDED.{col}"
            for col in update_columns
        ])

        # PostgreSQL upsert SQL using ON CONFLICT
        upsert_sql = f"""
            INSERT INTO {table_name} ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT ({key_str})
            DO UPDATE SET {update_set}
        """

        # Execute upsert for each row
        rows_processed = 0
        with self.engine.begin() as conn:
            for _, row in df.iterrows():
                conn.execute(text(upsert_sql), dict(row))
                rows_processed += 1

                if rows_processed % 1000 == 0:
                    logger.info(f"Upserted {rows_processed}/{len(df)} rows")

        logger.info(f"Upsert completed: {rows_processed} rows processed")

        return {
            "rows_processed": rows_processed,
            "table": table_name,
            "key_columns": key_columns,
            "status": "success"
        }

    def load_with_merge(
        self,
        df: pd.DataFrame,
        table_name: str,
        key_columns: List[str],
        track_changes: bool = True
    ) -> dict:
        """
        Generic merge using staging table pattern.
        Works with any SQL database.

        Steps:
        1. Load data to staging table
        2. Update existing records from staging
        3. Insert new records from staging
        4. Clean up staging table
        """
        staging_table = f"{table_name}_staging"
        start_time = datetime.utcnow()

        # Add metadata
        df = df.copy()
        df["_updated_at"] = start_time
        if "_created_at" not in df.columns:
            df["_created_at"] = start_time

        with self.engine.begin() as conn:
            # Step 1: Create and populate staging table
            conn.execute(text(f"DROP TABLE IF EXISTS {staging_table}"))

        # Load to staging
        df.to_sql(staging_table, self.engine, if_exists="replace", index=False)

        with self.engine.begin() as conn:
            # Step 2: Update existing records
            key_match = " AND ".join([
                f"t.{col} = s.{col}" for col in key_columns
            ])

            non_key_columns = [c for c in df.columns if c not in key_columns and c != "_created_at"]
            update_set = ", ".join([
                f"{col} = s.{col}" for col in non_key_columns
            ])

            update_sql = f"""
                UPDATE {table_name} t
                SET {update_set}
                FROM {staging_table} s
                WHERE {key_match}
            """
            result = conn.execute(text(update_sql))
            rows_updated = result.rowcount

            # Step 3: Insert new records
            insert_sql = f"""
                INSERT INTO {table_name}
                SELECT s.*
                FROM {staging_table} s
                LEFT JOIN {table_name} t ON {key_match.replace('t.', table_name + '.').replace('s.', staging_table + '.')}
                WHERE t.{key_columns[0]} IS NULL
            """
            result = conn.execute(text(insert_sql))
            rows_inserted = result.rowcount

            # Step 4: Clean up staging
            conn.execute(text(f"DROP TABLE {staging_table}"))

        logger.info(f"Merge completed: {rows_updated} updated, {rows_inserted} inserted")

        return {
            "rows_updated": rows_updated,
            "rows_inserted": rows_inserted,
            "rows_total": rows_updated + rows_inserted,
            "table": table_name,
            "status": "success"
        }


class SlowlyChangingDimensionLoader:
    """
    SCD Type 2 loader for maintaining historical versions.
    Tracks changes over time by creating new versions of records.
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def load_scd2(
        self,
        df: pd.DataFrame,
        table_name: str,
        natural_key: List[str],
        tracked_columns: List[str]
    ) -> dict:
        """
        SCD Type 2: Maintain full history of changes.

        When a tracked column changes:
        1. Close the current record (set end_date, is_current=False)
        2. Insert new record with updated values (is_current=True)
        """
        current_time = datetime.utcnow()

        # Prepare source data
        df = df.copy()
        df["_effective_from"] = current_time
        df["_effective_to"] = None  # NULL means current
        df["_is_current"] = True

        with self.engine.begin() as conn:
            rows_closed = 0
            rows_inserted = 0

            for _, source_row in df.iterrows():
                # Build key match condition
                key_conditions = " AND ".join([
                    f"{col} = :{col}" for col in natural_key
                ])

                # Find current record
                current_sql = f"""
                    SELECT * FROM {table_name}
                    WHERE {key_conditions} AND _is_current = TRUE
                """
                result = conn.execute(
                    text(current_sql),
                    {col: source_row[col] for col in natural_key}
                )
                current_record = result.fetchone()

                if current_record:
                    # Check if tracked columns changed
                    changed = any(
                        current_record[col] != source_row[col]
                        for col in tracked_columns
                    )

                    if changed:
                        # Close current record
                        close_sql = f"""
                            UPDATE {table_name}
                            SET _effective_to = :close_time, _is_current = FALSE
                            WHERE {key_conditions} AND _is_current = TRUE
                        """
                        conn.execute(
                            text(close_sql),
                            {**{col: source_row[col] for col in natural_key}, "close_time": current_time}
                        )
                        rows_closed += 1

                        # Insert new version
                        self._insert_row(conn, table_name, source_row)
                        rows_inserted += 1
                else:
                    # No existing record, insert new
                    self._insert_row(conn, table_name, source_row)
                    rows_inserted += 1

        return {
            "rows_closed": rows_closed,
            "rows_inserted": rows_inserted,
            "table": table_name,
            "scd_type": 2,
            "status": "success"
        }

    def _insert_row(self, conn, table_name: str, row: pd.Series):
        """Helper to insert a single row."""
        columns = ", ".join(row.index)
        placeholders = ", ".join([f":{col}" for col in row.index])
        insert_sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        conn.execute(text(insert_sql), dict(row))


# Usage example
if __name__ == "__main__":
    loader = UpsertLoader("postgresql://user:pass@localhost:5432/warehouse")

    # Customer updates
    customers = pd.DataFrame({
        "customer_id": ["C001", "C002", "C003"],
        "name": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "email": ["alice@example.com", "bob.new@example.com", "charlie@example.com"],
        "tier": ["gold", "silver", "bronze"]
    })

    result = loader.load_postgres(
        customers,
        "dim_customers",
        key_columns=["customer_id"],
        update_columns=["name", "email", "tier"]
    )
    print(f"Upsert result: {result}")
```

### When to Use Upsert

- Customer and user profile tables
- Product catalogs and inventory
- Slowly changing dimensions (SCD Type 1)
- Configuration that changes over time
- Any data with natural business keys

---

## Pattern 4: Delta/CDC (Change Data Capture)

Delta loading processes only changed records since the last load. This pattern requires tracking changes at the source and is essential for large tables where full loads are impractical.

```mermaid
flowchart TD
    subgraph Source["Source System"]
        ST[Source Table]
        CL[Change Log / CDC]
    end

    subgraph Changes["Change Types"]
        I[Inserts]
        U[Updates]
        D[Deletes]
    end

    subgraph Pipeline["Delta Pipeline"]
        E[Extract Changes]
        T[Transform]
        A[Apply Changes]
    end

    subgraph Target["Target"]
        TT[Target Table]
        WM[Watermark / Checkpoint]
    end

    ST --> CL
    CL --> I
    CL --> U
    CL --> D

    I --> E
    U --> E
    D --> E

    E --> T
    T --> A
    A --> TT
    A --> WM
    WM -.->|Next Run| E
```

### Python Implementation

```python
"""
Delta/CDC loader for incremental change processing.
Processes only changes since the last successful load.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
from typing import Optional, Tuple
import json
import logging

logger = logging.getLogger(__name__)


class DeltaLoader:
    """
    Loads data using delta/incremental strategy.

    Features:
    - Tracks watermarks for incremental extraction
    - Supports multiple change detection methods
    - Handles inserts, updates, and deletes
    - Maintains checkpoints for restart capability
    """

    def __init__(self, connection_string: str, checkpoint_table: str = "_watermarks"):
        self.engine = create_engine(connection_string)
        self.checkpoint_table = checkpoint_table
        self._ensure_checkpoint_table()

    def _ensure_checkpoint_table(self):
        """Create checkpoint table if it does not exist."""
        with self.engine.begin() as conn:
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS {self.checkpoint_table} (
                    pipeline_name VARCHAR(255) PRIMARY KEY,
                    last_watermark TIMESTAMP,
                    last_load_id VARCHAR(255),
                    rows_processed BIGINT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

    def get_watermark(self, pipeline_name: str) -> Optional[datetime]:
        """Get the last successful watermark for a pipeline."""
        with self.engine.connect() as conn:
            result = conn.execute(
                text(f"SELECT last_watermark FROM {self.checkpoint_table} WHERE pipeline_name = :name"),
                {"name": pipeline_name}
            )
            row = result.fetchone()
            return row[0] if row else None

    def save_watermark(self, pipeline_name: str, watermark: datetime, rows_processed: int):
        """Save checkpoint after successful load."""
        with self.engine.begin() as conn:
            conn.execute(text(f"""
                INSERT INTO {self.checkpoint_table} (pipeline_name, last_watermark, rows_processed, updated_at)
                VALUES (:name, :watermark, :rows, CURRENT_TIMESTAMP)
                ON CONFLICT (pipeline_name)
                DO UPDATE SET
                    last_watermark = :watermark,
                    rows_processed = :rows,
                    updated_at = CURRENT_TIMESTAMP
            """), {"name": pipeline_name, "watermark": watermark, "rows": rows_processed})

    def load_timestamp_based(
        self,
        source_query: str,
        target_table: str,
        pipeline_name: str,
        timestamp_column: str,
        key_columns: list
    ) -> dict:
        """
        Delta load using timestamp-based change detection.

        Extracts records where timestamp_column > last_watermark.
        Assumes source maintains updated_at or modified_at column.
        """
        # Get last watermark or use epoch for initial load
        last_watermark = self.get_watermark(pipeline_name)
        if last_watermark is None:
            last_watermark = datetime(1970, 1, 1)
            logger.info(f"No watermark found for {pipeline_name}, starting initial load")

        # Add watermark filter to source query
        # Expects query with {watermark} placeholder
        filtered_query = source_query.format(watermark=last_watermark.isoformat())

        logger.info(f"Extracting changes since {last_watermark}")

        # Extract changed records
        df = pd.read_sql(filtered_query, self.engine)

        if df.empty:
            logger.info("No changes detected")
            return {"rows_processed": 0, "status": "no_changes"}

        # Track the maximum timestamp for new watermark
        new_watermark = df[timestamp_column].max()

        # Apply changes using upsert
        loader = UpsertLoader(str(self.engine.url))
        result = loader.load_postgres(df, target_table, key_columns)

        # Save checkpoint on success
        self.save_watermark(pipeline_name, new_watermark, len(df))

        logger.info(f"Delta load completed: {len(df)} changes processed")

        return {
            "rows_processed": len(df),
            "previous_watermark": last_watermark.isoformat(),
            "new_watermark": new_watermark.isoformat() if pd.notna(new_watermark) else None,
            "status": "success"
        }


class CDCLoader:
    """
    Change Data Capture loader for processing database change logs.
    Handles insert, update, and delete operations from CDC stream.
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def apply_changes(
        self,
        changes_df: pd.DataFrame,
        target_table: str,
        key_columns: list,
        operation_column: str = "_operation"
    ) -> dict:
        """
        Apply CDC changes to target table.

        Expected columns in changes_df:
        - _operation: 'I' (insert), 'U' (update), 'D' (delete)
        - All columns from the source table

        Changes are applied in order to maintain consistency.
        """
        if changes_df.empty:
            return {"status": "no_changes"}

        # Group changes by operation
        inserts = changes_df[changes_df[operation_column] == "I"]
        updates = changes_df[changes_df[operation_column] == "U"]
        deletes = changes_df[changes_df[operation_column] == "D"]

        stats = {"inserted": 0, "updated": 0, "deleted": 0}

        with self.engine.begin() as conn:
            # Process deletes first to handle re-inserts correctly
            if not deletes.empty:
                for _, row in deletes.iterrows():
                    key_conditions = " AND ".join([
                        f"{col} = :{col}" for col in key_columns
                    ])
                    delete_sql = f"DELETE FROM {target_table} WHERE {key_conditions}"
                    conn.execute(
                        text(delete_sql),
                        {col: row[col] for col in key_columns}
                    )
                    stats["deleted"] += 1

            # Process updates
            if not updates.empty:
                data_columns = [c for c in updates.columns if c not in [operation_column] + key_columns]

                for _, row in updates.iterrows():
                    key_conditions = " AND ".join([f"{col} = :{col}" for col in key_columns])
                    set_clause = ", ".join([f"{col} = :{col}" for col in data_columns])

                    update_sql = f"UPDATE {target_table} SET {set_clause} WHERE {key_conditions}"
                    conn.execute(text(update_sql), dict(row.drop(operation_column)))
                    stats["updated"] += 1

            # Process inserts
            if not inserts.empty:
                insert_df = inserts.drop(columns=[operation_column])
                insert_df["_loaded_at"] = datetime.utcnow()

                insert_df.to_sql(
                    target_table,
                    conn,
                    if_exists="append",
                    index=False
                )
                stats["inserted"] = len(insert_df)

        logger.info(f"CDC applied: {stats}")

        return {
            **stats,
            "total_changes": sum(stats.values()),
            "status": "success"
        }

    def process_debezium_changes(
        self,
        events: list,
        target_table: str,
        key_columns: list
    ) -> dict:
        """
        Process Debezium CDC events.

        Debezium format:
        - 'before': state before change (null for inserts)
        - 'after': state after change (null for deletes)
        - 'op': 'c' (create), 'u' (update), 'd' (delete), 'r' (read/snapshot)
        """
        changes = []

        for event in events:
            op = event.get("op")

            if op in ("c", "r"):  # Create or snapshot read
                record = event["after"].copy()
                record["_operation"] = "I"
                changes.append(record)

            elif op == "u":  # Update
                record = event["after"].copy()
                record["_operation"] = "U"
                changes.append(record)

            elif op == "d":  # Delete
                record = event["before"].copy()
                record["_operation"] = "D"
                changes.append(record)

        if not changes:
            return {"status": "no_changes"}

        changes_df = pd.DataFrame(changes)
        return self.apply_changes(changes_df, target_table, key_columns)


# Usage example
if __name__ == "__main__":
    # Delta loading with timestamp-based tracking
    delta_loader = DeltaLoader("postgresql://user:pass@localhost:5432/warehouse")

    # Source query with watermark placeholder
    source_query = """
        SELECT order_id, customer_id, total_amount, status, updated_at
        FROM source_orders
        WHERE updated_at > '{watermark}'
        ORDER BY updated_at
    """

    result = delta_loader.load_timestamp_based(
        source_query=source_query,
        target_table="fact_orders",
        pipeline_name="orders_delta",
        timestamp_column="updated_at",
        key_columns=["order_id"]
    )
    print(f"Delta load result: {result}")
```

### When to Use Delta/CDC

- Large tables (millions of rows or more)
- Near real-time data synchronization
- Minimizing load on source systems
- When source supports change tracking
- Data replication between systems

---

## Pattern 5: Partition Replace

Partition replacement overwrites specific partitions while leaving others intact. This pattern is ideal for time-series data in data lakes where data is organized by date or other partition keys.

```mermaid
flowchart TD
    subgraph Source["Source Data"]
        SD["January 2026 Data"]
    end

    subgraph Target["Partitioned Table"]
        P1["2025-11 Partition"]
        P2["2025-12 Partition"]
        P3["2026-01 Partition (Old)"]
        P4["2026-02 Partition"]
    end

    subgraph NewTarget["After Replace"]
        NP1["2025-11 Partition (unchanged)"]
        NP2["2025-12 Partition (unchanged)"]
        NP3["2026-01 Partition (replaced)"]
        NP4["2026-02 Partition (unchanged)"]
    end

    SD -->|"Replace"| P3
    P1 --> NP1
    P2 --> NP2
    P3 -->|"Overwrite"| NP3
    P4 --> NP4
```

### Python Implementation

```python
"""
Partition-based loader for time-series and large-scale data.
Replaces entire partitions atomically.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import List, Union
import logging

logger = logging.getLogger(__name__)


class PartitionLoader:
    """
    Loads data using partition replacement strategy.

    Features:
    - Atomic partition replacement
    - Supports date-based and custom partition schemes
    - Works with PostgreSQL partitioned tables and data lakes
    - Preserves data outside target partitions
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def replace_date_partition(
        self,
        df: pd.DataFrame,
        table_name: str,
        date_column: str,
        partition_date: Union[str, datetime]
    ) -> dict:
        """
        Replace a single date partition.

        Args:
            df: Data for the partition (should only contain data for partition_date)
            table_name: Target partitioned table
            date_column: Column used for partitioning
            partition_date: Date of the partition to replace
        """
        if isinstance(partition_date, str):
            partition_date = datetime.strptime(partition_date, "%Y-%m-%d").date()

        # Validate data matches partition
        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column]).dt.date

        invalid_rows = df[df[date_column] != partition_date]
        if not invalid_rows.empty:
            raise ValueError(f"Data contains rows outside partition date {partition_date}")

        df["_loaded_at"] = datetime.utcnow()

        with self.engine.begin() as conn:
            # Delete existing partition data
            delete_sql = f"""
                DELETE FROM {table_name}
                WHERE DATE({date_column}) = :partition_date
            """
            result = conn.execute(text(delete_sql), {"partition_date": partition_date})
            rows_deleted = result.rowcount

            logger.info(f"Deleted {rows_deleted} existing rows from partition {partition_date}")

        # Insert new partition data
        df.to_sql(
            table_name,
            self.engine,
            if_exists="append",
            index=False
        )

        logger.info(f"Inserted {len(df)} rows into partition {partition_date}")

        return {
            "partition": str(partition_date),
            "rows_deleted": rows_deleted,
            "rows_inserted": len(df),
            "status": "success"
        }

    def replace_range_partition(
        self,
        df: pd.DataFrame,
        table_name: str,
        partition_column: str,
        start_value: datetime,
        end_value: datetime
    ) -> dict:
        """
        Replace a range partition (e.g., weekly or monthly).

        Useful for replacing entire weeks or months of data.
        """
        df = df.copy()
        df["_loaded_at"] = datetime.utcnow()

        with self.engine.begin() as conn:
            # Delete range
            delete_sql = f"""
                DELETE FROM {table_name}
                WHERE {partition_column} >= :start_val
                  AND {partition_column} < :end_val
            """
            result = conn.execute(
                text(delete_sql),
                {"start_val": start_value, "end_val": end_value}
            )
            rows_deleted = result.rowcount

        # Insert new data
        df.to_sql(table_name, self.engine, if_exists="append", index=False)

        return {
            "partition_start": start_value.isoformat(),
            "partition_end": end_value.isoformat(),
            "rows_deleted": rows_deleted,
            "rows_inserted": len(df),
            "status": "success"
        }


class DataLakePartitionLoader:
    """
    Partition loader for data lake storage (Parquet/Delta Lake).
    Manages file-based partitions with atomic replacement.
    """

    def __init__(self, base_path: str):
        self.base_path = base_path

    def replace_partition(
        self,
        df: pd.DataFrame,
        table_name: str,
        partition_columns: List[str],
        partition_values: dict
    ) -> dict:
        """
        Replace a partition in a data lake table.

        Args:
            df: Data for the partition
            table_name: Table/dataset name
            partition_columns: Columns used for partitioning
            partition_values: Dict of partition column values to replace
        """
        import pyarrow as pa
        import pyarrow.parquet as pq
        from pathlib import Path
        import shutil

        # Build partition path
        partition_path_parts = [
            f"{col}={partition_values[col]}"
            for col in partition_columns
        ]
        partition_path = Path(self.base_path) / table_name / "/".join(partition_path_parts)

        # Add metadata
        df = df.copy()
        df["_loaded_at"] = datetime.utcnow().isoformat()

        # Create staging directory for atomic write
        staging_path = partition_path.parent / f".{partition_path.name}_staging"

        try:
            # Write to staging
            staging_path.mkdir(parents=True, exist_ok=True)

            # Convert to PyArrow and write Parquet
            table = pa.Table.from_pandas(df)
            pq.write_table(
                table,
                staging_path / "data.parquet",
                compression="snappy"
            )

            # Atomic swap: remove old partition, rename staging
            if partition_path.exists():
                shutil.rmtree(partition_path)

            staging_path.rename(partition_path)

            logger.info(f"Replaced partition: {partition_path}")

            return {
                "partition_path": str(partition_path),
                "partition_values": partition_values,
                "rows_written": len(df),
                "status": "success"
            }

        except Exception as e:
            # Cleanup staging on failure
            if staging_path.exists():
                shutil.rmtree(staging_path)
            raise

    def replace_delta_partition(
        self,
        df: pd.DataFrame,
        table_path: str,
        partition_columns: List[str],
        partition_values: dict
    ) -> dict:
        """
        Replace partition in Delta Lake format.
        Delta Lake provides ACID transactions for data lake operations.
        """
        from deltalake import DeltaTable, write_deltalake

        # Build partition filter expression
        partition_filter = " AND ".join([
            f"{col} = '{partition_values[col]}'"
            for col in partition_columns
        ])

        # Add partition columns to data if not present
        df = df.copy()
        for col, val in partition_values.items():
            if col not in df.columns:
                df[col] = val

        df["_loaded_at"] = datetime.utcnow().isoformat()

        # Write with replaceWhere for atomic partition replacement
        write_deltalake(
            table_path,
            df,
            mode="overwrite",
            partition_by=partition_columns,
            predicate=partition_filter
        )

        logger.info(f"Replaced Delta partition: {partition_filter}")

        return {
            "partition_filter": partition_filter,
            "rows_written": len(df),
            "format": "delta",
            "status": "success"
        }


# Usage example
if __name__ == "__main__":
    # Database partition replacement
    loader = PartitionLoader("postgresql://user:pass@localhost:5432/warehouse")

    # Daily sales data for a specific date
    sales = pd.DataFrame({
        "sale_id": ["S001", "S002", "S003"],
        "sale_date": ["2026-01-30", "2026-01-30", "2026-01-30"],
        "product_id": ["P001", "P002", "P001"],
        "quantity": [5, 3, 2],
        "revenue": [99.95, 44.97, 39.98]
    })

    result = loader.replace_date_partition(
        sales,
        "fact_sales",
        date_column="sale_date",
        partition_date="2026-01-30"
    )
    print(f"Partition replace result: {result}")

    # Data lake partition replacement
    lake_loader = DataLakePartitionLoader("/data/lake")

    result = lake_loader.replace_partition(
        sales,
        table_name="sales",
        partition_columns=["year", "month", "day"],
        partition_values={"year": "2026", "month": "01", "day": "30"}
    )
    print(f"Data lake result: {result}")
```

### When to Use Partition Replace

- Time-series data (daily, hourly partitions)
- Data lakes with Parquet or Delta Lake
- Reprocessing historical data
- Late-arriving data corrections
- When partition isolation is needed for concurrent loads

---

## Performance Optimization

### Batch Size Tuning

```python
"""
Performance utilities for optimizing data loading.
"""

import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)


class OptimizedLoader:
    """
    Loader with performance optimizations.

    Key optimizations:
    - Dynamic batch sizing based on row complexity
    - Parallel loading for independent partitions
    - Connection pooling for concurrent operations
    - Memory-efficient streaming for large datasets
    """

    def __init__(self, connection_string: str, pool_size: int = 5):
        # Create engine with connection pooling
        self.engine = create_engine(
            connection_string,
            pool_size=pool_size,
            max_overflow=10,
            pool_pre_ping=True  # Verify connections before use
        )

    def calculate_optimal_batch_size(
        self,
        df: pd.DataFrame,
        target_memory_mb: int = 100
    ) -> int:
        """
        Calculate optimal batch size based on data characteristics.

        Larger batches = better throughput but more memory
        Smaller batches = less memory but more round trips
        """
        # Estimate row size in bytes
        sample_size = min(1000, len(df))
        sample = df.head(sample_size)
        row_size_bytes = sample.memory_usage(deep=True).sum() / sample_size

        # Calculate batch size to fit in target memory
        target_bytes = target_memory_mb * 1024 * 1024
        optimal_batch = int(target_bytes / row_size_bytes)

        # Clamp to reasonable range
        optimal_batch = max(100, min(optimal_batch, 50000))

        logger.info(f"Calculated optimal batch size: {optimal_batch} rows (row size: {row_size_bytes:.0f} bytes)")

        return optimal_batch

    def load_with_copy(
        self,
        df: pd.DataFrame,
        table_name: str,
        batch_size: int = 10000
    ) -> dict:
        """
        High-performance loading using PostgreSQL COPY command.

        COPY is significantly faster than INSERT for bulk loads:
        - Bypasses SQL parsing overhead
        - Streams data directly to table storage
        - Can be 10-100x faster for large datasets
        """
        import io
        from psycopg2 import sql

        start_time = time.time()
        rows_loaded = 0

        # Get raw connection for COPY
        raw_conn = self.engine.raw_connection()
        cursor = raw_conn.cursor()

        try:
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i + batch_size]

                # Convert DataFrame to CSV in memory
                buffer = io.StringIO()
                batch.to_csv(buffer, index=False, header=False, sep="\t", na_rep="\\N")
                buffer.seek(0)

                # Use COPY for fast loading
                columns = list(df.columns)
                cursor.copy_from(
                    buffer,
                    table_name,
                    sep="\t",
                    null="\\N",
                    columns=columns
                )

                rows_loaded += len(batch)

            raw_conn.commit()

        except Exception as e:
            raw_conn.rollback()
            raise
        finally:
            cursor.close()
            raw_conn.close()

        duration = time.time() - start_time
        rows_per_second = rows_loaded / duration if duration > 0 else 0

        logger.info(f"COPY load completed: {rows_loaded} rows in {duration:.2f}s ({rows_per_second:.0f} rows/sec)")

        return {
            "rows_loaded": rows_loaded,
            "duration_seconds": duration,
            "rows_per_second": rows_per_second,
            "method": "copy",
            "status": "success"
        }

    def load_parallel_partitions(
        self,
        df: pd.DataFrame,
        table_name: str,
        partition_column: str,
        max_workers: int = 4
    ) -> dict:
        """
        Load multiple partitions in parallel.

        Useful when loading data spanning multiple partitions
        where each partition can be loaded independently.
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed

        # Group data by partition
        partitions = df.groupby(df[partition_column].dt.date)

        results = []
        start_time = time.time()

        def load_partition(partition_date, partition_df):
            loader = PartitionLoader(str(self.engine.url))
            return loader.replace_date_partition(
                partition_df,
                table_name,
                partition_column,
                partition_date
            )

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(load_partition, date, group): date
                for date, group in partitions
            }

            for future in as_completed(futures):
                partition_date = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                    logger.info(f"Partition {partition_date} loaded successfully")
                except Exception as e:
                    logger.error(f"Partition {partition_date} failed: {e}")
                    results.append({"partition": str(partition_date), "status": "failed", "error": str(e)})

        duration = time.time() - start_time
        total_rows = sum(r.get("rows_inserted", 0) for r in results if r.get("status") == "success")

        return {
            "partitions_processed": len(results),
            "successful": sum(1 for r in results if r.get("status") == "success"),
            "failed": sum(1 for r in results if r.get("status") == "failed"),
            "total_rows": total_rows,
            "duration_seconds": duration,
            "status": "success" if all(r.get("status") == "success" for r in results) else "partial"
        }


class StreamingLoader:
    """
    Memory-efficient loader for datasets larger than available RAM.
    Processes data in chunks without loading entire dataset.
    """

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def load_from_file(
        self,
        file_path: str,
        table_name: str,
        chunk_size: int = 10000,
        file_format: str = "csv"
    ) -> dict:
        """
        Stream data from file to database in chunks.
        Never loads entire file into memory.
        """
        start_time = time.time()
        total_rows = 0
        chunk_count = 0

        # Create appropriate reader based on format
        if file_format == "csv":
            reader = pd.read_csv(file_path, chunksize=chunk_size)
        elif file_format == "parquet":
            # Parquet requires pyarrow for chunked reading
            import pyarrow.parquet as pq
            parquet_file = pq.ParquetFile(file_path)
            reader = (
                batch.to_pandas()
                for batch in parquet_file.iter_batches(batch_size=chunk_size)
            )
        else:
            raise ValueError(f"Unsupported format: {file_format}")

        for chunk in reader:
            chunk["_loaded_at"] = datetime.utcnow()

            chunk.to_sql(
                table_name,
                self.engine,
                if_exists="append",
                index=False,
                method="multi"
            )

            total_rows += len(chunk)
            chunk_count += 1

            if chunk_count % 10 == 0:
                logger.info(f"Processed {chunk_count} chunks, {total_rows} total rows")

        duration = time.time() - start_time

        return {
            "rows_loaded": total_rows,
            "chunks_processed": chunk_count,
            "duration_seconds": duration,
            "rows_per_second": total_rows / duration if duration > 0 else 0,
            "status": "success"
        }
```

---

## Error Handling and Recovery

```python
"""
Error handling and recovery patterns for data loading.
Ensures data consistency even when failures occur.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import Optional, Callable
import logging
import json

logger = logging.getLogger(__name__)


class TransactionalLoader:
    """
    Loader with comprehensive error handling and recovery.

    Features:
    - Atomic transactions for consistency
    - Automatic retry with exponential backoff
    - Dead letter queue for failed records
    - Checkpoint-based recovery
    """

    def __init__(self, connection_string: str, dlq_table: str = "_dead_letter_queue"):
        self.engine = create_engine(connection_string)
        self.dlq_table = dlq_table
        self._ensure_dlq_table()

    def _ensure_dlq_table(self):
        """Create dead letter queue table for failed records."""
        with self.engine.begin() as conn:
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS {self.dlq_table} (
                    id SERIAL PRIMARY KEY,
                    pipeline_name VARCHAR(255),
                    record_data JSONB,
                    error_message TEXT,
                    error_type VARCHAR(255),
                    retry_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_retry_at TIMESTAMP
                )
            """))

    def load_with_retry(
        self,
        df: pd.DataFrame,
        table_name: str,
        pipeline_name: str,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> dict:
        """
        Load data with automatic retry on failure.

        Uses exponential backoff for retries.
        Records that fail all retries go to dead letter queue.
        """
        import time

        attempt = 0
        last_error = None

        while attempt < max_retries:
            try:
                attempt += 1

                df["_loaded_at"] = datetime.utcnow()
                df.to_sql(table_name, self.engine, if_exists="append", index=False)

                logger.info(f"Load succeeded on attempt {attempt}")
                return {
                    "rows_loaded": len(df),
                    "attempts": attempt,
                    "status": "success"
                }

            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt} failed: {e}")

                if attempt < max_retries:
                    # Exponential backoff
                    sleep_time = retry_delay * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {sleep_time} seconds...")
                    time.sleep(sleep_time)

        # All retries exhausted, send to DLQ
        self._send_to_dlq(df, pipeline_name, str(last_error), type(last_error).__name__)

        return {
            "rows_loaded": 0,
            "rows_to_dlq": len(df),
            "attempts": attempt,
            "error": str(last_error),
            "status": "failed"
        }

    def _send_to_dlq(self, df: pd.DataFrame, pipeline_name: str, error_message: str, error_type: str):
        """Send failed records to dead letter queue for manual review."""
        with self.engine.begin() as conn:
            for _, row in df.iterrows():
                conn.execute(text(f"""
                    INSERT INTO {self.dlq_table} (pipeline_name, record_data, error_message, error_type)
                    VALUES (:pipeline, :data, :error_msg, :error_type)
                """), {
                    "pipeline": pipeline_name,
                    "data": json.dumps(row.to_dict(), default=str),
                    "error_msg": error_message,
                    "error_type": error_type
                })

        logger.info(f"Sent {len(df)} records to dead letter queue")

    def retry_dlq_records(
        self,
        pipeline_name: str,
        target_table: str,
        max_records: int = 100
    ) -> dict:
        """
        Retry failed records from dead letter queue.

        Use this for manual recovery after fixing underlying issues.
        """
        with self.engine.begin() as conn:
            # Get records to retry
            result = conn.execute(text(f"""
                SELECT id, record_data FROM {self.dlq_table}
                WHERE pipeline_name = :pipeline
                  AND retry_count < 3
                ORDER BY created_at
                LIMIT :limit
            """), {"pipeline": pipeline_name, "limit": max_records})

            records = result.fetchall()

            if not records:
                return {"status": "no_records"}

            succeeded = 0
            failed = 0

            for record_id, record_data in records:
                try:
                    df = pd.DataFrame([json.loads(record_data)])
                    df["_loaded_at"] = datetime.utcnow()
                    df["_retry_loaded"] = True

                    df.to_sql(target_table, conn, if_exists="append", index=False)

                    # Remove from DLQ on success
                    conn.execute(text(f"DELETE FROM {self.dlq_table} WHERE id = :id"), {"id": record_id})
                    succeeded += 1

                except Exception as e:
                    # Increment retry count
                    conn.execute(text(f"""
                        UPDATE {self.dlq_table}
                        SET retry_count = retry_count + 1, last_retry_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                    """), {"id": record_id})
                    failed += 1

        return {
            "succeeded": succeeded,
            "failed": failed,
            "status": "completed"
        }


class CheckpointedLoader:
    """
    Loader with checkpoint-based recovery for long-running loads.
    Can resume from last successful batch after failure.
    """

    def __init__(self, connection_string: str, checkpoint_table: str = "_load_checkpoints"):
        self.engine = create_engine(connection_string)
        self.checkpoint_table = checkpoint_table
        self._ensure_checkpoint_table()

    def _ensure_checkpoint_table(self):
        """Create checkpoint tracking table."""
        with self.engine.begin() as conn:
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS {self.checkpoint_table} (
                    load_id VARCHAR(255) PRIMARY KEY,
                    pipeline_name VARCHAR(255),
                    total_batches INT,
                    completed_batches INT,
                    last_batch_index INT,
                    status VARCHAR(50),
                    started_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))

    def load_with_checkpoints(
        self,
        df: pd.DataFrame,
        table_name: str,
        pipeline_name: str,
        batch_size: int = 10000,
        load_id: Optional[str] = None
    ) -> dict:
        """
        Load data with checkpoint tracking for resumable loads.

        If load_id is provided, attempts to resume a previous load.
        """
        from uuid import uuid4

        if load_id is None:
            load_id = str(uuid4())
            start_batch = 0
        else:
            # Resume from checkpoint
            checkpoint = self._get_checkpoint(load_id)
            if checkpoint and checkpoint["status"] == "in_progress":
                start_batch = checkpoint["last_batch_index"] + 1
                logger.info(f"Resuming load {load_id} from batch {start_batch}")
            else:
                start_batch = 0

        total_batches = (len(df) + batch_size - 1) // batch_size

        # Initialize checkpoint
        self._save_checkpoint(load_id, pipeline_name, total_batches, start_batch, "in_progress")

        try:
            for batch_index in range(start_batch, total_batches):
                start_row = batch_index * batch_size
                end_row = min(start_row + batch_size, len(df))
                batch = df.iloc[start_row:end_row]

                batch = batch.copy()
                batch["_loaded_at"] = datetime.utcnow()
                batch["_load_id"] = load_id
                batch["_batch_index"] = batch_index

                batch.to_sql(table_name, self.engine, if_exists="append", index=False)

                # Update checkpoint after each successful batch
                self._save_checkpoint(load_id, pipeline_name, total_batches, batch_index, "in_progress")

                logger.info(f"Completed batch {batch_index + 1}/{total_batches}")

            # Mark as completed
            self._save_checkpoint(load_id, pipeline_name, total_batches, total_batches - 1, "completed")

            return {
                "load_id": load_id,
                "rows_loaded": len(df),
                "batches_completed": total_batches,
                "status": "success"
            }

        except Exception as e:
            self._save_checkpoint(load_id, pipeline_name, total_batches, batch_index - 1, "failed")
            logger.error(f"Load failed at batch {batch_index}: {e}")

            return {
                "load_id": load_id,
                "last_successful_batch": batch_index - 1,
                "error": str(e),
                "status": "failed"
            }

    def _get_checkpoint(self, load_id: str) -> Optional[dict]:
        """Retrieve checkpoint for a load."""
        with self.engine.connect() as conn:
            result = conn.execute(
                text(f"SELECT * FROM {self.checkpoint_table} WHERE load_id = :id"),
                {"id": load_id}
            )
            row = result.fetchone()
            if row:
                return dict(row._mapping)
        return None

    def _save_checkpoint(self, load_id: str, pipeline_name: str, total_batches: int, last_batch: int, status: str):
        """Save or update checkpoint."""
        with self.engine.begin() as conn:
            conn.execute(text(f"""
                INSERT INTO {self.checkpoint_table}
                    (load_id, pipeline_name, total_batches, completed_batches, last_batch_index, status, started_at, updated_at)
                VALUES
                    (:load_id, :pipeline, :total, :completed, :last_batch, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (load_id)
                DO UPDATE SET
                    completed_batches = :completed,
                    last_batch_index = :last_batch,
                    status = :status,
                    updated_at = CURRENT_TIMESTAMP
            """), {
                "load_id": load_id,
                "pipeline": pipeline_name,
                "total": total_batches,
                "completed": last_batch + 1,
                "last_batch": last_batch,
                "status": status
            })
```

---

## Choosing the Right Pattern

Use this decision tree to select the appropriate loading pattern:

```mermaid
flowchart TD
    Start[Choose Loading Pattern] --> Q1{Is data immutable?}

    Q1 -->|Yes| Append[Use Append]
    Q1 -->|No| Q2{Table size?}

    Q2 -->|Small < 1M rows| Q3{Need history?}
    Q2 -->|Large > 1M rows| Q4{Source tracks changes?}

    Q3 -->|No| Overwrite[Use Overwrite]
    Q3 -->|Yes| SCD[Use SCD Type 2]

    Q4 -->|Yes| Delta[Use Delta/CDC]
    Q4 -->|No| Q5{Time-series data?}

    Q5 -->|Yes| Partition[Use Partition Replace]
    Q5 -->|No| Upsert[Use Upsert/Merge]
```

| Scenario | Recommended Pattern |
|----------|-------------------|
| Event logs, clickstream | Append |
| Small reference tables | Overwrite |
| Customer/product master data | Upsert |
| Large transactional tables | Delta/CDC |
| Daily metrics, time-series | Partition Replace |
| Audit trail with history | SCD Type 2 |

---

## Summary

Effective data loading requires matching the pattern to your data characteristics:

- **Append** for immutable event data
- **Overwrite** for complete refreshes of small tables
- **Upsert** for maintaining current state with updates
- **Delta/CDC** for efficient incremental processing
- **Partition Replace** for time-series and large datasets

Key implementation principles:

1. **Use transactions** for atomic operations
2. **Implement checkpoints** for resumable loads
3. **Handle errors gracefully** with retries and dead letter queues
4. **Monitor performance** with timing and row counts
5. **Add metadata** (_loaded_at, _load_id) for lineage tracking

The right loading pattern combined with proper error handling creates reliable data pipelines that maintain consistency even under failure conditions.
