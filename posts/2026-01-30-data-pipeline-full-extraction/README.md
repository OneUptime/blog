# How to Implement Full Extraction

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Data Pipeline, ETL, Full Load, Data Integration

Description: Learn to implement full extraction patterns for complete data refresh scenarios in data pipelines.

---

> Full extraction is the foundation of reliable data pipelines. Before optimizing with incremental loads, master the fundamentals of complete data refresh.

Full extraction (also called full load) is a data extraction pattern where you pull the entire dataset from a source system during each extraction cycle. While it may seem inefficient compared to incremental extraction, there are many scenarios where full extraction is the right choice or even the only viable option.

This guide covers when to use full extraction, how to implement it efficiently, performance optimization techniques, and practical code examples you can adapt for production use.

---

## Table of Contents

1. What is Full Extraction?
2. When to Use Full Extraction
3. Architecture Overview
4. Basic Implementation in Python
5. Handling Large Datasets with Batching
6. Parallel Extraction Patterns
7. Data Validation and Quality Checks
8. Full vs Incremental Extraction Comparison
9. Performance Optimization Strategies
10. Error Handling and Recovery
11. Monitoring and Observability
12. Production Ready Example
13. Common Pitfalls and Solutions
14. Summary

---

## 1. What is Full Extraction?

Full extraction is a data loading strategy where the entire source dataset is extracted and loaded into the target system during each run. The existing data in the target is typically replaced or merged with the newly extracted data.

```mermaid
flowchart LR
    subgraph Source["Source System"]
        S1[(Database)]
        S2[API]
        S3[Files]
    end

    subgraph Extract["Full Extraction"]
        E1[Read All Records]
        E2[Transform Data]
        E3[Validate Quality]
    end

    subgraph Target["Target System"]
        T1[(Data Warehouse)]
        T2[Data Lake]
    end

    S1 --> E1
    S2 --> E1
    S3 --> E1
    E1 --> E2
    E2 --> E3
    E3 --> T1
    E3 --> T2
```

| Concept | Description |
|---------|-------------|
| Full Extraction | Pulling all records from source system regardless of changes |
| Full Load | Loading all extracted records into target, replacing existing data |
| Snapshot | A point-in-time copy of the complete dataset |
| Truncate and Load | Clearing target table before loading fresh data |
| Merge/Upsert | Combining new data with existing records based on keys |

---

## 2. When to Use Full Extraction

Full extraction is the right choice in several scenarios:

### Source System Limitations

- No reliable change tracking mechanism (no timestamps, no CDC)
- Source does not support incremental queries
- Change data is unreliable or frequently corrupted

### Data Characteristics

- Small to medium datasets (under 10 million rows)
- Reference data that changes unpredictably
- Data with frequent deletes that are hard to track
- Datasets where most records change between extractions

### Business Requirements

- Need for guaranteed data consistency
- Regulatory requirements for complete audit trails
- Data reconciliation and validation needs
- Disaster recovery and data restoration scenarios

### Technical Simplicity

- Simpler implementation and maintenance
- Easier debugging and troubleshooting
- No complex state management required
- Clear recovery path after failures

```mermaid
flowchart TD
    A[Start: Choose Extraction Strategy] --> B{Does source have<br/>change tracking?}
    B -->|No| C[Use Full Extraction]
    B -->|Yes| D{Is dataset<br/>small < 10M rows?}
    D -->|Yes| E{Is change rate<br/>high > 50%?}
    D -->|No| F[Consider Incremental]
    E -->|Yes| C
    E -->|No| F
    F --> G{Need guaranteed<br/>consistency?}
    G -->|Yes| C
    G -->|No| H[Use Incremental Extraction]
```

---

## 3. Architecture Overview

A well designed full extraction pipeline has several key components:

```mermaid
flowchart TB
    subgraph Orchestration["Orchestration Layer"]
        ORCH[Scheduler/Workflow Engine]
    end

    subgraph Extraction["Extraction Layer"]
        CONN[Connection Manager]
        READER[Data Reader]
        BATCH[Batch Processor]
    end

    subgraph Transform["Transformation Layer"]
        CLEAN[Data Cleansing]
        MAP[Schema Mapping]
        ENRICH[Data Enrichment]
    end

    subgraph Quality["Quality Layer"]
        VALID[Validation Rules]
        RECON[Reconciliation]
        ALERT[Alert Manager]
    end

    subgraph Load["Load Layer"]
        STAGE[Staging Area]
        LOADER[Bulk Loader]
        SWAP[Table Swap]
    end

    ORCH --> CONN
    CONN --> READER
    READER --> BATCH
    BATCH --> CLEAN
    CLEAN --> MAP
    MAP --> ENRICH
    ENRICH --> VALID
    VALID --> RECON
    RECON --> ALERT
    VALID --> STAGE
    STAGE --> LOADER
    LOADER --> SWAP
```

### Key Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| Connection Manager | Handle database connections with pooling and retry logic | SQLAlchemy, psycopg2 |
| Data Reader | Read data efficiently with cursor management | Server-side cursors, streaming |
| Batch Processor | Process data in manageable chunks | Configurable batch sizes |
| Staging Area | Temporary storage before final load | Staging tables, temp files |
| Bulk Loader | Fast data insertion | COPY command, bulk insert |
| Table Swap | Atomic replacement of target data | Rename operations, views |

---

## 4. Basic Implementation in Python

Here is a foundational implementation of full extraction using Python:

```python
# full_extraction.py
# Basic full extraction implementation with connection management and batching

import logging
from typing import Iterator, Dict, Any, List
from dataclasses import dataclass
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging for visibility into extraction process
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ExtractionConfig:
    """Configuration for full extraction job."""
    source_host: str
    source_port: int
    source_database: str
    source_user: str
    source_password: str
    source_table: str
    target_host: str
    target_port: int
    target_database: str
    target_user: str
    target_password: str
    target_table: str
    batch_size: int = 10000  # Number of rows per batch


@contextmanager
def get_source_connection(config: ExtractionConfig):
    """
    Create a connection to the source database.
    Uses context manager for automatic cleanup.
    """
    conn = None
    try:
        conn = psycopg2.connect(
            host=config.source_host,
            port=config.source_port,
            database=config.source_database,
            user=config.source_user,
            password=config.source_password,
        )
        # Use server-side cursor for large result sets
        # This prevents loading entire dataset into memory
        conn.set_session(autocommit=True)
        yield conn
    finally:
        if conn:
            conn.close()


@contextmanager
def get_target_connection(config: ExtractionConfig):
    """
    Create a connection to the target database.
    Uses context manager for automatic cleanup.
    """
    conn = None
    try:
        conn = psycopg2.connect(
            host=config.target_host,
            port=config.target_port,
            database=config.target_database,
            user=config.target_user,
            password=config.target_password,
        )
        yield conn
    finally:
        if conn:
            conn.close()


def extract_full_data(
    config: ExtractionConfig
) -> Iterator[List[Dict[str, Any]]]:
    """
    Extract all data from source table in batches.

    Uses server-side cursor to handle large datasets without
    loading everything into memory at once.

    Yields:
        Batches of rows as list of dictionaries
    """
    query = f"SELECT * FROM {config.source_table}"

    with get_source_connection(config) as conn:
        # Named cursor creates server-side cursor in PostgreSQL
        # This streams results instead of fetching all at once
        cursor_name = f"extract_{config.source_table}"

        with conn.cursor(
            name=cursor_name,
            cursor_factory=RealDictCursor
        ) as cursor:
            cursor.itersize = config.batch_size
            cursor.execute(query)

            batch = []
            row_count = 0

            for row in cursor:
                batch.append(dict(row))
                row_count += 1

                # Yield batch when it reaches configured size
                if len(batch) >= config.batch_size:
                    logger.info(f"Extracted batch, total rows: {row_count}")
                    yield batch
                    batch = []

            # Yield remaining rows
            if batch:
                logger.info(f"Extracted final batch, total rows: {row_count}")
                yield batch


def load_to_staging(
    config: ExtractionConfig,
    data_iterator: Iterator[List[Dict[str, Any]]]
) -> int:
    """
    Load extracted data to staging table.

    Creates a staging table, loads all data, then performs
    atomic swap with production table.

    Returns:
        Total number of rows loaded
    """
    staging_table = f"{config.target_table}_staging"
    total_rows = 0

    with get_target_connection(config) as conn:
        with conn.cursor() as cursor:
            # Step 1: Create staging table as copy of target structure
            logger.info(f"Creating staging table: {staging_table}")
            cursor.execute(f"""
                DROP TABLE IF EXISTS {staging_table};
                CREATE TABLE {staging_table}
                (LIKE {config.target_table} INCLUDING ALL);
            """)
            conn.commit()

            # Step 2: Load data into staging table
            for batch in data_iterator:
                if not batch:
                    continue

                # Get column names from first row
                columns = list(batch[0].keys())
                placeholders = ", ".join(["%s"] * len(columns))
                column_list = ", ".join(columns)

                insert_query = f"""
                    INSERT INTO {staging_table} ({column_list})
                    VALUES ({placeholders})
                """

                # Batch insert for performance
                values = [tuple(row[col] for col in columns) for row in batch]
                cursor.executemany(insert_query, values)
                conn.commit()

                total_rows += len(batch)
                logger.info(f"Loaded {len(batch)} rows to staging, total: {total_rows}")

            # Step 3: Atomic swap - replace target with staging
            logger.info("Performing atomic table swap")
            backup_table = f"{config.target_table}_backup"

            cursor.execute(f"""
                BEGIN;
                DROP TABLE IF EXISTS {backup_table};
                ALTER TABLE {config.target_table} RENAME TO {backup_table.split('.')[-1]};
                ALTER TABLE {staging_table} RENAME TO {config.target_table.split('.')[-1]};
                COMMIT;
            """)

            logger.info(f"Full extraction complete. Total rows: {total_rows}")
            return total_rows


def run_full_extraction(config: ExtractionConfig) -> Dict[str, Any]:
    """
    Execute full extraction pipeline.

    Returns:
        Dictionary with extraction statistics
    """
    import time

    start_time = time.time()

    logger.info(f"Starting full extraction from {config.source_table}")

    # Extract data as iterator (memory efficient)
    data_iterator = extract_full_data(config)

    # Load to target via staging
    total_rows = load_to_staging(config, data_iterator)

    elapsed_time = time.time() - start_time

    return {
        "status": "success",
        "source_table": config.source_table,
        "target_table": config.target_table,
        "total_rows": total_rows,
        "elapsed_seconds": round(elapsed_time, 2),
        "rows_per_second": round(total_rows / elapsed_time, 2) if elapsed_time > 0 else 0
    }


# Example usage
if __name__ == "__main__":
    config = ExtractionConfig(
        source_host="source-db.example.com",
        source_port=5432,
        source_database="production",
        source_user="etl_reader",
        source_password="secret",
        source_table="public.customers",
        target_host="warehouse.example.com",
        target_port=5432,
        target_database="analytics",
        target_user="etl_writer",
        target_password="secret",
        target_table="raw.customers",
        batch_size=10000
    )

    result = run_full_extraction(config)
    print(f"Extraction result: {result}")
```

