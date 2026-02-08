# How to Run DuckDB in Docker for Analytics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DuckDB, Analytics, Databases, OLAP, Data Engineering

Description: How to use DuckDB inside Docker containers for analytical queries on CSV, Parquet, and JSON data files

---

DuckDB is an in-process analytical database that runs inside your application, similar to how SQLite works for transactional workloads. It processes columnar data extremely fast and can query CSV, Parquet, and JSON files directly without importing them first. Running DuckDB in Docker creates portable, reproducible analytics environments that work the same on every machine.

## Why DuckDB in Docker?

DuckDB does not follow the traditional client-server model. There is no daemon to manage or port to expose. It runs as a library inside your process. So why put it in Docker?

The answer is reproducibility. When you build an analytics pipeline that reads Parquet files, transforms data, and exports results, packaging it in Docker ensures that the same DuckDB version, the same Python libraries, and the same scripts run identically in CI/CD, on your laptop, and in production. Docker also makes it easy to mount different data directories and swap datasets without changing code.

## Building a DuckDB Docker Image

Since DuckDB is an embedded database, you build it into your application image. Here is a Python-based analytics image.

```dockerfile
# Dockerfile
FROM python:3.12-slim

# Install DuckDB and useful analytics libraries
RUN pip install --no-cache-dir \
    duckdb==1.1.0 \
    pandas \
    pyarrow \
    httpx

# Create working directories
RUN mkdir -p /app /data /output

WORKDIR /app

# Copy analysis scripts
COPY scripts/ /app/scripts/

# Default command runs the main analysis
CMD ["python", "scripts/analyze.py"]
```

Build the image.

```bash
# Build the analytics container
docker build -t duckdb-analytics .
```

## Running Ad-Hoc Queries

Use the DuckDB CLI inside a container for interactive exploration.

```bash
# Run DuckDB CLI interactively with data mounted
docker run -it --rm \
  -v $(pwd)/data:/data \
  -v $(pwd)/output:/output \
  python:3.12-slim \
  bash -c "pip install duckdb && python -c \"import duckdb; duckdb.cli()\""
```

A simpler approach uses the official DuckDB binary directly.

```dockerfile
# Dockerfile.cli - A minimal DuckDB CLI container
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y wget unzip && \
    wget https://github.com/duckdb/duckdb/releases/download/v1.1.0/duckdb_cli-linux-amd64.zip && \
    unzip duckdb_cli-linux-amd64.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/duckdb && \
    rm duckdb_cli-linux-amd64.zip && \
    apt-get remove -y wget unzip && apt-get autoremove -y

WORKDIR /data

ENTRYPOINT ["duckdb"]
```

```bash
# Build and run the CLI container
docker build -f Dockerfile.cli -t duckdb-cli .
docker run -it --rm -v $(pwd)/data:/data duckdb-cli
```

## Querying CSV Files Directly

DuckDB reads CSV files without needing to import them into a database first.

```sql
-- Query a CSV file directly (no CREATE TABLE needed)
SELECT
    product_category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value
FROM read_csv_auto('/data/orders.csv')
GROUP BY product_category
ORDER BY total_revenue DESC;
```

For multiple CSV files with the same schema, use glob patterns.

```sql
-- Query all CSV files in a directory
SELECT * FROM read_csv_auto('/data/logs/*.csv')
WHERE severity = 'ERROR'
ORDER BY timestamp DESC
LIMIT 100;
```

## Working with Parquet Files

Parquet is DuckDB's sweet spot. Columnar storage combined with columnar processing yields excellent performance.

```sql
-- Read a Parquet file
SELECT
    date_trunc('month', event_date) AS month,
    event_type,
    COUNT(*) AS events
FROM read_parquet('/data/events.parquet')
WHERE event_date >= '2025-01-01'
GROUP BY month, event_type
ORDER BY month, events DESC;

-- Write query results to a new Parquet file
COPY (
    SELECT user_id, SUM(amount) AS total_spend
    FROM read_parquet('/data/transactions.parquet')
    GROUP BY user_id
    HAVING total_spend > 1000
) TO '/output/high_value_users.parquet' (FORMAT PARQUET);
```

## Python Analytics Script

