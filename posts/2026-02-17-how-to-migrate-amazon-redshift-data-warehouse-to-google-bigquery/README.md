# How to Migrate Amazon Redshift Data Warehouse to Google BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Amazon Redshift, Data Warehouse, Migration

Description: Migrate your Amazon Redshift data warehouse to Google BigQuery using the BigQuery Data Transfer Service and SQL translation tools.

---

Migrating a data warehouse is one of the most complex cloud migration tasks. It is not just about moving data - it is about migrating SQL queries, ETL pipelines, dashboards, scheduled jobs, and user access patterns. Redshift and BigQuery are both columnar data warehouses, but they have different SQL dialects, different pricing models, and different optimization strategies.

In this post, I will walk through the end-to-end migration from Redshift to BigQuery, covering data transfer, SQL translation, and the validation steps that make sure nothing gets lost.

## Planning the Migration

Before touching any data, map out what needs to move:

- **Tables and schemas** - The data itself
- **Views** - SQL logic that derives new tables
- **Stored procedures** - Business logic in the database
- **Scheduled queries** - ETL and reporting jobs
- **User permissions** - Who can access what
- **BI tool connections** - Dashboards and reports

BigQuery handles some of these differently than Redshift:

| Redshift | BigQuery |
|----------|----------|
| Schema | Dataset |
| Table | Table |
| View | View |
| Stored Procedure | Scripting / Routines |
| WLM Queues | Reservations / Slots |
| Distribution Key | Clustering |
| Sort Key | Partitioning + Clustering |
| Spectrum | External Tables |
| COPY command | Load job / bq load |

## Step 1: Export Data from Redshift

The fastest way to get data out of Redshift is to UNLOAD to S3:

```sql
-- Export each table to S3 in Parquet format
-- Parquet preserves data types and compresses well
UNLOAD ('SELECT * FROM schema_name.users')
TO 's3://my-redshift-export/users/'
IAM_ROLE 'arn:aws:iam::123456789:role/redshift-export-role'
FORMAT AS PARQUET
MAXFILESIZE 1 GB
ALLOWOVERWRITE;

UNLOAD ('SELECT * FROM schema_name.orders')
TO 's3://my-redshift-export/orders/'
IAM_ROLE 'arn:aws:iam::123456789:role/redshift-export-role'
FORMAT AS PARQUET
MAXFILESIZE 1 GB
ALLOWOVERWRITE;

UNLOAD ('SELECT * FROM schema_name.products')
TO 's3://my-redshift-export/products/'
IAM_ROLE 'arn:aws:iam::123456789:role/redshift-export-role'
FORMAT AS PARQUET
MAXFILESIZE 1 GB
ALLOWOVERWRITE;
```

Automate the export for all tables:

```python
# export_redshift.py
# Export all Redshift tables to S3 in Parquet format
import psycopg2
import json

def get_all_tables(conn, schema='public'):
    """Get all user tables in the schema."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = %s
        AND tablename NOT LIKE 'pg_%%'
        AND tablename NOT LIKE 'stl_%%'
        ORDER BY tablename
    """, (schema,))
    return cursor.fetchall()


def generate_unload_commands(conn, schema, s3_bucket, iam_role):
    """Generate UNLOAD commands for all tables."""
    tables = get_all_tables(conn, schema)
    commands = []

    for schema_name, table_name in tables:
        cmd = f"""
        UNLOAD ('SELECT * FROM {schema_name}.{table_name}')
        TO 's3://{s3_bucket}/{table_name}/'
        IAM_ROLE '{iam_role}'
        FORMAT AS PARQUET
        MAXFILESIZE 1073741824
        ALLOWOVERWRITE;
        """
        commands.append({
            'table': table_name,
            'command': cmd.strip(),
        })

    return commands


def run_exports(conn, commands):
    """Execute all UNLOAD commands."""
    cursor = conn.cursor()

    for cmd_info in commands:
        table = cmd_info['table']
        print(f"Exporting: {table}")
        try:
            cursor.execute(cmd_info['command'])
            conn.commit()
            print(f"  Done: {table}")
        except Exception as e:
            print(f"  Failed: {table} - {e}")
            conn.rollback()


if __name__ == '__main__':
    conn = psycopg2.connect(
        host='my-cluster.abc123.us-east-1.redshift.amazonaws.com',
        port=5439,
        dbname='warehouse',
        user='admin',
        password='password'
    )

    commands = generate_unload_commands(
        conn, 'public',
        'my-redshift-export',
        'arn:aws:iam::123456789:role/redshift-export-role'
    )

    run_exports(conn, commands)
    conn.close()
```

