# How to Use S3-Select with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3-Select, Query, Object Storage, SQL, Performance

Description: Use S3-Select with Ceph RGW to run SQL queries directly against CSV and Parquet objects, reducing data transfer by filtering server-side.

---

S3-Select allows clients to run SQL queries directly against objects stored in Ceph RGW, returning only the matching data instead of the entire object. This reduces network transfer and client-side processing for large datasets stored in CSV or Parquet format.

## Prerequisites

S3-Select must be enabled in your Ceph build. Verify support:

```bash
ceph config show client.rgw | grep s3_select
```

Enable S3-Select:

```bash
ceph config set client.rgw rgw_s3select_enabled true
```

## Querying a CSV Object

Suppose you have a CSV file `sales.csv` with columns: `date,region,product,revenue`

Upload the file:

```bash
aws s3 cp sales.csv s3://analytics/sales.csv \
  --endpoint-url http://your-rgw-host:7480
```

Run an S3-Select query with AWS CLI:

```bash
aws s3api select-object-content \
  --bucket analytics \
  --key sales.csv \
  --expression "SELECT * FROM S3Object WHERE CAST(revenue AS DECIMAL) > 10000" \
  --expression-type SQL \
  --input-serialization '{"CSV": {"FileHeaderInfo": "USE"}, "CompressionType": "NONE"}' \
  --output-serialization '{"CSV": {}}' \
  /dev/stdout \
  --endpoint-url http://your-rgw-host:7480
```

## Querying with Python boto3

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://your-rgw-host:7480',
    aws_access_key_id='your-access-key',
    aws_secret_access_key='your-secret-key'
)

response = s3.select_object_content(
    Bucket='analytics',
    Key='sales.csv',
    ExpressionType='SQL',
    Expression="SELECT * FROM S3Object WHERE region = 'us-east'",
    InputSerialization={
        'CSV': {'FileHeaderInfo': 'USE'},
        'CompressionType': 'NONE'
    },
    OutputSerialization={'CSV': {}}
)

for event in response['Payload']:
    if 'Records' in event:
        print(event['Records']['Payload'].decode('utf-8'))
    elif 'Stats' in event:
        stats = event['Stats']['Details']
        print(f"Bytes scanned: {stats['BytesScanned']}")
        print(f"Bytes returned: {stats['BytesReturned']}")
```

## Querying Compressed Objects

S3-Select supports GZIP and BZIP2 compressed CSV:

```bash
gzip sales.csv
aws s3 cp sales.csv.gz s3://analytics/sales.csv.gz \
  --endpoint-url http://your-rgw-host:7480

aws s3api select-object-content \
  --bucket analytics \
  --key sales.csv.gz \
  --expression "SELECT * FROM S3Object WHERE CAST(revenue AS DECIMAL) > 10000" \
  --expression-type SQL \
  --input-serialization '{"CSV": {"FileHeaderInfo": "USE"}, "CompressionType": "GZIP"}' \
  --output-serialization '{"CSV": {}}' \
  /dev/stdout \
  --endpoint-url http://your-rgw-host:7480
```

## Supported SQL Features

Ceph RGW S3-Select supports:
- `SELECT`, `WHERE`, `LIMIT`
- `CAST`, `COALESCE`, `NULLIF`
- String functions: `LOWER`, `UPPER`, `SUBSTRING`, `TRIM`
- Aggregate functions: `SUM`, `COUNT`, `MIN`, `MAX`, `AVG`

## Summary

S3-Select in Ceph RGW enables server-side SQL queries against CSV and compressed objects, significantly reducing the data returned to clients. Use the AWS S3 API or boto3 to push query predicates to the storage layer, ideal for analytics workflows that only need a subset of large datasets.
