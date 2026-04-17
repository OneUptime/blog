# How to Use Filesystem as a Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, File Table Engine, S3 Table Engine, Filesystem, External Storage

Description: Learn how to use filesystem-based table engines in ClickHouse to query files on local disk, S3, and other storage backends as SQL tables.

---

ClickHouse does not have a dedicated "Filesystem database engine," but it provides several table engines that treat external storage as queryable data sources. The File engine reads from local disk, the S3 engine queries Amazon S3, the HDFS engine reads from Hadoop, and the URL engine fetches from HTTP. Together, these let you query files in various formats directly with SQL.

## File Table Engine

The File engine reads from files stored on the ClickHouse server's local filesystem:

```sql
CREATE TABLE local_csv (
    ts DateTime,
    level String,
    message String
)
ENGINE = File(CSV);
```

By default, ClickHouse stores the file at `{data_path}/data/default/local_csv/data.CSV`. ClickHouse Server does not allow specifying an arbitrary filesystem path for the `File` engine — files must live under the configured data directory. For reading a file by relative path from `user_files_path`, use the `file()` table function instead:

```sql
SELECT host, count() AS requests
FROM file('access.log', 'TSV', 'ts String, host String, message String')
WHERE ts >= '2024-06-01'
GROUP BY host
ORDER BY requests DESC;
```

## S3 Table Engine

Query files directly from Amazon S3:

```sql
CREATE TABLE s3_events (
    event_id UInt64,
    event_type String,
    ts DateTime
)
ENGINE = S3(
    'https://my-bucket.s3.amazonaws.com/events/2024/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

SELECT event_type, count() FROM s3_events GROUP BY event_type;
```

The S3 engine supports glob patterns and can read from multiple files in one query.

## Using S3 Table Function

For one-off queries without a persistent table definition:

```sql
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/export.csv.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'CSV',
    'id UInt64, name String, value Float64'
)
LIMIT 10;
```

## Supported Formats

All filesystem-backed engines support ClickHouse's full range of formats:

```text
CSV, CSVWithNames
TSV, TSVWithNames
JSONEachRow
Parquet
ORC
Avro
Arrow
Native
```

## Writing to S3

You can also INSERT data into S3 via the S3 engine:

```sql
INSERT INTO s3_events
SELECT * FROM local_events WHERE ts >= today();
```

This creates a new file (or appends depending on settings) in the S3 bucket.

## HDFS Table Engine

For Hadoop deployments:

```sql
CREATE TABLE hdfs_data (
    id UInt64,
    value String
)
ENGINE = HDFS('hdfs://namenode:9000/data/*.parquet', 'Parquet');
```

## Partitioning with Hive-Style Paths

S3 and HDFS engines support hive-style partitioning:

```sql
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/date=2024-06-*/hour=*/part-*.parquet',
    'ACCESS_KEY', 'SECRET_KEY',
    'Parquet',
    'event_id UInt64, event_type String'
);
```

ClickHouse can prune partitions based on the path pattern for efficiency.

## Summary

ClickHouse's filesystem-based table engines (File, S3, HDFS, URL) let you query external data sources directly with SQL, without loading data into MergeTree tables. They are ideal for data exploration, ETL pipelines, ad-hoc analysis of exported files, and building data lake query layers. For repeated analytics on external data, consider using INSERT SELECT to materialize data locally in a MergeTree table.
