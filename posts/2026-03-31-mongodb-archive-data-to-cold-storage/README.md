# How to Archive Data to Cold Storage from MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Archive, Cold Storage, Data Tiering, S3

Description: Learn how to export and archive MongoDB data to cold storage like S3 or GCS for long-term retention, cost savings, and compliance requirements.

---

## Why Move MongoDB Data to Cold Storage

Cold storage like Amazon S3 or Google Cloud Storage costs a fraction of MongoDB Atlas cluster storage. Data accessed less than once a month is a prime candidate for cold archiving. Common use cases include audit logs, historical analytics data, and regulatory records that must be retained but rarely queried.

## Step 1: Export Data with mongoexport

The simplest approach uses `mongoexport` to write documents to JSON or CSV files:

```bash
mongoexport \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/mydb" \
  --collection=events \
  --query='{"timestamp": {"$lt": {"$date": "2024-01-01T00:00:00Z"}}}' \
  --out=events_2023.json \
  --type=json
```

For large collections, add `--limit` and paginate using date ranges in `--query` per run.

## Step 2: Compress the Export

Always compress before uploading to minimize transfer time and storage costs:

```bash
gzip events_2023.json
# Results in events_2023.json.gz
```

For better compression ratios use zstd:

```bash
zstd -19 events_2023.json -o events_2023.json.zst
```

## Step 3: Upload to S3

Use the AWS CLI to upload to a cold storage bucket:

```bash
aws s3 cp events_2023.json.gz \
  s3://my-mongodb-archives/events/2023/events_2023.json.gz \
  --storage-class GLACIER_IR \
  --metadata "collection=events,exported=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Use `GLACIER_IR` (Glacier Instant Retrieval) for data you may need within milliseconds, or `DEEP_ARCHIVE` for data unlikely to be accessed.

## Step 4: Set S3 Lifecycle Policies

Automate tiering within S3 using lifecycle rules:

```json
{
  "Rules": [{
    "Id": "archive-mongodb-exports",
    "Filter": { "Prefix": "events/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ]
  }]
}
```

Apply this policy with:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-mongodb-archives \
  --lifecycle-configuration file://lifecycle.json
```

## Step 5: Delete from MongoDB After Verification

Verify the S3 object exists and is readable before deleting from MongoDB:

```bash
aws s3 ls s3://my-mongodb-archives/events/2023/events_2023.json.gz
```

Then delete from MongoDB:

```javascript
db.events.deleteMany({
  timestamp: { $lt: new Date("2024-01-01T00:00:00Z") }
});
```

## Step 6: Script the Full Pipeline

Combine steps into a reusable shell script:

```bash
#!/bin/bash
set -e

COLLECTION="events"
CUTOFF_DATE="2024-01-01T00:00:00Z"
EXPORT_FILE="${COLLECTION}_archive_$(date +%Y%m%d).json"
BUCKET="s3://my-mongodb-archives"

mongoexport \
  --uri="${MONGO_URI}" \
  --collection="${COLLECTION}" \
  --query="{\"timestamp\": {\"\$lt\": {\"\$date\": \"${CUTOFF_DATE}\"}}}" \
  --out="${EXPORT_FILE}"

gzip "${EXPORT_FILE}"
aws s3 cp "${EXPORT_FILE}.gz" "${BUCKET}/${COLLECTION}/" --storage-class GLACIER_IR
echo "Archive uploaded successfully"
```

## Step 7: Restoring from Cold Storage

To restore data when needed:

```bash
# For GLACIER_IR objects, download directly (millisecond retrieval):
aws s3 cp \
  s3://my-mongodb-archives/events/2023/events_2023.json.gz \
  ./events_2023.json.gz

# For DEEP_ARCHIVE objects, initiate a restore first (takes up to 12 hours):
aws s3api restore-object \
  --bucket my-mongodb-archives \
  --key events/2023/events_2023.json.gz \
  --restore-request '{"Days":7,"GlacierJobParameters":{"Tier":"Standard"}}'
# Wait for restore to complete, then download with aws s3 cp

gunzip events_2023.json.gz
mongoimport --uri="${MONGO_URI}" --collection=events_archive --file=events_2023.json
```

## Summary

Archiving MongoDB data to cold storage involves exporting with `mongoexport`, compressing with gzip or zstd, uploading to S3 with an appropriate storage class, configuring lifecycle policies for automatic tiering, and verifying before deleting from MongoDB. This approach can reduce storage costs by up to 90% for historical data while maintaining compliance and recoverability.
