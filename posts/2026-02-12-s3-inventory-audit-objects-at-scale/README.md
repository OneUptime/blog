# How to Use S3 Inventory to Audit Objects at Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Inventory, Auditing, Data Management

Description: Learn how to configure S3 Inventory to generate regular reports of your objects, their metadata, and encryption status for large-scale auditing and compliance.

---

When you've got millions of objects in S3, trying to audit them with `list-objects` calls is painful. You'll hit rate limits, deal with pagination, and spend hours waiting for results. S3 Inventory solves this by generating daily or weekly reports that list every object in your bucket along with metadata like size, storage class, encryption status, and replication state.

It's one of those features that sounds boring until you actually need it - and then it's a lifesaver.

## What S3 Inventory Gives You

S3 Inventory produces flat files (CSV, ORC, or Parquet) containing metadata about your objects. Each report includes the fields you choose from a list of available columns:

- Object key and size
- Last modified date
- ETag
- Storage class
- Encryption status
- Replication status
- Object Lock retention and legal hold status
- Checksum algorithm
- Bucket key status

These reports land in a destination bucket of your choosing, organized by date. You can then query them with Athena, process them with Lambda, or just download them for analysis.

## Step 1: Create a Destination Bucket

The inventory reports need to go somewhere. You can use the same bucket or a separate one. Using a separate bucket is cleaner for most setups.

```bash
# Create a destination bucket for inventory reports
aws s3api create-bucket \
  --bucket my-inventory-reports \
  --region us-east-1
```

## Step 2: Set Up the Bucket Policy

The source bucket needs permission to write inventory reports to the destination bucket. Add this bucket policy to the destination.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3InventoryPolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-inventory-reports/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012",
          "s3:x-amz-acl": "bucket-owner-full-control"
        },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::my-source-bucket"
        }
      }
    }
  ]
}
```

Apply the policy.

```bash
aws s3api put-bucket-policy \
  --bucket my-inventory-reports \
  --policy file://inventory-bucket-policy.json
```

## Step 3: Configure the Inventory

Now set up the inventory configuration on your source bucket. This example generates a daily CSV report with all the commonly useful fields.

```bash
aws s3api put-bucket-inventory-configuration \
  --bucket my-source-bucket \
  --id full-audit-inventory \
  --inventory-configuration '{
    "Id": "full-audit-inventory",
    "IsEnabled": true,
    "Destination": {
      "S3BucketDestination": {
        "AccountId": "123456789012",
        "Bucket": "arn:aws:s3:::my-inventory-reports",
        "Format": "CSV",
        "Prefix": "inventory/my-source-bucket"
      }
    },
    "Schedule": {
      "Frequency": "Daily"
    },
    "IncludedObjectVersions": "Current",
    "OptionalFields": [
      "Size",
      "LastModifiedDate",
      "StorageClass",
      "ETag",
      "IsMultipartUploaded",
      "ReplicationStatus",
      "EncryptionStatus",
      "ObjectLockRetainUntilDate",
      "ObjectLockMode",
      "ObjectLockLegalHoldStatus",
      "BucketKeyStatus"
    ]
  }'
```

A few notes on the options:

- **Format**: CSV is human-readable but larger. Parquet and ORC are compressed and better for querying with Athena.
- **Frequency**: Daily or Weekly. Daily is better for active auditing.
- **IncludedObjectVersions**: "Current" for just the latest version, "All" if you need version history too.

## Step 4: Wait for the First Report

After configuring inventory, it takes up to 48 hours for the first report to appear. Don't panic if nothing shows up right away.

Reports are organized in the destination bucket like this:

```
my-inventory-reports/
  inventory/
    my-source-bucket/
      full-audit-inventory/
        2026-02-12T00-00Z/
          manifest.json
          manifest.checksum
          data/
            abc123-def456.csv.gz