---

## 5. Handling Large Datasets with Batching

For datasets exceeding available memory, implement streaming extraction with proper batching:

```python
# streaming_extraction.py
# Memory-efficient streaming extraction for large datasets

import io
import csv
from typing import Iterator, Generator
import psycopg2
from psycopg2 import sql


class StreamingExtractor:
    """
    Handles extraction of large datasets using streaming techniques.

    Uses PostgreSQL COPY command for efficient bulk operations
    and processes data in configurable chunks to manage memory.
    """

    def __init__(
        self,
        connection_string: str,
        batch_size: int = 50000,
        temp_buffer_size: int = 10 * 1024 * 1024  # 10MB buffer
    ):
        self.connection_string = connection_string
        self.batch_size = batch_size
        self.temp_buffer_size = temp_buffer_size

    def extract_to_csv_stream(
        self,
        table_name: str,
        columns: list = None
    ) -> Generator[bytes, None, None]:
        """
        Stream table data as CSV bytes.

        Uses PostgreSQL COPY TO STDOUT for maximum performance.
        Data is streamed directly without loading into memory.

        Yields:
            Chunks of CSV data as bytes
        """
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                # Build COPY command
                if columns:
                    col_list = sql.SQL(", ").join(
                        sql.Identifier(c) for c in columns
                    )
                    copy_sql = sql.SQL(
                        "COPY (SELECT {} FROM {}) TO STDOUT WITH CSV HEADER"
                    ).format(col_list, sql.Identifier(table_name))
                else:
                    copy_sql = sql.SQL(
                        "COPY {} TO STDOUT WITH CSV HEADER"
                    ).format(sql.Identifier(table_name))

                # Create a buffer to collect streamed data
                buffer = io.BytesIO()

                # Use copy_expert for streaming COPY
                cursor.copy_expert(copy_sql, buffer)

                # Reset buffer position and yield in chunks
                buffer.seek(0)
                while True:
                    chunk = buffer.read(self.temp_buffer_size)
                    if not chunk:
                        break
                    yield chunk

    def extract_with_cursor_batching(
        self,
        query: str
    ) -> Iterator[list]:
        """
        Extract query results using server-side cursor with batching.

        This approach works well when you need to process/transform
        data during extraction rather than just copying it.

        Args:
            query: SQL query to execute

        Yields:
            Lists of tuples (batch_size rows at a time)
        """
        with psycopg2.connect(self.connection_string) as conn:
            # Server-side cursor is created with a name
            with conn.cursor(name="streaming_cursor") as cursor:
                cursor.itersize = self.batch_size
                cursor.execute(query)

                while True:
                    # Fetch batch_size rows at a time
                    rows = cursor.fetchmany(self.batch_size)
                    if not rows:
                        break
                    yield rows

    def extract_with_keyset_pagination(
        self,
        table_name: str,
        key_column: str,
        columns: list = None
    ) -> Iterator[list]:
        """
        Extract using keyset pagination for consistent performance.

        Unlike OFFSET/LIMIT which slows down on later pages,
        keyset pagination maintains consistent speed regardless
        of how deep into the dataset you are.

        This is the recommended approach for very large tables.

        Args:
            table_name: Table to extract from
            key_column: Primary key or indexed column for pagination
            columns: Optional list of columns (None = all columns)

        Yields:
            Batches of rows
        """
        col_select = "*" if not columns else ", ".join(columns)
        last_key = None

        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                while True:
                    if last_key is None:
                        # First batch - no WHERE clause needed
                        query = f"""
                            SELECT {col_select}
                            FROM {table_name}
                            ORDER BY {key_column}
                            LIMIT {self.batch_size}
                        """
                        cursor.execute(query)
                    else:
                        # Subsequent batches - start after last key
                        query = f"""
                            SELECT {col_select}
                            FROM {table_name}
                            WHERE {key_column} > %s
                            ORDER BY {key_column}
                            LIMIT {self.batch_size}
                        """
                        cursor.execute(query, (last_key,))

                    rows = cursor.fetchall()

                    if not rows:
                        break

                    # Track the last key for next iteration
                    # Assumes key_column is first in result set
                    last_key = rows[-1][0]

                    yield rows


# Example: Using streaming extraction with COPY for bulk transfer
def bulk_transfer_example():
    """
    Example of bulk data transfer using streaming COPY.

    This is the fastest method for moving large amounts of data
    between PostgreSQL databases.
    """
    source_conn_string = "postgresql://user:pass@source:5432/db"
    target_conn_string = "postgresql://user:pass@target:5432/db"

    extractor = StreamingExtractor(source_conn_string)

    # Stream data from source
    with psycopg2.connect(target_conn_string) as target_conn:
        with target_conn.cursor() as target_cursor:
            # Prepare target table
            target_cursor.execute("TRUNCATE TABLE target_schema.customers")

            # Create a pipe to stream data directly
            buffer = io.BytesIO()

            # Collect streamed CSV data
            for chunk in extractor.extract_to_csv_stream("customers"):
                buffer.write(chunk)

            buffer.seek(0)

            # Load directly using COPY FROM
            target_cursor.copy_expert(
                "COPY target_schema.customers FROM STDIN WITH CSV HEADER",
                buffer
            )

            target_conn.commit()
```

---

## 6. Parallel Extraction Patterns

For faster extraction from large tables, use parallel processing:

```python
# parallel_extraction.py
# Parallel extraction using multiprocessing for improved throughput

import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any
import psycopg2
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PartitionConfig:
    """Configuration for a single extraction partition."""
    partition_id: int
    start_key: Any
    end_key: Any
    source_connection_string: str
    table_name: str
    key_column: str


def extract_partition(config: PartitionConfig) -> Dict[str, Any]:
    """
    Extract a single partition of data.

    This function runs in a separate process, extracting rows
    where the key column falls within the specified range.

    Args:
        config: Partition configuration with key range

    Returns:
        Dictionary with partition statistics and data
    """
    start_time = time.time()
    rows = []

    try:
        with psycopg2.connect(config.source_connection_string) as conn:
            with conn.cursor() as cursor:
                # Extract rows within this partition's key range
                query = f"""
                    SELECT *
                    FROM {config.table_name}
                    WHERE {config.key_column} >= %s
                      AND {config.key_column} < %s
                    ORDER BY {config.key_column}
                """
                cursor.execute(query, (config.start_key, config.end_key))
                rows = cursor.fetchall()

                # Get column names for later use
                columns = [desc[0] for desc in cursor.description]

        elapsed = time.time() - start_time

        return {
            "partition_id": config.partition_id,
            "status": "success",
            "row_count": len(rows),
            "elapsed_seconds": round(elapsed, 2),
            "columns": columns,
            "data": rows
        }

    except Exception as e:
        logger.error(f"Partition {config.partition_id} failed: {e}")
        return {
            "partition_id": config.partition_id,
            "status": "error",
            "error": str(e),
            "row_count": 0,
            "data": []
        }


class ParallelExtractor:
    """
    Manages parallel extraction across multiple processes.

    Splits the source table into partitions based on a key column,
    then extracts each partition in parallel for improved throughput.
    """

    def __init__(
        self,
        source_connection_string: str,
        num_workers: int = None
    ):
        self.source_connection_string = source_connection_string
        # Default to CPU count minus 1 to leave headroom
        self.num_workers = num_workers or max(1, mp.cpu_count() - 1)

    def calculate_partitions(
        self,
        table_name: str,
        key_column: str,
        num_partitions: int = None
    ) -> List[Tuple[Any, Any]]:
        """
        Calculate partition boundaries based on data distribution.

        Uses percentile calculation to create evenly sized partitions
        regardless of key value distribution.

        Args:
            table_name: Table to partition
            key_column: Column to partition on (should be indexed)
            num_partitions: Number of partitions (defaults to num_workers)

        Returns:
            List of (start_key, end_key) tuples
        """
        num_partitions = num_partitions or self.num_workers

        with psycopg2.connect(self.source_connection_string) as conn:
            with conn.cursor() as cursor:
                # Get min and max keys
                cursor.execute(f"""
                    SELECT MIN({key_column}), MAX({key_column})
                    FROM {table_name}
                """)
                min_key, max_key = cursor.fetchone()

                if min_key is None or max_key is None:
                    return []

                # For numeric keys, calculate even splits
                # For other types, use percentile approach
                cursor.execute(f"""
                    SELECT {key_column}
                    FROM (
                        SELECT {key_column},
                               NTILE({num_partitions}) OVER (ORDER BY {key_column}) as bucket
                        FROM {table_name}
                    ) t
                    GROUP BY bucket, {key_column}
                    HAVING {key_column} = MAX({key_column})
                    ORDER BY bucket
                """)

                boundaries = [row[0] for row in cursor.fetchall()]

                # Create partition ranges
                partitions = []
                prev_key = min_key

                for boundary in boundaries[:-1]:
                    partitions.append((prev_key, boundary))
                    prev_key = boundary

                # Last partition goes to max_key + 1 (or use inclusive upper bound)
                partitions.append((prev_key, max_key + 1 if isinstance(max_key, int) else max_key))

                return partitions

    def extract_parallel(
        self,
        table_name: str,
        key_column: str
    ) -> Dict[str, Any]:
        """
        Execute parallel extraction across all partitions.

        Args:
            table_name: Source table to extract
            key_column: Column for partitioning

        Returns:
            Combined results from all partitions
        """
        start_time = time.time()

        # Calculate partition boundaries
        logger.info(f"Calculating {self.num_workers} partitions for {table_name}")
        partitions = self.calculate_partitions(table_name, key_column)

        if not partitions:
            logger.warning("No data found in source table")
            return {"status": "empty", "total_rows": 0}

        # Create partition configs
        partition_configs = [
            PartitionConfig(
                partition_id=i,
                start_key=start,
                end_key=end,
                source_connection_string=self.source_connection_string,
                table_name=table_name,
                key_column=key_column
            )
            for i, (start, end) in enumerate(partitions)
        ]

        logger.info(f"Starting parallel extraction with {self.num_workers} workers")

        # Execute extractions in parallel using process pool
        # ProcessPoolExecutor is better for CPU-bound work and avoids GIL
        results = []
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            results = list(executor.map(extract_partition, partition_configs))

        # Combine results
        total_rows = sum(r["row_count"] for r in results)
        failed_partitions = [r for r in results if r["status"] == "error"]
        elapsed = time.time() - start_time

        # Get columns from first successful result
        columns = None
        all_data = []
        for r in results:
            if r["status"] == "success":
                if columns is None:
                    columns = r.get("columns", [])
                all_data.extend(r.get("data", []))

        return {
            "status": "success" if not failed_partitions else "partial",
            "total_rows": total_rows,
            "elapsed_seconds": round(elapsed, 2),
            "rows_per_second": round(total_rows / elapsed, 2) if elapsed > 0 else 0,
            "num_partitions": len(partitions),
            "failed_partitions": len(failed_partitions),
            "columns": columns,
            "data": all_data
        }


# Example usage
if __name__ == "__main__":
    extractor = ParallelExtractor(
        source_connection_string="postgresql://user:pass@localhost:5432/mydb",
        num_workers=4
    )

    result = extractor.extract_parallel(
        table_name="public.large_events_table",
        key_column="event_id"
    )

    print(f"Extracted {result['total_rows']} rows in {result['elapsed_seconds']}s")
    print(f"Throughput: {result['rows_per_second']} rows/second")
```

