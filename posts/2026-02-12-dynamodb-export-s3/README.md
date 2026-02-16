# How to Export DynamoDB Data to S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, S3, Data Export

Description: Learn how to export DynamoDB table data to S3 using native exports, Data Pipeline, and custom scripts for analytics, backup, and data migration use cases.

---

Exporting DynamoDB data to S3 is something you'll need to do eventually. Maybe it's for analytics, backup, data lake ingestion, compliance archiving, or migrating to another system. DynamoDB has a native export feature that makes this straightforward, but there are also situations where you'll want custom export scripts.

Let's cover all the approaches and when to use each one.

## Native DynamoDB Export to S3

DynamoDB's built-in export feature is the easiest way to get your data into S3. It uses point-in-time recovery (PITR) to create a consistent snapshot and writes it to S3 without consuming any read capacity from your table.

That last point is huge. The export doesn't affect your table's performance at all. It reads from the PITR backup, not from the live table.

### Prerequisites

1. Point-in-time recovery must be enabled on the table
2. You need an S3 bucket with appropriate permissions

Enable PITR if it's not already on:

```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name Orders \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Running the Export

```bash
# Export table to S3 in DynamoDB JSON format
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789:table/Orders \
  --s3-bucket my-exports-bucket \
  --s3-prefix dynamodb-exports/orders/ \
  --export-format DYNAMODB_JSON

# Or export in ION format (Amazon's format, more compact)
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789:table/Orders \
  --s3-bucket my-exports-bucket \
  --s3-prefix dynamodb-exports/orders/ \
  --export-format ION
```

You can also export data from a specific point in time:

```bash
# Export data as it was at a specific timestamp
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789:table/Orders \
  --s3-bucket my-exports-bucket \
  --s3-prefix dynamodb-exports/orders/ \
  --export-time "2026-02-11T00:00:00Z" \
  --export-format DYNAMODB_JSON
```

### Checking Export Status

```bash
# List exports
aws dynamodb list-exports --table-arn arn:aws:dynamodb:us-east-1:123456789:table/Orders

# Describe a specific export
aws dynamodb describe-export \
  --export-arn arn:aws:dynamodb:us-east-1:123456789:table/Orders/export/01234567890
```

The export creates files in your S3 bucket under the specified prefix:

```
s3://my-exports-bucket/dynamodb-exports/orders/
  AWSDynamoDB/
    01234567890123-abcdef/
      manifest-summary.json
      manifest-files.json
      data/
        abc123.json.gz
        def456.json.gz
        ...
```

### Export Format

The DynamoDB JSON format looks like this:

```json
{"Item":{"orderId":{"S":"ord-001"},"customerId":{"S":"cust-001"},"amount":{"N":"99.99"},"status":{"S":"shipped"}}}
{"Item":{"orderId":{"S":"ord-002"},"customerId":{"S":"cust-002"},"amount":{"N":"149.50"},"status":{"S":"delivered"}}}
```

Each line is a separate item with DynamoDB type descriptors.

## Using the SDK to Trigger Exports

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();

async function exportTable(tableArn, bucketName, prefix) {
  const params = {
    TableArn: tableArn,
    S3Bucket: bucketName,
    S3Prefix: prefix,
    ExportFormat: 'DYNAMODB_JSON'
  };

  const result = await dynamodb.exportTableToPointInTime(params).promise();
  console.log('Export started:', result.ExportDescription.ExportArn);
  return result.ExportDescription;
}

// Wait for the export to complete
async function waitForExport(exportArn) {
  let status = 'IN_PROGRESS';

  while (status === 'IN_PROGRESS') {
    const result = await dynamodb.describeExport({ ExportArn: exportArn }).promise();
    status = result.ExportDescription.ExportStatus;
    console.log(`Export status: ${status}`);

    if (status === 'IN_PROGRESS') {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
  }

  return status;
}
```

## Custom Export with Scan

For more control over the export format or when you need to transform data during export, use a custom Scan-based export:

```javascript
const AWS = require('aws-sdk');
const { S3 } = require('@aws-sdk/client-s3');
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new S3();

async function customExport(tableName, bucketName, keyPrefix) {
  let lastKey = undefined;
  let fileCount = 0;
  let totalItems = 0;

  do {
    // Scan a batch of items
    const result = await docClient.scan({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
      Limit: 1000
    }).promise();

    if (result.Items.length > 0) {
      // Convert to newline-delimited JSON
      const content = result.Items
        .map(item => JSON.stringify(item))
        .join('\n');

      // Upload to S3
      const key = `${keyPrefix}/part-${String(fileCount).padStart(5, '0')}.jsonl`;
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: 'application/json'
      });

      totalItems += result.Items.length;
      fileCount++;
      console.log(`Exported ${totalItems} items (${fileCount} files)`);
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Export complete: ${totalItems} items in ${fileCount} files`);
  return { totalItems, fileCount };
}
```

The downside of custom exports: they consume your table's read capacity. For large tables, this can be expensive and might throttle your application's reads. Use rate limiting to control the impact:

```javascript
// Rate-limited export to avoid throttling production traffic
async function rateLimitedExport(tableName, bucketName, keyPrefix, delayMs = 100) {
  let lastKey = undefined;
  let items = [];
  const BATCH_SIZE = 100;
  const FILE_THRESHOLD = 10000; // Write to S3 every 10,000 items
  let fileCount = 0;

  do {
    const result = await docClient.scan({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
      Limit: BATCH_SIZE
    }).promise();

    items.push(...result.Items);
    lastKey = result.LastEvaluatedKey;

    // Write to S3 when we have enough items
    if (items.length >= FILE_THRESHOLD) {
      await writeToS3(bucketName, keyPrefix, fileCount, items);
      items = [];
      fileCount++;
    }

    // Rate limit to reduce impact on the table
    await new Promise(resolve => setTimeout(resolve, delayMs));
  } while (lastKey);

  // Write remaining items
  if (items.length > 0) {
    await writeToS3(bucketName, keyPrefix, fileCount, items);
  }
}