## Step 2: Transfer Data to GCS

Move the exported data from S3 to GCS:

```bash
# Use Storage Transfer Service for large datasets
gcloud transfer jobs create \
  s3://my-redshift-export/ \
  gs://my-project-redshift-import/ \
  --source-creds-file=aws-creds.json \
  --name="redshift-data-transfer" \
  --project=my-gcp-project
```

## Step 3: Create BigQuery Datasets and Load Data

Set up the BigQuery datasets and load the Parquet files:

```hcl
# bigquery.tf
# BigQuery datasets for migrated Redshift data

resource "google_bigquery_dataset" "warehouse" {
  dataset_id    = "warehouse"
  friendly_name = "Data Warehouse (migrated from Redshift)"
  project       = var.project_id
  location      = var.region

  # Match Redshift retention policies
  default_table_expiration_ms = null  # No expiration

  # Access controls
  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    group_by_email = var.analysts_group
  }
}
```

Load data using bq:

```bash
# Load Parquet files from GCS into BigQuery
# Parquet schema is auto-detected
bq load \
  --source_format=PARQUET \
  --autodetect \
  warehouse.users \
  'gs://my-project-redshift-import/users/*.parquet'

bq load \
  --source_format=PARQUET \
  --autodetect \
  warehouse.orders \
  'gs://my-project-redshift-import/orders/*.parquet'

bq load \
  --source_format=PARQUET \
  --autodetect \
  warehouse.products \
  'gs://my-project-redshift-import/products/*.parquet'
```

Or automate for all tables:

```python
# load_to_bigquery.py
# Load all migrated tables into BigQuery
from google.cloud import bigquery
from google.cloud import storage
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def discover_tables(bucket_name, prefix=''):
    """Find all table directories in the GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List all prefixes (table directories)
    tables = set()
    for blob in bucket.list_blobs(prefix=prefix):
        parts = blob.name.split('/')
        if len(parts) > 1 and parts[0]:
            tables.add(parts[0])

    return sorted(tables)


def load_table(project_id, dataset_id, table_name, gcs_uri):
    """Load a single table from GCS Parquet files."""
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset_id}.{table_name}"

    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.PARQUET,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        autodetect=True,
    )

    load_job = client.load_table_from_uri(
        gcs_uri,
        table_ref,
        job_config=job_config,
    )

    result = load_job.result()  # Wait for completion
    logger.info(
        f"Loaded {result.output_rows} rows into {table_ref}"
    )
    return result


def load_all_tables(project_id, dataset_id, bucket_name):
    """Load all tables from GCS into BigQuery."""
    tables = discover_tables(bucket_name)
    logger.info(f"Found {len(tables)} tables to load")

    results = {}
    for table_name in tables:
        gcs_uri = f"gs://{bucket_name}/{table_name}/*.parquet"
        try:
            result = load_table(project_id, dataset_id, table_name, gcs_uri)
            results[table_name] = {
                'status': 'success',
                'rows': result.output_rows,
            }
        except Exception as e:
            logger.error(f"Failed to load {table_name}: {e}")
            results[table_name] = {
                'status': 'failed',
                'error': str(e),
            }

    return results


if __name__ == '__main__':
    results = load_all_tables(
        'my-gcp-project',
        'warehouse',
        'my-project-redshift-import'
    )

    for table, result in results.items():
        print(f"  {table}: {result['status']}")
```

