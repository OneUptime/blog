# How to Use Ceph RGW for Data Lake Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Data Lake, S3, Object Storage, Analytics

Description: Learn how to use Ceph RADOS Gateway as S3-compatible data lake storage, configure bucket policies for analytics workloads, and integrate with Apache Spark and Trino.

---

## Why Ceph RGW for Data Lake Storage?

Data lakes require scalable, cost-effective object storage with S3-compatible APIs. Ceph RGW provides:

- S3 and Swift compatible API
- Horizontal scalability to petabytes
- Multi-tenancy via bucket policies
- On-premises data sovereignty
- Integration with major analytics frameworks

## Setting Up a Data Lake Bucket

```bash
# Configure the AWS CLI to point to Ceph RGW
aws configure set default.endpoint_url https://rgw.example.com
export AWS_ACCESS_KEY_ID=<access-key>
export AWS_SECRET_ACCESS_KEY=<secret-key>

# Create a data lake bucket
aws s3 mb s3://datalake --endpoint-url https://rgw.example.com

# Create a structured folder hierarchy
aws s3api put-object --bucket datalake --key raw/ --endpoint-url https://rgw.example.com
aws s3api put-object --bucket datalake --key processed/ --endpoint-url https://rgw.example.com
aws s3api put-object --bucket datalake --key curated/ --endpoint-url https://rgw.example.com
```

## Configuring Bucket Versioning

Enable versioning to maintain history of data changes:

```bash
aws s3api put-bucket-versioning \
  --bucket datalake \
  --versioning-configuration Status=Enabled \
  --endpoint-url https://rgw.example.com
```

## Setting a Lifecycle Policy for Data Tiers

Move data from raw to archive after 90 days:

```json
{
  "Rules": [{
    "ID": "archive-raw-data",
    "Filter": { "Prefix": "raw/" },
    "Status": "Enabled",
    "Transitions": [{
      "Days": 90,
      "StorageClass": "GLACIER"
    }]
  }]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket datalake \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url https://rgw.example.com
```

## Integrating with Apache Spark

Configure Spark to read from Ceph RGW:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("DataLake") \
    .config("spark.hadoop.fs.s3a.endpoint", "https://rgw.example.com") \
    .config("spark.hadoop.fs.s3a.access.key", "my-access-key") \
    .config("spark.hadoop.fs.s3a.secret.key", "my-secret-key") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .getOrCreate()

# Read Parquet from data lake
df = spark.read.parquet("s3a://datalake/processed/events/")
df.show()
```

## Integrating with Trino (Presto)

Configure Trino catalog for Ceph S3:

```properties
connector.name=hive
hive.metastore.uri=thrift://hive-metastore:9083
hive.s3.endpoint=https://rgw.example.com
hive.s3.aws-access-key=my-access-key
hive.s3.aws-secret-key=my-secret-key
hive.s3.path-style-access=true
hive.s3.ssl.enabled=true
```

Query data lake tables:

```sql
SELECT date_trunc('hour', event_time) AS hour,
       count(*) AS events
FROM datalake.processed.events
WHERE event_date = CURRENT_DATE
GROUP BY 1
ORDER BY 1;
```

## Enabling Multipart Upload for Large Files

Large data files (>100MB) should use multipart uploads. Configure the chunk size first, then upload:

```bash
# Set multipart chunk size to 64MB
aws configure set default.s3.multipart_chunksize 64MB

# Upload large file (multipart upload is used automatically)
aws s3 cp large-dataset.parquet s3://datalake/raw/datasets/ \
  --endpoint-url https://rgw.example.com
```

## Summary

Ceph RGW provides a scalable, self-hosted S3-compatible backend for data lake architectures. Configure structured bucket hierarchies with raw, processed, and curated zones, enable versioning for data lineage, and set lifecycle policies to automate data tiering. Integrate with Spark using the S3A connector and Trino using the Hive catalog, both of which support path-style access required by Ceph RGW.