```

The `manifest.json` file contains metadata about the report and lists all the data files.

## Step 5: Analyze Inventory with Athena

For large inventories, Athena is the best way to query the data. First, create a table that matches your inventory schema.

```sql
CREATE EXTERNAL TABLE s3_inventory (
  bucket_name string,
  key string,
  size bigint,
  last_modified_date string,
  storage_class string,
  etag string,
  is_multipart_uploaded boolean,
  replication_status string,
  encryption_status string,
  object_lock_retain_until_date string,
  object_lock_mode string,
  object_lock_legal_hold_status string,
  bucket_key_status string
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
STORED AS TEXTFILE
LOCATION 's3://my-inventory-reports/inventory/my-source-bucket/full-audit-inventory/data/'
TBLPROPERTIES ('skip.header.line.count'='0');
```

Now you can run queries. Here are some useful ones.

Find all objects that aren't encrypted.

```sql
SELECT key, size, storage_class
FROM s3_inventory
WHERE encryption_status = 'NOT-SSE'
ORDER BY size DESC
LIMIT 100;
```

Calculate storage breakdown by class.

```sql
SELECT
  storage_class,
  COUNT(*) as object_count,
  SUM(size) / 1024 / 1024 / 1024 as total_gb
FROM s3_inventory
GROUP BY storage_class
ORDER BY total_gb DESC;
```

Find large objects that could be moved to cheaper storage.

```sql
SELECT key, size / 1024 / 1024 as size_mb, last_modified_date, storage_class
FROM s3_inventory
WHERE storage_class = 'STANDARD'
  AND size > 104857600  -- larger than 100MB
  AND last_modified_date < '2025-01-01'
ORDER BY size DESC
LIMIT 50;
```

For a complete guide on querying S3 data with Athena, check out our post on [analyzing S3 access logs with Athena](https://oneuptime.com/blog/post/2026-02-12-analyze-s3-access-logs-athena/view).

## Step 6: Automate Audits with Lambda

You can trigger a Lambda function when new inventory reports arrive and run automatic compliance checks.

```python
import boto3
import csv
import gzip
import io
import json

s3 = boto3.client('s3')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Triggered when a new inventory manifest.json is created.
    Checks for unencrypted objects and sends alerts.
    """
    bucket = event['Records'][0]['s3']['bucket']['name']
    manifest_key = event['Records'][0]['s3']['object']['key']

    # Only process manifest files
    if not manifest_key.endswith('manifest.json'):
        return

    # Read the manifest to find data files
    manifest_obj = s3.get_object(Bucket=bucket, Key=manifest_key)
    manifest = json.loads(manifest_obj['Body'].read())

    unencrypted_objects = []

    # Process each data file listed in the manifest
    for file_info in manifest.get('files', []):
        data_key = file_info['key']
        data_obj = s3.get_object(Bucket=bucket, Key=data_key)

        # Decompress and parse CSV
        with gzip.open(data_obj['Body'], 'rt') as f:
            reader = csv.reader(f)
            for row in reader:
                # Column index depends on your inventory config
                # encryption_status is typically column 8
                if len(row) > 8 and row[8] == 'NOT-SSE':
                    unencrypted_objects.append(row[1])  # object key

    if unencrypted_objects:
        # Send alert about unencrypted objects
        message = f"Found {len(unencrypted_objects)} unencrypted objects:\n"
        message += "\n".join(unencrypted_objects[:20])  # first 20
        if len(unencrypted_objects) > 20:
            message += f"\n... and {len(unencrypted_objects) - 20} more"

        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:compliance-alerts',
            Subject='S3 Compliance Alert: Unencrypted Objects Found',
            Message=message
        )

    return {
        'statusCode': 200,
        'total_objects_scanned': manifest.get('fileCount', 0),
        'unencrypted_count': len(unencrypted_objects)
    }
```

## Inventory Configuration for Parquet Format

If you're planning to query with Athena regularly, Parquet is the better format - it's compressed, columnar, and much faster to query.

```bash
aws s3api put-bucket-inventory-configuration \
  --bucket my-source-bucket \
  --id parquet-inventory \
  --inventory-configuration '{
    "Id": "parquet-inventory",
    "IsEnabled": true,
    "Destination": {
      "S3BucketDestination": {
        "AccountId": "123456789012",
        "Bucket": "arn:aws:s3:::my-inventory-reports",
        "Format": "Parquet",
        "Prefix": "inventory-parquet/my-source-bucket"
      }
    },
    "Schedule": {
      "Frequency": "Weekly"
    },
    "IncludedObjectVersions": "All",
    "OptionalFields": [
      "Size",
      "LastModifiedDate",
      "StorageClass",
      "EncryptionStatus"
    ]
  }'
```

## Cost Considerations

S3 Inventory is cheap - you're charged per million objects listed. At current pricing, that's about $0.0025 per million objects. So even a bucket with 100 million objects only costs $0.25 per inventory run. The storage for the reports themselves is just standard S3 pricing.

Compare that to writing a script that calls ListObjectsV2 repeatedly - you'd be paying for millions of API requests at $0.005 per 1000, plus the compute time to run the script.

## Wrapping Up

S3 Inventory is the foundation for any serious S3 auditing strategy. Whether you need to verify encryption compliance, track storage costs, or identify objects for lifecycle transitions, it gives you the data without hammering the S3 API. Set it up once, let it run, and build your auditing workflows on top of the reports.

The combination of Inventory reports with Athena queries and automated Lambda checks gives you a fully automated compliance pipeline that scales to billions of objects.
