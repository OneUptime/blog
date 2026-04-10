# How to Use Ceph RGW for Big Data Analytics Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Big Data, Analytics, S3, Spark, Object Storage

Description: Configure Ceph RGW as scalable object storage for big data analytics workloads using Spark, Hive, or Presto with S3A connector.

---

## Introduction

Big data analytics platforms like Apache Spark, Hive, and Presto support reading and writing data from S3-compatible endpoints. Ceph RGW fills this role on-premises, giving you full control over data locality, cost, and performance without relying on AWS S3.

## Setting Up RGW for Analytics Workloads

Create an object store optimized for large sequential reads:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: analytics-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    erasureCoded:
      dataChunks: 4
      codingChunks: 2
  gateway:
    port: 80
    instances: 3
```

Using erasure coding reduces storage overhead for large analytical datasets.

## Creating Buckets and Users

```bash
# Create a dedicated user
radosgw-admin user create \
  --uid=analytics \
  --display-name="Analytics User" \
  --access-key=ANALYTICSKEY \
  --secret-key=ANALYTICSSECRET

# Create data buckets
aws s3api create-bucket --bucket raw-data \
  --endpoint-url http://rook-ceph-rgw-analytics-store.rook-ceph:80

aws s3api create-bucket --bucket processed-data \
  --endpoint-url http://rook-ceph-rgw-analytics-store.rook-ceph:80
```

## Configuring Spark to Use Ceph RGW

Add S3A dependencies and configuration in your Spark job:

```bash
spark-submit \
  --conf spark.hadoop.fs.s3a.endpoint=http://rook-ceph-rgw-analytics-store.rook-ceph:80 \
  --conf spark.hadoop.fs.s3a.access.key=ANALYTICSKEY \
  --conf spark.hadoop.fs.s3a.secret.key=ANALYTICSSECRET \
  --conf spark.hadoop.fs.s3a.path.style.access=true \
  --conf spark.hadoop.fs.s3a.connection.ssl.enabled=false \
  --packages org.apache.hadoop:hadoop-aws:3.3.4 \
  my-analytics-job.jar
```

In a PySpark script, read and write data:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("CephAnalytics") \
    .getOrCreate()

df = spark.read.parquet("s3a://raw-data/events/2026/")
result = df.groupBy("region").count()
result.write.parquet("s3a://processed-data/region-counts/")
```

## Configuring Hive Metastore

In `hive-site.xml`, set the S3A properties:

```xml
<property>
  <name>fs.s3a.endpoint</name>
  <value>http://rook-ceph-rgw-analytics-store.rook-ceph:80</value>
</property>
<property>
  <name>fs.s3a.path.style.access</name>
  <value>true</value>
</property>
<property>
  <name>fs.s3a.access.key</name>
  <value>ANALYTICSKEY</value>
</property>
<property>
  <name>fs.s3a.secret.key</name>
  <value>ANALYTICSSECRET</value>
</property>
```

## Performance Tuning

Set bucket quotas and tune RGW for high throughput:

```bash
radosgw-admin global quota set \
  --quota-scope=bucket \
  --max-size=10T

# Tune RGW thread count for throughput
ceph config set client.rgw rgw_thread_pool_size 512
ceph config set client.rgw rgw_max_concurrent_requests 1024
```

## Summary

Ceph RGW serves as a powerful on-premises S3-compatible backend for big data analytics stacks. By configuring Spark, Hive, or Presto with S3A settings pointing to Ceph RGW, organizations can store and process petabytes of analytical data without relying on cloud storage, while maintaining full data sovereignty and optimizing for high throughput.