---

## 7. Data Validation and Quality Checks

Ensure data integrity with comprehensive validation:

```python
# data_validation.py
# Data quality validation for extraction pipelines

from dataclasses import dataclass, field
from typing import List, Dict, Any, Callable, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Severity levels for validation failures."""
    ERROR = "error"      # Fails the pipeline
    WARNING = "warning"  # Logs but continues
    INFO = "info"        # Informational only


@dataclass
class ValidationResult:
    """Result of a single validation check."""
    check_name: str
    passed: bool
    severity: ValidationSeverity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationReport:
    """Aggregated validation results."""
    source_table: str
    target_table: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    results: List[ValidationResult]

    @property
    def has_errors(self) -> bool:
        """Check if any ERROR severity validations failed."""
        return any(
            not r.passed and r.severity == ValidationSeverity.ERROR
            for r in self.results
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary for logging/storage."""
        return {
            "source_table": self.source_table,
            "target_table": self.target_table,
            "total_checks": self.total_checks,
            "passed_checks": self.passed_checks,
            "failed_checks": self.failed_checks,
            "has_blocking_errors": self.has_errors,
            "results": [
                {
                    "check": r.check_name,
                    "passed": r.passed,
                    "severity": r.severity.value,
                    "message": r.message,
                    "details": r.details
                }
                for r in self.results
            ]
        }


class DataValidator:
    """
    Validates data quality for extraction pipelines.

    Provides common validation checks for row counts, null values,
    data types, and custom business rules.
    """

    def __init__(self, source_conn, target_conn):
        self.source_conn = source_conn
        self.target_conn = target_conn
        self.results: List[ValidationResult] = []

    def validate_row_count(
        self,
        source_table: str,
        target_table: str,
        tolerance_percent: float = 0.0
    ) -> ValidationResult:
        """
        Validate that target has expected row count.

        Args:
            source_table: Source table name
            target_table: Target table name
            tolerance_percent: Allowed variance (0.0 = exact match required)

        Returns:
            ValidationResult with pass/fail status
        """
        # Get source count
        with self.source_conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {source_table}")
            source_count = cursor.fetchone()[0]

        # Get target count
        with self.target_conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {target_table}")
            target_count = cursor.fetchone()[0]

        # Calculate difference
        if source_count == 0:
            variance = 0 if target_count == 0 else 100
        else:
            variance = abs(source_count - target_count) / source_count * 100

        passed = variance <= tolerance_percent

        result = ValidationResult(
            check_name="row_count_match",
            passed=passed,
            severity=ValidationSeverity.ERROR,
            message=f"Row count: source={source_count}, target={target_count}, variance={variance:.2f}%",
            details={
                "source_count": source_count,
                "target_count": target_count,
                "variance_percent": round(variance, 2),
                "tolerance_percent": tolerance_percent
            }
        )

        self.results.append(result)
        return result

    def validate_null_counts(
        self,
        table: str,
        columns: List[str],
        conn,
        max_null_percent: float = 0.0
    ) -> List[ValidationResult]:
        """
        Validate null value counts for specified columns.

        Args:
            table: Table to check
            columns: List of column names to validate
            conn: Database connection to use
            max_null_percent: Maximum allowed null percentage

        Returns:
            List of ValidationResults for each column
        """
        results = []

        with conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            total_rows = cursor.fetchone()[0]

            for column in columns:
                cursor.execute(f"""
                    SELECT COUNT(*)
                    FROM {table}
                    WHERE {column} IS NULL
                """)
                null_count = cursor.fetchone()[0]

                null_percent = (null_count / total_rows * 100) if total_rows > 0 else 0
                passed = null_percent <= max_null_percent

                result = ValidationResult(
                    check_name=f"null_check_{column}",
                    passed=passed,
                    severity=ValidationSeverity.WARNING,
                    message=f"Column {column}: {null_count} nulls ({null_percent:.2f}%)",
                    details={
                        "column": column,
                        "null_count": null_count,
                        "null_percent": round(null_percent, 2),
                        "max_allowed_percent": max_null_percent
                    }
                )

                results.append(result)
                self.results.append(result)

        return results

    def validate_checksum(
        self,
        source_table: str,
        target_table: str,
        checksum_columns: List[str]
    ) -> ValidationResult:
        """
        Validate data integrity using checksum comparison.

        Computes a hash-based checksum on specified columns
        to verify data was transferred correctly.

        Args:
            source_table: Source table name
            target_table: Target table name
            checksum_columns: Columns to include in checksum

        Returns:
            ValidationResult indicating checksum match
        """
        col_concat = " || ".join(
            f"COALESCE({col}::text, '')" for col in checksum_columns
        )

        checksum_query = f"""
            SELECT MD5(STRING_AGG(row_hash, '' ORDER BY row_hash))
            FROM (
                SELECT MD5({col_concat}) as row_hash
                FROM {{table}}
            ) t
        """

        # Get source checksum
        with self.source_conn.cursor() as cursor:
            cursor.execute(checksum_query.format(table=source_table))
            source_checksum = cursor.fetchone()[0]

        # Get target checksum
        with self.target_conn.cursor() as cursor:
            cursor.execute(checksum_query.format(table=target_table))
            target_checksum = cursor.fetchone()[0]

        passed = source_checksum == target_checksum

        result = ValidationResult(
            check_name="checksum_match",
            passed=passed,
            severity=ValidationSeverity.ERROR,
            message=f"Checksum {'matched' if passed else 'MISMATCH'}",
            details={
                "source_checksum": source_checksum,
                "target_checksum": target_checksum,
                "columns_checked": checksum_columns
            }
        )

        self.results.append(result)
        return result

    def validate_custom(
        self,
        name: str,
        check_fn: Callable[[], bool],
        severity: ValidationSeverity = ValidationSeverity.WARNING,
        message_fn: Callable[[], str] = None
    ) -> ValidationResult:
        """
        Run a custom validation check.

        Args:
            name: Name for this validation
            check_fn: Function that returns True if validation passes
            severity: How to treat failures
            message_fn: Optional function to generate message

        Returns:
            ValidationResult from custom check
        """
        try:
            passed = check_fn()
            message = message_fn() if message_fn else f"Custom check '{name}' {'passed' if passed else 'failed'}"
        except Exception as e:
            passed = False
            message = f"Custom check '{name}' raised exception: {e}"

        result = ValidationResult(
            check_name=name,
            passed=passed,
            severity=severity,
            message=message
        )

        self.results.append(result)
        return result

    def generate_report(
        self,
        source_table: str,
        target_table: str
    ) -> ValidationReport:
        """
        Generate validation report from all checks run.

        Returns:
            ValidationReport with aggregated results
        """
        passed = sum(1 for r in self.results if r.passed)
        failed = len(self.results) - passed

        return ValidationReport(
            source_table=source_table,
            target_table=target_table,
            total_checks=len(self.results),
            passed_checks=passed,
            failed_checks=failed,
            results=self.results
        )


# Example usage in extraction pipeline
def run_extraction_with_validation():
    """
    Example of running full extraction with data validation.
    """
    import psycopg2

    source_conn = psycopg2.connect("postgresql://user:pass@source:5432/db")
    target_conn = psycopg2.connect("postgresql://user:pass@target:5432/db")

    try:
        # ... perform extraction ...

        # Run validations
        validator = DataValidator(source_conn, target_conn)

        # Row count must match exactly
        validator.validate_row_count(
            "source.customers",
            "target.customers",
            tolerance_percent=0.0
        )

        # Check for unexpected nulls
        validator.validate_null_counts(
            "target.customers",
            columns=["customer_id", "email", "created_at"],
            conn=target_conn,
            max_null_percent=0.0
        )

        # Verify data integrity with checksum
        validator.validate_checksum(
            "source.customers",
            "target.customers",
            checksum_columns=["customer_id", "email", "name"]
        )

        # Generate and check report
        report = validator.generate_report("source.customers", "target.customers")

        if report.has_errors:
            logger.error(f"Validation failed: {report.to_dict()}")
            raise Exception("Data validation failed with errors")
        else:
            logger.info(f"Validation passed: {report.passed_checks}/{report.total_checks} checks")

    finally:
        source_conn.close()
        target_conn.close()
```

