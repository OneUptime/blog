# How to Archive Data to Cold Storage from MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Archive, Cold Storage, S3, Data Management

Description: Export old MySQL data to Amazon S3 or similar cold storage in Parquet or CSV format for cost-effective long-term retention and compliance.

---

## Cold Storage for MySQL Data

Cold storage (Amazon S3, Google Cloud Storage, Azure Blob Storage) costs a fraction of database storage and is suitable for historical data that is rarely accessed but must be retained for compliance. Exporting MySQL data to cold storage in a compressed, queryable format like Parquet preserves the data while freeing up database resources.

## Export Strategy

For cold storage archival, export data in manageable chunks by date range, compress the output, and upload to object storage:

```text
MySQL Table (orders, 5 years of data)
    |
    v
Export by month to CSV/Parquet
    |
    v
Compress with gzip/snappy
    |
    v
Upload to S3: s3://archive-bucket/mysql/orders/year=2024/month=01/data.parquet
    |
    v
Delete from MySQL after verification
```

## Exporting with SELECT INTO OUTFILE

For CSV exports on the MySQL server:

```sql
-- Export January 2024 orders to CSV
SELECT id, user_id, total, status, created_at
INTO OUTFILE '/var/lib/mysql-files/orders_2024_01.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at  < '2024-02-01';
```

Then compress and upload:

```bash
gzip /var/lib/mysql-files/orders_2024_01.csv
aws s3 cp /var/lib/mysql-files/orders_2024_01.csv.gz \
  s3://archive-bucket/mysql/orders/year=2024/month=01/orders.csv.gz \
  --storage-class GLACIER_IR
```

## Python Export Script with Parquet

Parquet is more storage-efficient and supports efficient column-level queries with tools like Athena or DuckDB:

```python
#!/usr/bin/env python3
# archive_to_s3.py
import mysql.connector
import pandas as pd
import boto3
import os
from datetime import date

def archive_month(year: int, month: int):
    conn = mysql.connector.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
    )

    start = date(year, month, 1)
    end = date(year + (month // 12), (month % 12) + 1, 1)

    df = pd.read_sql(
        "SELECT id, user_id, total, status, created_at FROM orders "
        "WHERE created_at >= %s AND created_at < %s",
        conn,
        params=(start, end),
    )
    conn.close()

    if df.empty:
        print(f"No data for {year}-{month:02d}")
        return 0

    local_path = f"/tmp/orders_{year}_{month:02d}.parquet"
    df.to_parquet(local_path, compression='snappy', index=False)

    s3 = boto3.client('s3')
    s3_key = f"mysql/orders/year={year}/month={month:02d}/data.parquet"
    s3.upload_file(
        local_path,
        os.environ['ARCHIVE_S3_BUCKET'],
        s3_key,
        ExtraArgs={'StorageClass': 'STANDARD_IA'},
    )

    os.remove(local_path)
    print(f"Archived {len(df)} rows to s3://{os.environ['ARCHIVE_S3_BUCKET']}/{s3_key}")
    return len(df)

if __name__ == '__main__':
    archive_month(2024, 1)
```

## Verifying and Deleting After Archive

Never delete from production without verifying the archive:

```python
def verify_and_delete(year: int, month: int, archived_count: int):
    s3 = boto3.client('s3')
    s3_key = f"mysql/orders/year={year}/month={month:02d}/data.parquet"

    # Download and count
    s3.download_file(os.environ['ARCHIVE_S3_BUCKET'], s3_key, '/tmp/verify.parquet')
    df = pd.read_parquet('/tmp/verify.parquet')

    if len(df) != archived_count:
        raise ValueError(f"Archive count mismatch: expected {archived_count}, got {len(df)}")

    # Safe to delete
    start = date(year, month, 1)
    end   = date(year + (month // 12), (month % 12) + 1, 1)
    conn  = mysql.connector.connect(...)
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM orders WHERE created_at >= %s AND created_at < %s",
        (start, end)
    )
    conn.commit()
    print(f"Deleted {cursor.rowcount} rows from production")
```

## Querying Cold Storage with Athena

Once data is in S3 as Parquet, use AWS Athena to query it without restoring to MySQL:

```sql
-- Athena query over archived MySQL data
SELECT year, month, COUNT(*) AS order_count, SUM(total) AS revenue
FROM "archive_db"."orders"
WHERE year BETWEEN 2024 AND 2025
GROUP BY year, month
ORDER BY year, month;
```

## Summary

Archiving MySQL data to cold storage involves exporting data to compressed Parquet files partitioned by date, uploading to S3 with an infrequent-access storage class, verifying the archive before deleting from production, and using tools like AWS Athena for querying historical data without restoring it. This approach dramatically reduces database storage costs while maintaining compliance and data accessibility.