## Step 4: Translate SQL Queries

Redshift SQL and BigQuery SQL have differences. Here are the most common translations:

```sql
-- Redshift: Date functions
SELECT DATEADD(day, 7, created_at) FROM orders;
-- BigQuery equivalent:
SELECT DATE_ADD(created_at, INTERVAL 7 DAY) FROM orders;

-- Redshift: String concatenation
SELECT first_name || ' ' || last_name FROM users;
-- BigQuery equivalent (same syntax works, or use CONCAT):
SELECT CONCAT(first_name, ' ', last_name) FROM users;

-- Redshift: GETDATE()
SELECT GETDATE();
-- BigQuery equivalent:
SELECT CURRENT_TIMESTAMP();

-- Redshift: NVL
SELECT NVL(email, 'no-email') FROM users;
-- BigQuery equivalent:
SELECT IFNULL(email, 'no-email') FROM users;

-- Redshift: CONVERT_TIMEZONE
SELECT CONVERT_TIMEZONE('US/Eastern', created_at) FROM orders;
-- BigQuery equivalent:
SELECT DATETIME(created_at, 'US/Eastern') FROM orders;

-- Redshift: LISTAGG
SELECT department, LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name)
FROM employees GROUP BY department;
-- BigQuery equivalent:
SELECT department, STRING_AGG(name, ', ' ORDER BY name)
FROM employees GROUP BY department;

-- Redshift: APPROXIMATE COUNT
SELECT APPROXIMATE COUNT(DISTINCT user_id) FROM events;
-- BigQuery equivalent:
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;
```

Use Google's batch SQL translator for large-scale conversion:

```bash
# Use the BigQuery Migration Service SQL translator
# Upload your SQL files and get translated versions
gcloud migration sql-translation translate \
  --source-dialect=redshift \
  --target-dialect=bigquery \
  --source-file=queries/redshift/ \
  --output-file=queries/bigquery/
```

## Step 5: Optimize for BigQuery

After loading data, apply BigQuery-specific optimizations:

```sql
-- Add partitioning (equivalent to Redshift sort key)
CREATE OR REPLACE TABLE warehouse.orders
PARTITION BY DATE(created_at)
CLUSTER BY customer_id, status
AS SELECT * FROM warehouse.orders;

-- Add clustering (equivalent to Redshift distribution key)
CREATE OR REPLACE TABLE warehouse.events
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_type
AS SELECT * FROM warehouse.events;
```

## Step 6: Validate Data

Compare row counts and checksums between Redshift and BigQuery:

```python
# validate_migration.py
# Compare Redshift and BigQuery data for consistency
import psycopg2
from google.cloud import bigquery

def compare_row_counts(redshift_conn, bq_client, tables):
    """Compare row counts between Redshift and BigQuery."""
    results = []

    for table in tables:
        # Redshift count
        rs_cursor = redshift_conn.cursor()
        rs_cursor.execute(f"SELECT COUNT(*) FROM {table}")
        rs_count = rs_cursor.fetchone()[0]

        # BigQuery count
        query = f"SELECT COUNT(*) as cnt FROM warehouse.{table}"
        bq_result = bq_client.query(query).result()
        bq_count = list(bq_result)[0].cnt

        match = rs_count == bq_count
        results.append({
            'table': table,
            'redshift_count': rs_count,
            'bigquery_count': bq_count,
            'match': match,
            'difference': rs_count - bq_count,
        })

        status = "OK" if match else "MISMATCH"
        print(f"  {table}: {status} (RS={rs_count}, BQ={bq_count})")

    return results
```

## Wrapping Up

Migrating from Redshift to BigQuery is a multi-step process that requires careful planning. Export your data in Parquet format to preserve types, use the Storage Transfer Service for efficient data movement, translate your SQL using Google's migration tools, and validate everything before switching over. The SQL translation is usually the most time-consuming part, since every query, view, and scheduled job needs to be tested. Take it table by table, validate as you go, and keep Redshift running in parallel until you are confident BigQuery has everything you need.