---

## 8. Full vs Incremental Extraction Comparison

Understanding when to use each approach:

```mermaid
flowchart TB
    subgraph Full["Full Extraction"]
        F1[Extract ALL Records]
        F2[Replace Target Data]
        F3[Simple Implementation]
        F4[Guaranteed Consistency]
    end

    subgraph Incremental["Incremental Extraction"]
        I1[Extract Changed Records]
        I2[Merge with Existing]
        I3[Complex State Management]
        I4[Faster for Large Tables]
    end

    F1 --> F2 --> F3 --> F4
    I1 --> I2 --> I3 --> I4
```

### Detailed Comparison

| Aspect | Full Extraction | Incremental Extraction |
|--------|-----------------|------------------------|
| **Data Volume** | Extracts entire dataset every run | Only changed/new records |
| **Complexity** | Simple to implement and debug | Requires change tracking logic |
| **Source Requirements** | None - works with any source | Needs timestamps, CDC, or logs |
| **Delete Handling** | Automatic - deleted rows disappear | Must explicitly track deletes |
| **Recovery** | Easy - just rerun | Complex state recovery needed |
| **Consistency** | Guaranteed point-in-time snapshot | Can have timing edge cases |
| **Resource Usage** | Higher network/IO per run | Lower per-run resource usage |
| **Run Time** | Proportional to total data size | Proportional to change volume |
| **Best For** | Small/medium tables, reference data | Large tables, append-heavy data |

### Performance Comparison

```python
# performance_comparison.py
# Compare full vs incremental extraction performance

from dataclasses import dataclass
from typing import Dict, Any
import time


@dataclass
class ExtractionMetrics:
    """Metrics for extraction performance comparison."""
    method: str
    total_rows: int
    rows_extracted: int
    extraction_time_seconds: float
    load_time_seconds: float
    total_time_seconds: float

    @property
    def rows_per_second(self) -> float:
        if self.total_time_seconds == 0:
            return 0
        return self.rows_extracted / self.total_time_seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method,
            "total_rows": self.total_rows,
            "rows_extracted": self.rows_extracted,
            "extraction_time_seconds": round(self.extraction_time_seconds, 2),
            "load_time_seconds": round(self.load_time_seconds, 2),
            "total_time_seconds": round(self.total_time_seconds, 2),
            "rows_per_second": round(self.rows_per_second, 2)
        }


def estimate_extraction_time(
    total_rows: int,
    change_rate_percent: float,
    rows_per_second_full: float = 50000,
    rows_per_second_incremental: float = 50000,
    overhead_seconds: float = 10
) -> Dict[str, ExtractionMetrics]:
    """
    Estimate extraction times for full vs incremental approaches.

    Args:
        total_rows: Total rows in source table
        change_rate_percent: Percentage of rows that change between runs
        rows_per_second_full: Throughput for full extraction
        rows_per_second_incremental: Throughput for incremental
        overhead_seconds: Fixed overhead per extraction run

    Returns:
        Dictionary with metrics for each approach
    """
    changed_rows = int(total_rows * change_rate_percent / 100)

    # Full extraction metrics
    full_extract_time = total_rows / rows_per_second_full
    full_load_time = total_rows / rows_per_second_full  # Similar for load
    full_total = full_extract_time + full_load_time + overhead_seconds

    full_metrics = ExtractionMetrics(
        method="full",
        total_rows=total_rows,
        rows_extracted=total_rows,
        extraction_time_seconds=full_extract_time,
        load_time_seconds=full_load_time,
        total_time_seconds=full_total
    )

    # Incremental extraction metrics
    incr_extract_time = changed_rows / rows_per_second_incremental
    incr_load_time = changed_rows / rows_per_second_incremental
    # Additional overhead for change detection and merge logic
    incr_overhead = overhead_seconds * 2
    incr_total = incr_extract_time + incr_load_time + incr_overhead

    incr_metrics = ExtractionMetrics(
        method="incremental",
        total_rows=total_rows,
        rows_extracted=changed_rows,
        extraction_time_seconds=incr_extract_time,
        load_time_seconds=incr_load_time,
        total_time_seconds=incr_total
    )

    return {
        "full": full_metrics,
        "incremental": incr_metrics,
        "recommendation": "incremental" if incr_total < full_total else "full",
        "time_savings_seconds": abs(full_total - incr_total),
        "breakeven_change_rate": calculate_breakeven_rate(
            total_rows, rows_per_second_full,
            rows_per_second_incremental, overhead_seconds
        )
    }


def calculate_breakeven_rate(
    total_rows: int,
    full_rps: float,
    incr_rps: float,
    overhead: float
) -> float:
    """
    Calculate the change rate at which both methods take equal time.

    Above this rate, full extraction becomes more efficient.
    Below this rate, incremental is more efficient.
    """
    # Full time: 2 * (total_rows / full_rps) + overhead
    # Incr time: 2 * (changed_rows / incr_rps) + 2 * overhead
    # At breakeven: full_time = incr_time
    # Solving for change_rate...

    full_time = 2 * (total_rows / full_rps) + overhead
    # incr_time = 2 * (rate * total_rows / incr_rps) + 2 * overhead
    # full_time = 2 * (rate * total_rows / incr_rps) + 2 * overhead
    # rate = (full_time - 2 * overhead) * incr_rps / (2 * total_rows)

    breakeven = (full_time - 2 * overhead) * incr_rps / (2 * total_rows)
    return min(100, max(0, breakeven * 100))


# Example comparison
if __name__ == "__main__":
    scenarios = [
        {"total_rows": 100000, "change_rate": 5},    # Small table, low changes
        {"total_rows": 100000, "change_rate": 50},   # Small table, high changes
        {"total_rows": 10000000, "change_rate": 1},  # Large table, low changes
        {"total_rows": 10000000, "change_rate": 30}, # Large table, high changes
    ]

    print("Extraction Method Comparison")
    print("=" * 60)

    for scenario in scenarios:
        result = estimate_extraction_time(
            total_rows=scenario["total_rows"],
            change_rate_percent=scenario["change_rate"]
        )

        print(f"\nScenario: {scenario['total_rows']:,} rows, {scenario['change_rate']}% change rate")
        print(f"  Full extraction: {result['full'].total_time_seconds:.1f}s")
        print(f"  Incremental: {result['incremental'].total_time_seconds:.1f}s")
        print(f"  Recommendation: {result['recommendation']}")
        print(f"  Breakeven change rate: {result['breakeven_change_rate']:.1f}%")
```

---

## 9. Performance Optimization Strategies

Maximize extraction throughput with these optimizations:

