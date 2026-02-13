# How to Query CloudTrail Logs with Athena

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudTrail, Athena, Security, SQL

Description: Learn how to use Amazon Athena to run SQL queries against your CloudTrail logs for security investigations, auditing, and operational troubleshooting.

---

CloudTrail logs are incredibly valuable, but they're pretty useless sitting as compressed JSON files in an S3 bucket. You can browse them one at a time in the CloudTrail console, but that's painfully slow when you're trying to investigate something. What you really want is the ability to run SQL queries against months of API activity data. That's exactly what Athena gives you.

Athena is a serverless query engine that lets you run SQL against data in S3. You don't need to set up any infrastructure, load data into a database, or manage servers. You just point it at your CloudTrail logs, define a table schema, and start querying. You pay per query based on how much data gets scanned.

## Setting Up the Athena Table

The fastest way to create your CloudTrail table is through the CloudTrail console itself. Go to CloudTrail, click "Event history," then click "Create Athena table." It generates the DDL for you.

But if you want to do it manually (or understand what's happening), here's the full table definition.

```sql
-- Create a database for your CloudTrail analysis
CREATE DATABASE IF NOT EXISTS security_logs;

-- Create the CloudTrail table pointing to your S3 logs
CREATE EXTERNAL TABLE security_logs.cloudtrail_logs (
    eventVersion STRING,
    userIdentity STRUCT<
        type: STRING,
        principalId: STRING,
        arn: STRING,
        accountId: STRING,
        invokedBy: STRING,
        accessKeyId: STRING,
        userName: STRING,
        sessionContext: STRUCT<
            attributes: STRUCT<
                mfaAuthenticated: STRING,
                creationDate: STRING>,
            sessionIssuer: STRUCT<
                type: STRING,
                principalId: STRING,
                arn: STRING,
                accountId: STRING,
                userName: STRING>,
            ec2RoleDelivery: STRING,
            webIdFederationData: MAP<STRING,STRING>>>,
    eventTime STRING,
    eventSource STRING,
    eventName STRING,
    awsRegion STRING,
    sourceIPAddress STRING,
    userAgent STRING,
    errorCode STRING,
    errorMessage STRING,
    requestParameters STRING,
    responseElements STRING,
    additionalEventData STRING,
    requestId STRING,
    eventId STRING,
    resources ARRAY<STRUCT<
        arn: STRING,
        accountId: STRING,
        type: STRING>>,
    eventType STRING,
    apiVersion STRING,
    readOnly STRING,
    recipientAccountId STRING,
    serviceEventDetails STRING,
    sharedEventID STRING,
    vpcEndpointId STRING,
    tlsDetails STRUCT<
        tlsVersion: STRING,
        cipherSuite: STRING,
        clientProvidedHostHeader: STRING>
)
COMMENT 'CloudTrail table for security_logs'
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://my-cloudtrail-bucket/AWSLogs/111111111111/CloudTrail/'
TBLPROPERTIES ('classification'='cloudtrail');
```

Replace the S3 location with where your CloudTrail logs actually live. If you're using an [organization trail](https://oneuptime.com/blog/post/2026-02-12-cloudtrail-organization-trails/view), the path will include your organization ID.

## Adding Partitions for Performance

Without partitions, every query scans all your data. If you've got years of logs, that's expensive and slow. Partitioning by date lets Athena skip data it doesn't need.

Here's a partitioned version of the table.

```sql
CREATE EXTERNAL TABLE security_logs.cloudtrail_partitioned (
    eventVersion STRING,
    userIdentity STRUCT<
        type: STRING,
        principalId: STRING,
        arn: STRING,
        accountId: STRING,
        invokedBy: STRING,
        accessKeyId: STRING,
        userName: STRING,
        sessionContext: STRUCT<
            attributes: STRUCT<
                mfaAuthenticated: STRING,
                creationDate: STRING>,
            sessionIssuer: STRUCT<
                type: STRING,
                principalId: STRING,
                arn: STRING,
                accountId: STRING,
                userName: STRING>>>,
    eventTime STRING,
    eventSource STRING,
    eventName STRING,
    awsRegion STRING,
    sourceIPAddress STRING,
    userAgent STRING,
    errorCode STRING,
    errorMessage STRING,
    requestParameters STRING,
    responseElements STRING,
    requestId STRING,
    eventId STRING,
    readOnly STRING,
    resources ARRAY<STRUCT<arn:STRING,accountId:STRING,type:STRING>>,
    eventType STRING,
    recipientAccountId STRING
)
PARTITIONED BY (
    account STRING,
    region STRING,
    year STRING,
    month STRING,
    day STRING
)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://my-cloudtrail-bucket/AWSLogs/'
TBLPROPERTIES ('classification'='cloudtrail');
```

Then use the partition projection feature so you don't have to manually add partitions every day.

```sql
ALTER TABLE security_logs.cloudtrail_partitioned SET TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.account.type' = 'enum',
  'projection.account.values' = '111111111111,222222222222',
  'projection.region.type' = 'enum',
  'projection.region.values' = 'us-east-1,us-west-2,eu-west-1',
  'projection.year.type' = 'integer',
  'projection.year.range' = '2024,2026',
  'projection.month.type' = 'integer',
  'projection.month.range' = '01,12',
  'projection.month.digits' = '2',
  'projection.day.type' = 'integer',
  'projection.day.range' = '01,31',
  'projection.day.digits' = '2',
  'storage.location.template' = 's3://my-cloudtrail-bucket/AWSLogs/${account}/CloudTrail/${region}/${year}/${month}/${day}'
);
```

## Useful Security Queries

Here are the queries you'll actually use day to day.

### Find All Console Logins Without MFA

This one's a classic. Find anyone logging into the console without multi-factor authentication.

```sql
SELECT
    eventTime,
    userIdentity.userName,
    sourceIPAddress,
    userIdentity.arn,
    responseElements
FROM security_logs.cloudtrail_logs
WHERE eventName = 'ConsoleLogin'
    AND additionalEventData LIKE '%"MFAUsed":"No"%'
ORDER BY eventTime DESC
LIMIT 100;
```

### Find IAM Access Key Usage from Unusual IPs

Track where your access keys are being used from. Useful for detecting compromised credentials.

```sql
SELECT
    userIdentity.accessKeyId,
    userIdentity.arn,
    sourceIPAddress,
    COUNT(*) AS request_count,
    MIN(eventTime) AS first_seen,
    MAX(eventTime) AS last_seen
FROM security_logs.cloudtrail_logs
WHERE userIdentity.accessKeyId IS NOT NULL
    AND eventTime >= '2026-02-01T00:00:00Z'
GROUP BY userIdentity.accessKeyId, userIdentity.arn, sourceIPAddress
ORDER BY request_count DESC
LIMIT 50;
```

### Find All Security Group Changes

Track who's modifying security groups - one of the most common sources of security incidents.

```sql
SELECT
    eventTime,
    userIdentity.arn AS who,
    eventName,
    awsRegion,
    requestParameters
FROM security_logs.cloudtrail_logs
WHERE eventSource = 'ec2.amazonaws.com'
    AND eventName IN (
        'AuthorizeSecurityGroupIngress',
        'AuthorizeSecurityGroupEgress',
        'RevokeSecurityGroupIngress',
        'RevokeSecurityGroupEgress',
        'CreateSecurityGroup',
        'DeleteSecurityGroup'
    )
ORDER BY eventTime DESC
LIMIT 100;
```

### Find Unauthorized API Calls

Lots of AccessDenied errors from one identity might indicate an attacker probing your environment.

```sql
SELECT
    userIdentity.arn,
    eventSource,
    eventName,
    errorCode,
    COUNT(*) AS error_count
FROM security_logs.cloudtrail_logs
WHERE errorCode IN ('AccessDenied', 'UnauthorizedAccess', 'Client.UnauthorizedAccess')
    AND eventTime >= '2026-02-01T00:00:00Z'
GROUP BY userIdentity.arn, eventSource, eventName, errorCode
HAVING COUNT(*) > 10
ORDER BY error_count DESC;
```

### Find Root Account Usage

Root account activity should be rare. If it's not, something's wrong.

```sql
SELECT
    eventTime,
    eventName,
    eventSource,
    sourceIPAddress,
    userAgent,
    errorCode
FROM security_logs.cloudtrail_logs
WHERE userIdentity.type = 'Root'
    AND userIdentity.invokedBy IS NULL
    AND eventType != 'AwsServiceEvent'
ORDER BY eventTime DESC;
```

## Cost Optimization Tips

Athena charges $5 per TB of data scanned. Here's how to keep costs down:

1. **Use partitions** - This is the biggest win. Querying one day instead of a year can reduce costs by 99%.
2. **Convert to Parquet** - Use a CTAS query to convert JSON logs to Parquet format, which is columnar and compresses better.
3. **Use column projection** - Only SELECT the columns you need instead of using `SELECT *`.
4. **Set date filters early** - Put your date conditions in the WHERE clause so Athena can skip irrelevant partitions.

Here's how to create a Parquet version of your logs for cheaper queries.

```sql
-- Create a Parquet-formatted table from your JSON logs
CREATE TABLE security_logs.cloudtrail_parquet
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-athena-results/cloudtrail-parquet/'
) AS
SELECT
    eventTime,
    userIdentity.arn AS userArn,
    userIdentity.accountId,
    eventSource,
    eventName,
    awsRegion,
    sourceIPAddress,
    errorCode,
    readOnly,
    requestParameters
FROM security_logs.cloudtrail_logs
WHERE eventTime >= '2026-01-01T00:00:00Z';
```

## Automating Queries

You probably don't want to run these queries manually every day. Use EventBridge with a Lambda function to run queries on a schedule.

```python
import boto3

athena = boto3.client('athena')

def lambda_handler(event, context):
    # Run a query to find unauthorized access attempts
    response = athena.start_query_execution(
        QueryString="""
            SELECT userIdentity.arn, COUNT(*) as errors
            FROM security_logs.cloudtrail_logs
            WHERE errorCode = 'AccessDenied'
              AND eventTime >= date_format(date_add('day', -1, now()), '%Y-%m-%dT%H:%i:%sZ')
            GROUP BY userIdentity.arn
            HAVING COUNT(*) > 50
        """,
        QueryExecutionContext={'Database': 'security_logs'},
        ResultConfiguration={
            'OutputLocation': 's3://my-athena-results/scheduled-queries/'
        }
    )
    return response['QueryExecutionId']
```

## Wrapping Up

Athena turns your CloudTrail logs from a compliance checkbox into an actual investigation tool. The setup takes about 15 minutes, and once you've got the table and a few saved queries, you can answer questions like "who deleted that S3 bucket last Tuesday" in seconds instead of hours.

For real-time alerting rather than after-the-fact queries, check out how to [set up alerts for specific CloudTrail events](https://oneuptime.com/blog/post/2026-02-12-alerts-specific-cloudtrail-events/view) using CloudWatch. And if you want anomaly detection without writing queries yourself, look into [CloudTrail Insights](https://oneuptime.com/blog/post/2026-02-12-cloudtrail-insights-anomaly-detection/view).