async function writeToS3(bucket, prefix, fileNum, items) {
  const key = `${prefix}/part-${String(fileNum).padStart(5, '0')}.jsonl`;
  const body = items.map(i => JSON.stringify(i)).join('\n');

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json'
  });
}
```

## Exporting to CSV Format

If you need CSV for analytics tools like Excel or data warehouses:

```javascript
// Export to CSV format
async function exportToCSV(tableName, bucketName, key) {
  // First, scan to discover all attribute names
  const sampleResult = await docClient.scan({
    TableName: tableName,
    Limit: 100
  }).promise();

  // Collect all unique attribute names
  const allAttributes = new Set();
  sampleResult.Items.forEach(item => {
    Object.keys(item).forEach(attr => allAttributes.add(attr));
  });
  const headers = Array.from(allAttributes).sort();

  // Build CSV content
  let csv = headers.join(',') + '\n';
  let lastKey = undefined;

  do {
    const result = await docClient.scan({
      TableName: tableName,
      ExclusiveStartKey: lastKey
    }).promise();

    for (const item of result.Items) {
      const row = headers.map(h => {
        const value = item[h];
        if (value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return String(value);
      });
      csv += row.join(',') + '\n';
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Upload to S3
  await s3.putObject({
    Bucket: bucketName,
    Key: key,
    Body: csv,
    ContentType: 'text/csv'
  });
}
```

## Incremental Exports with DynamoDB Streams

For ongoing data synchronization, use DynamoDB Streams instead of full exports:

```javascript
// Lambda function triggered by DynamoDB Stream
// Writes changes to S3 in near real-time
exports.handler = async (event) => {
  const s3 = new S3();
  const records = event.Records.map(record => ({
    eventName: record.eventName,
    timestamp: record.dynamodb.ApproximateCreationDateTime,
    keys: AWS.DynamoDB.Converter.unmarshall(record.dynamodb.Keys),
    newImage: record.dynamodb.NewImage
      ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
      : null,
    oldImage: record.dynamodb.OldImage
      ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
      : null
  }));

  // Write batch of changes to S3
  const key = `stream-exports/${new Date().toISOString().slice(0, 10)}/${Date.now()}.jsonl`;
  const body = records.map(r => JSON.stringify(r)).join('\n');

  await s3.putObject({
    Bucket: process.env.EXPORT_BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/json'
  });

  console.log(`Exported ${records.length} stream records to S3`);
};
```

## Querying Exported Data

Once your data is in S3, you can query it with Amazon Athena without loading it into another database:

```sql
-- Create an Athena table pointing to the DynamoDB export
CREATE EXTERNAL TABLE orders_export (
  Item struct&lt;
    orderId: struct&lt;S: string&gt;,
    customerId: struct&lt;S: string&gt;,
    amount: struct&lt;N: string&gt;,
    status: struct&lt;S: string&gt;
  &gt;
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://my-exports-bucket/dynamodb-exports/orders/AWSDynamoDB/data/';

-- Query the exported data
SELECT
  Item.orderId.S as orderId,
  Item.customerId.S as customerId,
  CAST(Item.amount.N AS decimal(10,2)) as amount,
  Item.status.S as status
FROM orders_export
WHERE Item.status.S = 'shipped';
```

## Scheduling Regular Exports

Use EventBridge (CloudWatch Events) with a Lambda function to schedule exports:

```javascript
// Lambda function triggered on a schedule
exports.handler = async (event) => {
  const dynamodb = new AWS.DynamoDB();
  const tables = ['Orders', 'Users', 'Products'];

  for (const tableName of tables) {
    const tableArn = `arn:aws:dynamodb:us-east-1:123456789:table/${tableName}`;
    const date = new Date().toISOString().slice(0, 10);

    await dynamodb.exportTableToPointInTime({
      TableArn: tableArn,
      S3Bucket: 'my-exports-bucket',
      S3Prefix: `scheduled-exports/${tableName}/${date}/`,
      ExportFormat: 'DYNAMODB_JSON'
    }).promise();

    console.log(`Started export for ${tableName}`);
  }
};
```

## Monitoring Exports

Track export status and duration. Failed exports can mean missing data for analytics pipelines. Set up alerts with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to get notified when exports fail or take longer than expected.

## Wrapping Up

DynamoDB's native export to S3 is the best option for most use cases. It doesn't consume table capacity, provides a consistent snapshot, and handles the heavy lifting. Use custom Scan-based exports when you need a specific format or need to transform data during export. For ongoing data sync, DynamoDB Streams to S3 keeps your data lake current without full exports. And once your data is in S3, Athena lets you run SQL analytics without any additional infrastructure. The native export feature has made this whole workflow much simpler than it used to be.