Create a complete analytics pipeline in Python.

```python
# scripts/analyze.py
import duckdb
import os

def main():
    # Create a persistent database (or use :memory: for ephemeral)
    db = duckdb.connect('/output/analytics.duckdb')

    # Load and transform data from mounted CSV files
    db.execute("""
        CREATE TABLE IF NOT EXISTS sales AS
        SELECT
            *,
            amount * quantity AS total_value,
            strftime(sale_date, '%Y-%m') AS sale_month
        FROM read_csv_auto('/data/sales.csv')
    """)

    # Run aggregation queries
    result = db.execute("""
        SELECT
            sale_month,
            COUNT(*) AS transactions,
            SUM(total_value) AS revenue,
            AVG(total_value) AS avg_transaction
        FROM sales
        GROUP BY sale_month
        ORDER BY sale_month
    """).fetchdf()

    print("Monthly Revenue Report")
    print("=" * 60)
    print(result.to_string(index=False))

    # Export results to Parquet for downstream consumption
    db.execute("""
        COPY (
            SELECT * FROM sales
            WHERE total_value > 500
        ) TO '/output/high_value_sales.parquet' (FORMAT PARQUET)
    """)

    print("\nExported high-value sales to /output/high_value_sales.parquet")
    db.close()

if __name__ == "__main__":
    main()
```

Run the pipeline.

```bash
# Execute the analysis with data and output directories mounted
docker run --rm \
  -v $(pwd)/data:/data \
  -v $(pwd)/output:/output \
  duckdb-analytics
```

## Docker Compose for Multi-Step Pipelines

Chain multiple DuckDB steps together in a pipeline.

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Step 1: Clean and transform raw data
  transform:
    build: .
    command: python scripts/transform.py
    volumes:
      - ./data/raw:/data/input:ro
      - pipeline_data:/data/output

  # Step 2: Run analytics on transformed data
  analyze:
    build: .
    command: python scripts/analyze.py
    volumes:
      - pipeline_data:/data/input:ro
      - ./output:/output
    depends_on:
      transform:
        condition: service_completed_successfully

volumes:
  pipeline_data:
```

```bash
# Run the full pipeline
docker compose up --build
```

## Querying Remote Data

DuckDB can query data from HTTP endpoints and S3-compatible storage.

```sql
-- Query a Parquet file from a URL
SELECT COUNT(*), AVG(value)
FROM read_parquet('https://example.com/data/metrics.parquet');

-- Query from S3 (set credentials first)
SET s3_access_key_id = 'your-key';
SET s3_secret_access_key = 'your-secret';
SET s3_region = 'us-east-1';

SELECT * FROM read_parquet('s3://my-bucket/data/events/*.parquet')
WHERE event_date = CURRENT_DATE;
```

## Performance Tips

DuckDB is already fast out of the box, but these settings help with larger datasets.

```sql
-- Set memory limit (useful inside containers with constrained resources)
SET memory_limit = '2GB';

-- Set the number of threads DuckDB uses
SET threads = 4;

-- Enable progress bar for long-running queries
SET enable_progress_bar = true;

-- Check current settings
SELECT * FROM duckdb_settings() WHERE name IN ('memory_limit', 'threads');
```

When running in Docker, align these settings with your container resource limits.

```yaml
# Docker Compose resource constraints
deploy:
  resources:
    limits:
      memory: 4G
      cpus: "4.0"
```

## Comparing DuckDB to Other Analytical Tools

DuckDB fills the gap between pandas (limited by memory, slow on large datasets) and full data warehouses like BigQuery or Snowflake (powerful but require infrastructure). If your data fits on a single machine and you want SQL-based analytics without server management, DuckDB is the right tool.

It reads standard file formats natively, which means you can point it at your data lake (even on S3) and start querying immediately. No ETL pipeline needed for exploratory analysis.

## Summary

DuckDB in Docker creates reproducible analytics environments. Build it into a Python image, mount your data directories, and run SQL queries against CSV, Parquet, and JSON files without any import step. For pipelines, use Docker Compose to chain transformation and analysis stages. The embedded architecture means there is no server to configure, no ports to expose, and no connection strings to manage. You just run your container and get results.