```python
# performance_optimization.py
# Performance optimization techniques for full extraction

import psycopg2
from psycopg2 import sql
from typing import List, Dict, Any
import io
import logging

logger = logging.getLogger(__name__)


class OptimizedExtractor:
    """
    Implements various optimization techniques for full extraction.

    Techniques include:
    - COPY command for bulk operations
    - Parallel index creation
    - Minimal logging during load
    - Compression for network transfer
    """

    def __init__(self, source_conn_string: str, target_conn_string: str):
        self.source_conn_string = source_conn_string
        self.target_conn_string = target_conn_string

    def extract_with_copy(
        self,
        source_table: str,
        target_table: str,
        columns: List[str] = None
    ) -> Dict[str, Any]:
        """
        Use PostgreSQL COPY for maximum throughput.

        COPY is significantly faster than INSERT statements because:
        - Bypasses SQL parsing for each row
        - Uses binary protocol (optionally)
        - Batches network round trips

        Args:
            source_table: Source table name
            target_table: Target table name
            columns: Optional column list (None = all columns)
        """
        import time
        start_time = time.time()

        # Buffer for data transfer
        buffer = io.BytesIO()

        # Step 1: Extract from source using COPY TO
        with psycopg2.connect(self.source_conn_string) as source_conn:
            with source_conn.cursor() as cursor:
                if columns:
                    col_list = ", ".join(columns)
                    copy_to = f"COPY (SELECT {col_list} FROM {source_table}) TO STDOUT WITH (FORMAT csv, HEADER true)"
                else:
                    copy_to = f"COPY {source_table} TO STDOUT WITH (FORMAT csv, HEADER true)"

                cursor.copy_expert(copy_to, buffer)

        extract_time = time.time() - start_time
        buffer_size = buffer.tell()
        buffer.seek(0)  # Reset for reading

        # Step 2: Load to target using COPY FROM
        load_start = time.time()

        with psycopg2.connect(self.target_conn_string) as target_conn:
            with target_conn.cursor() as cursor:
                # Truncate target table
                cursor.execute(f"TRUNCATE TABLE {target_table}")

                # Load data
                copy_from = f"COPY {target_table} FROM STDIN WITH (FORMAT csv, HEADER true)"
                cursor.copy_expert(copy_from, buffer)

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {target_table}")
                row_count = cursor.fetchone()[0]

            target_conn.commit()

        load_time = time.time() - load_start
        total_time = time.time() - start_time

        return {
            "status": "success",
            "row_count": row_count,
            "buffer_size_mb": round(buffer_size / 1024 / 1024, 2),
            "extract_time_seconds": round(extract_time, 2),
            "load_time_seconds": round(load_time, 2),
            "total_time_seconds": round(total_time, 2),
            "rows_per_second": round(row_count / total_time, 2) if total_time > 0 else 0
        }

    def optimized_full_load(
        self,
        source_table: str,
        target_table: str,
        index_columns: List[str] = None
    ) -> Dict[str, Any]:
        """
        Perform optimized full load with index management.

        Dropping indexes before load and recreating after is
        significantly faster than inserting with indexes in place.

        Args:
            source_table: Source table to extract from
            target_table: Target table to load into
            index_columns: Columns that should have indexes
        """
        import time

        with psycopg2.connect(self.target_conn_string) as conn:
            with conn.cursor() as cursor:
                # Step 1: Get existing indexes
                cursor.execute("""
                    SELECT indexname, indexdef
                    FROM pg_indexes
                    WHERE tablename = %s
                    AND indexname NOT LIKE '%%_pkey'
                """, (target_table.split('.')[-1],))

                existing_indexes = cursor.fetchall()
                logger.info(f"Found {len(existing_indexes)} indexes to manage")

                # Step 2: Drop non-primary key indexes
                for index_name, _ in existing_indexes:
                    cursor.execute(f"DROP INDEX IF EXISTS {index_name}")
                    logger.info(f"Dropped index: {index_name}")

                conn.commit()

        # Step 3: Perform the data load
        load_result = self.extract_with_copy(source_table, target_table)

        # Step 4: Recreate indexes (can be parallelized in PostgreSQL)
        with psycopg2.connect(self.target_conn_string) as conn:
            with conn.cursor() as cursor:
                for index_name, index_def in existing_indexes:
                    start = time.time()
                    cursor.execute(index_def)
                    elapsed = time.time() - start
                    logger.info(f"Recreated index {index_name} in {elapsed:.2f}s")

                conn.commit()

        return load_result

    def unlogged_table_load(
        self,
        source_table: str,
        target_table: str
    ) -> Dict[str, Any]:
        """
        Use UNLOGGED table for faster initial load.

        UNLOGGED tables skip WAL (Write-Ahead Log) which makes
        writes much faster. After loading, convert to logged table.

        WARNING: Data in UNLOGGED tables is not crash-safe until
        the table is converted back to logged.

        Args:
            source_table: Source table
            target_table: Target table
        """
        import time

        staging_table = f"{target_table}_unlogged_staging"

        with psycopg2.connect(self.target_conn_string) as conn:
            with conn.cursor() as cursor:
                # Create unlogged staging table
                cursor.execute(f"""
                    DROP TABLE IF EXISTS {staging_table};
                    CREATE UNLOGGED TABLE {staging_table}
                    (LIKE {target_table} INCLUDING DEFAULTS);
                """)
                conn.commit()

        # Load into unlogged table (much faster)
        start = time.time()
        load_result = self.extract_with_copy(source_table, staging_table)

        with psycopg2.connect(self.target_conn_string) as conn:
            with conn.cursor() as cursor:
                # Convert to logged table
                cursor.execute(f"ALTER TABLE {staging_table} SET LOGGED")

                # Atomic swap
                backup_table = f"{target_table}_backup"
                cursor.execute(f"""
                    DROP TABLE IF EXISTS {backup_table};
                    ALTER TABLE {target_table} RENAME TO {backup_table.split('.')[-1]};
                    ALTER TABLE {staging_table} RENAME TO {target_table.split('.')[-1]};
                """)
                conn.commit()

        load_result["total_time_seconds"] = round(time.time() - start, 2)
        return load_result


class CompressionOptimizer:
    """
    Optimize data transfer with compression.

    Useful when network bandwidth is a bottleneck between
    source and target systems.
    """

    @staticmethod
    def extract_compressed(
        conn_string: str,
        table: str
    ) -> bytes:
        """
        Extract data with gzip compression.

        Returns compressed CSV data that can be transferred
        more efficiently over slow network links.
        """
        import gzip

        buffer = io.BytesIO()

        with psycopg2.connect(conn_string) as conn:
            with conn.cursor() as cursor:
                # Extract to buffer
                temp_buffer = io.BytesIO()
                cursor.copy_expert(
                    f"COPY {table} TO STDOUT WITH (FORMAT csv, HEADER true)",
                    temp_buffer
                )

                # Compress
                temp_buffer.seek(0)
                with gzip.GzipFile(fileobj=buffer, mode='wb') as gz:
                    gz.write(temp_buffer.read())

        compressed_data = buffer.getvalue()
        logger.info(
            f"Compressed {temp_buffer.tell()} bytes to {len(compressed_data)} bytes "
            f"({len(compressed_data) / temp_buffer.tell() * 100:.1f}%)"
        )

        return compressed_data

    @staticmethod
    def load_compressed(
        conn_string: str,
        table: str,
        compressed_data: bytes
    ) -> int:
        """
        Load compressed data into target table.

        Decompresses on the fly and loads using COPY.

        Returns:
            Number of rows loaded
        """
        import gzip

        # Decompress
        with gzip.GzipFile(fileobj=io.BytesIO(compressed_data), mode='rb') as gz:
            decompressed = io.BytesIO(gz.read())

        with psycopg2.connect(conn_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"TRUNCATE TABLE {table}")
                cursor.copy_expert(
                    f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER true)",
                    decompressed
                )
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                row_count = cursor.fetchone()[0]
            conn.commit()

        return row_count
```

---

## 10. Error Handling and Recovery

Build resilient extraction pipelines with proper error handling:

```python
# error_handling.py
# Error handling and recovery for extraction pipelines

import logging
import time
from dataclasses import dataclass, field
from typing import Optional, Callable, Any, List
from enum import Enum
import traceback

logger = logging.getLogger(__name__)


class ExtractionState(Enum):
    """States for extraction job tracking."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class ExtractionCheckpoint:
    """
    Checkpoint for recovery after failures.

    Stores state that allows resuming extraction from
    the point of failure rather than starting over.
    """
    job_id: str
    source_table: str
    target_table: str
    state: ExtractionState
    last_extracted_key: Optional[Any] = None
    rows_extracted: int = 0
    rows_loaded: int = 0
    attempt_number: int = 1
    last_error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


class RetryPolicy:
    """
    Configurable retry policy for extraction operations.

    Implements exponential backoff with jitter to prevent
    thundering herd problems when multiple jobs retry.
    """

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay_seconds: float = 1.0,
        max_delay_seconds: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay_seconds
        self.max_delay = max_delay_seconds
        self.exponential_base = exponential_base
        self.jitter = jitter

    def get_delay(self, attempt: int) -> float:
        """
        Calculate delay before next retry attempt.

        Uses exponential backoff: delay = initial * base^attempt
        Adds random jitter to prevent synchronized retries.
        """
        import random

        delay = self.initial_delay * (self.exponential_base ** attempt)
        delay = min(delay, self.max_delay)

        if self.jitter:
            # Add up to 25% random jitter
            delay = delay * (1 + random.uniform(-0.25, 0.25))

        return delay

    def should_retry(self, attempt: int, error: Exception) -> bool:
        """
        Determine if operation should be retried.

        Some errors are not retryable (e.g., invalid SQL).
        """
        if attempt >= self.max_retries:
            return False

        # List of non-retryable error types
        non_retryable = (
            ValueError,
            TypeError,
            SyntaxError,
        )

        if isinstance(error, non_retryable):
            return False

        return True


class ExtractionError(Exception):
    """Base exception for extraction errors."""
    pass


class SourceConnectionError(ExtractionError):
    """Failed to connect to source system."""
    pass


class TargetConnectionError(ExtractionError):
    """Failed to connect to target system."""
    pass


class DataValidationError(ExtractionError):
    """Data validation failed."""
    pass


class CheckpointManager:
    """
    Manages extraction checkpoints for recovery.

    Stores checkpoints in a database table for durability.
    Allows resuming failed extractions from last good state.
    """

    def __init__(self, conn_string: str):
        self.conn_string = conn_string
        self._ensure_checkpoint_table()

    def _ensure_checkpoint_table(self):
        """Create checkpoint table if it doesn't exist."""
        import psycopg2

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS extraction_checkpoints (
                        job_id VARCHAR(100) PRIMARY KEY,
                        source_table VARCHAR(200),
                        target_table VARCHAR(200),
                        state VARCHAR(50),
                        last_extracted_key TEXT,
                        rows_extracted BIGINT DEFAULT 0,
                        rows_loaded BIGINT DEFAULT 0,
                        attempt_number INT DEFAULT 1,
                        last_error TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            conn.commit()

    def save_checkpoint(self, checkpoint: ExtractionCheckpoint):
        """Save or update extraction checkpoint."""
        import psycopg2

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO extraction_checkpoints
                    (job_id, source_table, target_table, state,
                     last_extracted_key, rows_extracted, rows_loaded,
                     attempt_number, last_error, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (job_id) DO UPDATE SET
                        state = EXCLUDED.state,
                        last_extracted_key = EXCLUDED.last_extracted_key,
                        rows_extracted = EXCLUDED.rows_extracted,
                        rows_loaded = EXCLUDED.rows_loaded,
                        attempt_number = EXCLUDED.attempt_number,
                        last_error = EXCLUDED.last_error,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    checkpoint.job_id,
                    checkpoint.source_table,
                    checkpoint.target_table,
                    checkpoint.state.value,
                    str(checkpoint.last_extracted_key) if checkpoint.last_extracted_key else None,
                    checkpoint.rows_extracted,
                    checkpoint.rows_loaded,
                    checkpoint.attempt_number,
                    checkpoint.last_error
                ))
            conn.commit()

    def get_checkpoint(self, job_id: str) -> Optional[ExtractionCheckpoint]:
        """Retrieve checkpoint for a job."""
        import psycopg2

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT job_id, source_table, target_table, state,
                           last_extracted_key, rows_extracted, rows_loaded,
                           attempt_number, last_error
                    FROM extraction_checkpoints
                    WHERE job_id = %s
                """, (job_id,))

                row = cursor.fetchone()
                if not row:
                    return None

                return ExtractionCheckpoint(
                    job_id=row[0],
                    source_table=row[1],
                    target_table=row[2],
                    state=ExtractionState(row[3]),
                    last_extracted_key=row[4],
                    rows_extracted=row[5],
                    rows_loaded=row[6],
                    attempt_number=row[7],
                    last_error=row[8]
                )


def with_retry(
    retry_policy: RetryPolicy,
    checkpoint_manager: Optional[CheckpointManager] = None,
    checkpoint: Optional[ExtractionCheckpoint] = None
):
    """
    Decorator for adding retry logic to extraction functions.

    Automatically retries on failure with exponential backoff.
    Updates checkpoint state on each attempt if provided.

    Usage:
        @with_retry(RetryPolicy(max_retries=3))
        def my_extraction_function():
            ...
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(retry_policy.max_retries + 1):
                try:
                    # Update checkpoint state if available
                    if checkpoint and checkpoint_manager:
                        checkpoint.attempt_number = attempt + 1
                        checkpoint.state = ExtractionState.RUNNING
                        checkpoint_manager.save_checkpoint(checkpoint)

                    # Execute the function
                    result = func(*args, **kwargs)

                    # Success - update checkpoint
                    if checkpoint and checkpoint_manager:
                        checkpoint.state = ExtractionState.COMPLETED
                        checkpoint_manager.save_checkpoint(checkpoint)

                    return result

                except Exception as e:
                    last_exception = e
                    error_msg = f"{type(e).__name__}: {str(e)}"

                    logger.warning(
                        f"Attempt {attempt + 1} failed: {error_msg}"
                    )

                    # Update checkpoint with error
                    if checkpoint and checkpoint_manager:
                        checkpoint.state = ExtractionState.RETRYING
                        checkpoint.last_error = error_msg
                        checkpoint_manager.save_checkpoint(checkpoint)

                    # Check if we should retry
                    if not retry_policy.should_retry(attempt, e):
                        logger.error(f"Non-retryable error: {error_msg}")
                        break

                    if attempt < retry_policy.max_retries:
                        delay = retry_policy.get_delay(attempt)
                        logger.info(f"Retrying in {delay:.1f} seconds...")
                        time.sleep(delay)

            # All retries exhausted
            if checkpoint and checkpoint_manager:
                checkpoint.state = ExtractionState.FAILED
                checkpoint.last_error = str(last_exception)
                checkpoint_manager.save_checkpoint(checkpoint)

            raise ExtractionError(
                f"Extraction failed after {retry_policy.max_retries + 1} attempts: "
                f"{last_exception}"
            )

        return wrapper
    return decorator


# Example: Resilient extraction with checkpointing
def run_resilient_extraction(
    source_conn: str,
    target_conn: str,
    source_table: str,
    target_table: str,
    job_id: str
):
    """
    Run extraction with full error handling and recovery.

    Maintains checkpoints for recovery and implements retry logic
    for transient failures.
    """
    checkpoint_manager = CheckpointManager(target_conn)

    # Check for existing checkpoint (resume scenario)
    checkpoint = checkpoint_manager.get_checkpoint(job_id)

    if checkpoint and checkpoint.state == ExtractionState.COMPLETED:
        logger.info(f"Job {job_id} already completed, skipping")
        return checkpoint

    if not checkpoint:
        checkpoint = ExtractionCheckpoint(
            job_id=job_id,
            source_table=source_table,
            target_table=target_table,
            state=ExtractionState.PENDING
        )

    retry_policy = RetryPolicy(max_retries=3)

    @with_retry(retry_policy, checkpoint_manager, checkpoint)
    def do_extraction():
        # Import here to avoid circular dependency in example
        import psycopg2

        logger.info(f"Starting extraction: {source_table} -> {target_table}")

        # ... perform actual extraction ...
        # This would use the optimized extraction code from earlier

        checkpoint.rows_extracted = 10000  # Example
        checkpoint.rows_loaded = 10000

        return checkpoint

    return do_extraction()
```

---

## 11. Monitoring and Observability

Track extraction pipeline health and performance:

```python
# monitoring.py
# Monitoring and observability for extraction pipelines

import time
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class ExtractionMetric:
    """Individual metric measurement."""
    name: str
    value: float
    unit: str
    timestamp: float = field(default_factory=time.time)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class ExtractionSpan:
    """Tracing span for extraction operations."""
    name: str
    start_time: float
    end_time: Optional[float] = None
    parent_span_id: Optional[str] = None
    span_id: str = field(default_factory=lambda: str(time.time_ns()))
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def duration_ms(self) -> float:
        if self.end_time is None:
            return 0
        return (self.end_time - self.start_time) * 1000

    def add_event(self, name: str, attributes: Dict[str, Any] = None):
        self.events.append({
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {}
        })


class MetricsCollector:
    """
    Collects and exports extraction metrics.

    Integrates with common observability backends like
    Prometheus, DataDog, or OneUptime.
    """

    def __init__(self):
        self.metrics: List[ExtractionMetric] = []
        self.spans: List[ExtractionSpan] = []
        self._active_spans: Dict[str, ExtractionSpan] = {}

    def record_gauge(
        self,
        name: str,
        value: float,
        unit: str = "",
        tags: Dict[str, str] = None
    ):
        """Record a point-in-time gauge metric."""
        metric = ExtractionMetric(
            name=name,
            value=value,
            unit=unit,
            tags=tags or {}
        )
        self.metrics.append(metric)
        logger.debug(f"Metric: {name}={value}{unit} {tags}")

    def record_counter(
        self,
        name: str,
        value: float = 1,
        tags: Dict[str, str] = None
    ):
        """Record a counter increment."""
        self.record_gauge(name, value, "count", tags)

    def record_histogram(
        self,
        name: str,
        value: float,
        unit: str = "ms",
        tags: Dict[str, str] = None
    ):
        """Record a histogram observation."""
        self.record_gauge(name, value, unit, tags)

    @contextmanager
    def span(
        self,
        name: str,
        attributes: Dict[str, Any] = None
    ):
        """
        Context manager for creating tracing spans.

        Usage:
            with collector.span("extract_data") as span:
                span.attributes["row_count"] = 1000
                # ... do work ...
        """
        span = ExtractionSpan(
            name=name,
            start_time=time.time(),
            attributes=attributes or {}
        )

        self._active_spans[span.span_id] = span

        try:
            yield span
        except Exception as e:
            span.add_event("error", {"message": str(e)})
            raise
        finally:
            span.end_time = time.time()
            self.spans.append(span)
            del self._active_spans[span.span_id]

            # Record duration as metric
            self.record_histogram(
                f"extraction.{name}.duration",
                span.duration_ms,
                "ms",
                {"status": "error" if span.events else "success"}
            )

    def export_prometheus_format(self) -> str:
        """
        Export metrics in Prometheus text format.

        Returns:
            Prometheus-compatible metrics string
        """
        lines = []

        for metric in self.metrics:
            # Build label string
            labels = ",".join(
                f'{k}="{v}"' for k, v in metric.tags.items()
            )
            label_str = f"{{{labels}}}" if labels else ""

            # Prometheus format: metric_name{labels} value timestamp
            lines.append(
                f"extraction_{metric.name.replace('.', '_')}{label_str} "
                f"{metric.value} {int(metric.timestamp * 1000)}"
            )

        return "\n".join(lines)

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics of collected metrics."""
        if not self.metrics:
            return {}

        # Group metrics by name
        by_name: Dict[str, List[float]] = {}
        for m in self.metrics:
            if m.name not in by_name:
                by_name[m.name] = []
            by_name[m.name].append(m.value)

        summary = {}
        for name, values in by_name.items():
            summary[name] = {
                "count": len(values),
                "sum": sum(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values)
            }

        return summary


class ExtractionMonitor:
    """
    High-level monitoring for extraction pipelines.

    Tracks job execution, emits alerts on failures,
    and provides dashboard-ready metrics.
    """

    def __init__(self, collector: MetricsCollector = None):
        self.collector = collector or MetricsCollector()
        self.job_start_times: Dict[str, float] = {}

    def job_started(
        self,
        job_id: str,
        source_table: str,
        target_table: str
    ):
        """Record job start."""
        self.job_start_times[job_id] = time.time()

        self.collector.record_counter(
            "jobs.started",
            tags={
                "source_table": source_table,
                "target_table": target_table
            }
        )

        logger.info(
            f"Job {job_id} started: {source_table} -> {target_table}"
        )

    def job_completed(
        self,
        job_id: str,
        source_table: str,
        target_table: str,
        rows_extracted: int,
        rows_loaded: int
    ):
        """Record successful job completion."""
        start_time = self.job_start_times.pop(job_id, time.time())
        duration_seconds = time.time() - start_time

        tags = {
            "source_table": source_table,
            "target_table": target_table,
            "status": "success"
        }

        self.collector.record_counter("jobs.completed", tags=tags)
        self.collector.record_gauge(
            "jobs.rows_extracted",
            rows_extracted,
            "rows",
            tags
        )
        self.collector.record_gauge(
            "jobs.rows_loaded",
            rows_loaded,
            "rows",
            tags
        )
        self.collector.record_histogram(
            "jobs.duration",
            duration_seconds * 1000,
            "ms",
            tags
        )

        # Calculate throughput
        if duration_seconds > 0:
            throughput = rows_extracted / duration_seconds
            self.collector.record_gauge(
                "jobs.throughput",
                throughput,
                "rows/s",
                tags
            )

        logger.info(
            f"Job {job_id} completed: {rows_extracted} rows in "
            f"{duration_seconds:.2f}s ({rows_extracted/duration_seconds:.0f} rows/s)"
        )

    def job_failed(
        self,
        job_id: str,
        source_table: str,
        target_table: str,
        error: str
    ):
        """Record job failure."""
        start_time = self.job_start_times.pop(job_id, time.time())
        duration_seconds = time.time() - start_time

        tags = {
            "source_table": source_table,
            "target_table": target_table,
            "status": "failed"
        }

        self.collector.record_counter("jobs.failed", tags=tags)
        self.collector.record_histogram(
            "jobs.duration",
            duration_seconds * 1000,
            "ms",
            tags
        )

        logger.error(
            f"Job {job_id} failed after {duration_seconds:.2f}s: {error}"
        )

    def record_validation_result(
        self,
        job_id: str,
        check_name: str,
        passed: bool,
        details: Dict[str, Any] = None
    ):
        """Record data validation results."""
        self.collector.record_counter(
            f"validation.{check_name}",
            tags={
                "job_id": job_id,
                "passed": str(passed).lower()
            }
        )

        if details:
            for key, value in details.items():
                if isinstance(value, (int, float)):
                    self.collector.record_gauge(
                        f"validation.{check_name}.{key}",
                        value,
                        tags={"job_id": job_id}
                    )


# Example: Monitored extraction pipeline
def run_monitored_extraction(
    source_conn: str,
    target_conn: str,
    source_table: str,
    target_table: str
):
    """
    Example of running extraction with full monitoring.
    """
    import uuid

    job_id = str(uuid.uuid4())[:8]
    monitor = ExtractionMonitor()

    monitor.job_started(job_id, source_table, target_table)

    try:
        with monitor.collector.span("full_extraction") as span:
            span.attributes["source_table"] = source_table
            span.attributes["target_table"] = target_table

            # Extract phase
            with monitor.collector.span("extract") as extract_span:
                # ... extraction logic ...
                rows_extracted = 50000  # Example
                extract_span.attributes["rows"] = rows_extracted

            # Transform phase
            with monitor.collector.span("transform"):
                # ... transformation logic ...
                pass

            # Load phase
            with monitor.collector.span("load") as load_span:
                # ... load logic ...
                rows_loaded = 50000
                load_span.attributes["rows"] = rows_loaded

            # Validate phase
            with monitor.collector.span("validate"):
                monitor.record_validation_result(
                    job_id,
                    "row_count",
                    passed=True,
                    details={"source": rows_extracted, "target": rows_loaded}
                )

            span.attributes["rows_extracted"] = rows_extracted
            span.attributes["rows_loaded"] = rows_loaded

        monitor.job_completed(
            job_id,
            source_table,
            target_table,
            rows_extracted,
            rows_loaded
        )

        # Print metrics summary
        print("\nMetrics Summary:")
        print(monitor.collector.get_summary())

    except Exception as e:
        monitor.job_failed(job_id, source_table, target_table, str(e))
        raise
```

---

## 12. Production Ready Example

Complete production implementation bringing all concepts together:

```python
# production_extraction.py
# Production-ready full extraction pipeline

import os
import sys
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Any, Optional
import psycopg2
from psycopg2 import sql
import io

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("extraction")


@dataclass
class PipelineConfig:
    """
    Complete configuration for production extraction pipeline.

    Load from environment variables for security.
    """
    # Source configuration
    source_host: str
    source_port: int
    source_database: str
    source_user: str
    source_password: str
    source_schema: str
    source_table: str

    # Target configuration
    target_host: str
    target_port: int
    target_database: str
    target_user: str
    target_password: str
    target_schema: str
    target_table: str

    # Extraction settings
    batch_size: int = 50000
    use_compression: bool = True
    parallel_workers: int = 4
    max_retries: int = 3

    # Validation settings
    validate_row_count: bool = True
    row_count_tolerance_percent: float = 0.0
    validate_checksum: bool = False
    checksum_columns: Optional[list] = None

    @classmethod
    def from_environment(cls) -> "PipelineConfig":
        """Load configuration from environment variables."""
        return cls(
            source_host=os.environ["SOURCE_DB_HOST"],
            source_port=int(os.environ.get("SOURCE_DB_PORT", 5432)),
            source_database=os.environ["SOURCE_DB_NAME"],
            source_user=os.environ["SOURCE_DB_USER"],
            source_password=os.environ["SOURCE_DB_PASSWORD"],
            source_schema=os.environ.get("SOURCE_SCHEMA", "public"),
            source_table=os.environ["SOURCE_TABLE"],
            target_host=os.environ["TARGET_DB_HOST"],
            target_port=int(os.environ.get("TARGET_DB_PORT", 5432)),
            target_database=os.environ["TARGET_DB_NAME"],
            target_user=os.environ["TARGET_DB_USER"],
            target_password=os.environ["TARGET_DB_PASSWORD"],
            target_schema=os.environ.get("TARGET_SCHEMA", "raw"),
            target_table=os.environ["TARGET_TABLE"],
            batch_size=int(os.environ.get("BATCH_SIZE", 50000)),
            use_compression=os.environ.get("USE_COMPRESSION", "true").lower() == "true",
            parallel_workers=int(os.environ.get("PARALLEL_WORKERS", 4)),
            max_retries=int(os.environ.get("MAX_RETRIES", 3)),
            validate_row_count=os.environ.get("VALIDATE_ROW_COUNT", "true").lower() == "true",
            row_count_tolerance_percent=float(os.environ.get("ROW_COUNT_TOLERANCE", 0.0)),
        )

    @property
    def source_connection_string(self) -> str:
        return (
            f"postgresql://{self.source_user}:{self.source_password}"
            f"@{self.source_host}:{self.source_port}/{self.source_database}"
        )

    @property
    def target_connection_string(self) -> str:
        return (
            f"postgresql://{self.target_user}:{self.target_password}"
            f"@{self.target_host}:{self.target_port}/{self.target_database}"
        )

    @property
    def full_source_table(self) -> str:
        return f"{self.source_schema}.{self.source_table}"

    @property
    def full_target_table(self) -> str:
        return f"{self.target_schema}.{self.target_table}"


class ProductionExtractor:
    """
    Production-ready full extraction pipeline.

    Features:
    - Atomic table swap for zero-downtime updates
    - Comprehensive error handling with retries
    - Data validation before final commit
    - Detailed logging and metrics
    - Checkpoint support for recovery
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.job_id = str(uuid.uuid4())[:8]
        self.metrics: Dict[str, Any] = {}

    def run(self) -> Dict[str, Any]:
        """
        Execute the full extraction pipeline.

        Returns:
            Dictionary with execution results and metrics
        """
        start_time = time.time()

        logger.info(f"Starting extraction job {self.job_id}")
        logger.info(f"Source: {self.config.full_source_table}")
        logger.info(f"Target: {self.config.full_target_table}")

        try:
            # Phase 1: Pre-extraction validation
            self._validate_connections()

            # Phase 2: Create staging table
            staging_table = self._create_staging_table()

            # Phase 3: Extract and load data
            rows_loaded = self._extract_and_load(staging_table)

            # Phase 4: Validate data
            self._validate_data(staging_table, rows_loaded)

            # Phase 5: Atomic swap
            self._atomic_swap(staging_table)

            # Phase 6: Cleanup
            self._cleanup()

            elapsed = time.time() - start_time

            result = {
                "status": "success",
                "job_id": self.job_id,
                "source_table": self.config.full_source_table,
                "target_table": self.config.full_target_table,
                "rows_loaded": rows_loaded,
                "elapsed_seconds": round(elapsed, 2),
                "rows_per_second": round(rows_loaded / elapsed, 2) if elapsed > 0 else 0,
                "metrics": self.metrics
            }

            logger.info(f"Extraction completed: {result}")
            return result

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Extraction failed after {elapsed:.2f}s: {e}")

            # Attempt cleanup on failure
            try:
                self._cleanup_on_failure()
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {cleanup_error}")

            return {
                "status": "failed",
                "job_id": self.job_id,
                "error": str(e),
                "elapsed_seconds": round(elapsed, 2)
            }

    def _validate_connections(self):
        """Validate source and target database connections."""
        logger.info("Validating database connections...")

        # Test source connection
        try:
            with psycopg2.connect(self.config.source_connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
            logger.info("Source connection: OK")
        except Exception as e:
            raise Exception(f"Source connection failed: {e}")

        # Test target connection
        try:
            with psycopg2.connect(self.config.target_connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
            logger.info("Target connection: OK")
        except Exception as e:
            raise Exception(f"Target connection failed: {e}")

    def _create_staging_table(self) -> str:
        """
        Create staging table for data loading.

        Returns:
            Name of the staging table
        """
        staging_table = f"{self.config.full_target_table}_staging_{self.job_id}"

        logger.info(f"Creating staging table: {staging_table}")

        with psycopg2.connect(self.config.target_connection_string) as conn:
            with conn.cursor() as cursor:
                # Drop if exists (from previous failed run)
                cursor.execute(f"DROP TABLE IF EXISTS {staging_table}")

                # Create staging table with same structure
                cursor.execute(f"""
                    CREATE TABLE {staging_table}
                    (LIKE {self.config.full_target_table} INCLUDING ALL)
                """)

            conn.commit()

        return staging_table

    def _extract_and_load(self, staging_table: str) -> int:
        """
        Extract data from source and load to staging.

        Uses COPY for maximum throughput.

        Returns:
            Number of rows loaded
        """
        logger.info("Starting data extraction and load...")

        extract_start = time.time()

        # Buffer for data transfer
        buffer = io.BytesIO()

        # Extract from source
        with psycopg2.connect(self.config.source_connection_string) as source_conn:
            with source_conn.cursor() as cursor:
                copy_sql = f"COPY {self.config.full_source_table} TO STDOUT WITH (FORMAT csv, HEADER true)"
                cursor.copy_expert(copy_sql, buffer)

        extract_time = time.time() - extract_start
        buffer_size = buffer.tell()
        buffer.seek(0)

        logger.info(f"Extracted {buffer_size / 1024 / 1024:.2f} MB in {extract_time:.2f}s")
        self.metrics["extract_time_seconds"] = round(extract_time, 2)
        self.metrics["data_size_mb"] = round(buffer_size / 1024 / 1024, 2)

        # Load to target
        load_start = time.time()

        with psycopg2.connect(self.config.target_connection_string) as target_conn:
            with target_conn.cursor() as cursor:
                copy_sql = f"COPY {staging_table} FROM STDIN WITH (FORMAT csv, HEADER true)"
                cursor.copy_expert(copy_sql, buffer)

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {staging_table}")
                rows_loaded = cursor.fetchone()[0]

            target_conn.commit()

        load_time = time.time() - load_start

        logger.info(f"Loaded {rows_loaded:,} rows in {load_time:.2f}s")
        self.metrics["load_time_seconds"] = round(load_time, 2)
        self.metrics["rows_loaded"] = rows_loaded

        return rows_loaded

    def _validate_data(self, staging_table: str, rows_loaded: int):
        """
        Validate loaded data before final swap.

        Raises exception if validation fails.
        """
        logger.info("Validating loaded data...")

        if self.config.validate_row_count:
            # Get source count
            with psycopg2.connect(self.config.source_connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(f"SELECT COUNT(*) FROM {self.config.full_source_table}")
                    source_count = cursor.fetchone()[0]

            # Calculate variance
            if source_count == 0:
                variance = 0 if rows_loaded == 0 else 100
            else:
                variance = abs(source_count - rows_loaded) / source_count * 100

            logger.info(
                f"Row count validation: source={source_count:,}, "
                f"target={rows_loaded:,}, variance={variance:.2f}%"
            )

            if variance > self.config.row_count_tolerance_percent:
                raise Exception(
                    f"Row count validation failed: {variance:.2f}% variance "
                    f"exceeds tolerance of {self.config.row_count_tolerance_percent}%"
                )

            self.metrics["source_row_count"] = source_count
            self.metrics["row_count_variance_percent"] = round(variance, 2)

        logger.info("Data validation passed")

    def _atomic_swap(self, staging_table: str):
        """
        Atomically swap staging table with production.

        This ensures zero downtime during the swap operation.
        """
        logger.info("Performing atomic table swap...")

        backup_table = f"{self.config.full_target_table}_backup_{self.job_id}"
        target_table_name = self.config.target_table
        staging_table_name = staging_table.split(".")[-1]

        with psycopg2.connect(self.config.target_connection_string) as conn:
            with conn.cursor() as cursor:
                # Use a transaction for atomicity
                cursor.execute("BEGIN")

                try:
                    # Rename current table to backup
                    cursor.execute(
                        f"ALTER TABLE {self.config.full_target_table} "
                        f"RENAME TO {backup_table.split('.')[-1]}"
                    )

                    # Rename staging to production
                    cursor.execute(
                        f"ALTER TABLE {staging_table} "
                        f"RENAME TO {target_table_name}"
                    )

                    cursor.execute("COMMIT")

                except Exception as e:
                    cursor.execute("ROLLBACK")
                    raise Exception(f"Atomic swap failed: {e}")

        logger.info("Table swap completed successfully")
        self.metrics["backup_table"] = backup_table

    def _cleanup(self):
        """Clean up temporary resources after successful extraction."""
        logger.info("Cleaning up temporary resources...")

        # Keep backup table for now (can be cleaned up by separate job)
        # Drop any leftover staging tables from this job

        logger.info("Cleanup completed")

    def _cleanup_on_failure(self):
        """Clean up after failed extraction."""
        logger.info("Cleaning up after failure...")

        staging_table = f"{self.config.full_target_table}_staging_{self.job_id}"

        with psycopg2.connect(self.config.target_connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"DROP TABLE IF EXISTS {staging_table}")
            conn.commit()

        logger.info("Failure cleanup completed")


def main():
    """
    Main entry point for production extraction.

    Usage:
        export SOURCE_DB_HOST=source.example.com
        export SOURCE_DB_NAME=production
        export SOURCE_DB_USER=etl_reader
        export SOURCE_DB_PASSWORD=secret
        export SOURCE_TABLE=customers
        export TARGET_DB_HOST=warehouse.example.com
        export TARGET_DB_NAME=analytics
        export TARGET_DB_USER=etl_writer
        export TARGET_DB_PASSWORD=secret
        export TARGET_TABLE=customers

        python production_extraction.py
    """
    try:
        config = PipelineConfig.from_environment()
    except KeyError as e:
        logger.error(f"Missing required environment variable: {e}")
        sys.exit(1)

    extractor = ProductionExtractor(config)
    result = extractor.run()

    if result["status"] == "success":
        logger.info("Extraction pipeline completed successfully")
        sys.exit(0)
    else:
        logger.error(f"Extraction pipeline failed: {result.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

---

## 13. Common Pitfalls and Solutions

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Memory exhaustion | Loading entire dataset into memory | Use streaming extraction with server-side cursors |
| Long running transactions | Blocking source database | Use read replicas or snapshot isolation |
| Target table locks | Blocking queries during load | Use staging table with atomic swap |
| Missing deletes | Deleted source rows remain in target | Full extraction naturally handles this |
| Data drift | Source changes during extraction | Use snapshot isolation or point-in-time queries |
| Network timeouts | Large transfers fail mid-stream | Implement chunked extraction with checkpoints |
| Index rebuild time | Slow load due to index maintenance | Drop indexes before load, recreate after |
| Validation failures | Data mismatch discovered after swap | Validate before swap, keep backup table |

### Handling Source Changes During Extraction

```python
# snapshot_extraction.py
# Extract consistent snapshot even if source is being modified

def extract_with_snapshot(
    conn_string: str,
    table: str,
    snapshot_timestamp: str = None
) -> list:
    """
    Extract data using a consistent snapshot.

    PostgreSQL's MVCC ensures we see a consistent view
    of the data even if other transactions are modifying it.

    Args:
        conn_string: Database connection string
        table: Table to extract
        snapshot_timestamp: Optional timestamp for point-in-time query
    """
    import psycopg2

    with psycopg2.connect(conn_string) as conn:
        # Set transaction to serializable for strongest consistency
        conn.set_isolation_level(
            psycopg2.extensions.ISOLATION_LEVEL_REPEATABLE_READ
        )

        with conn.cursor() as cursor:
            if snapshot_timestamp:
                # Query as of a specific timestamp (requires pg_stat_statements)
                # Note: This requires PostgreSQL time travel extension or similar
                cursor.execute(f"""
                    SELECT * FROM {table}
                    -- Add timestamp filter if your schema supports it
                """)
            else:
                # Standard snapshot read
                cursor.execute(f"SELECT * FROM {table}")

            rows = cursor.fetchall()

    return rows
```

---

## 14. Summary

Full extraction is a fundamental pattern in data engineering that provides simplicity and reliability:

```mermaid
flowchart TB
    subgraph Strengths["Full Extraction Strengths"]
        S1[Simple Implementation]
        S2[Guaranteed Consistency]
        S3[Handles Deletes Naturally]
        S4[Easy Recovery]
        S5[No State Management]
    end

    subgraph BestFor["Best Used For"]
        B1[Small/Medium Datasets]
        B2[Reference Data]
        B3[High Change Rate Tables]
        B4[Sources Without CDC]
        B5[Compliance Requirements]
    end

    subgraph KeyTechniques["Key Techniques"]
        K1[Streaming with Batches]
        K2[COPY for Bulk Transfer]
        K3[Atomic Table Swap]
        K4[Parallel Extraction]
        K5[Data Validation]
    end

    Strengths --> BestFor
    BestFor --> KeyTechniques
```

### Key Takeaways

1. **Start with full extraction** when building new pipelines. Add incremental optimization only when needed.

2. **Use streaming and batching** to handle datasets larger than available memory.

3. **Implement atomic swap** with staging tables for zero-downtime updates.

4. **Validate before committing** to catch issues early and maintain data quality.

5. **Monitor throughput** to identify bottlenecks and optimization opportunities.

6. **Keep backups** of previous data for quick rollback if issues are discovered.

7. **Consider parallel extraction** for large tables where single-threaded extraction is too slow.

8. **Use COPY commands** for bulk operations rather than row-by-row inserts.

Full extraction may not be the most efficient approach for every scenario, but its simplicity and reliability make it an excellent choice for many data pipeline use cases. Master this pattern first, then optimize with incremental extraction where the performance gains justify the added complexity.

---

*Building data pipelines? [OneUptime](https://oneuptime.com) helps you monitor your extraction jobs, track data quality metrics, and get alerted when pipelines fail.*
