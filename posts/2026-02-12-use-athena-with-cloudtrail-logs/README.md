# How to Use Athena with CloudTrail Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, CloudTrail, Security, Logging

Description: Step-by-step guide to querying AWS CloudTrail logs with Amazon Athena for security analysis, audit investigations, and operational troubleshooting.

---

Every API call in your AWS account gets recorded by CloudTrail. Who created that EC2 instance? When was that S3 bucket policy changed? Which IAM user has been making suspicious API calls at 3 AM? The answers are all in CloudTrail - you just need a way to search through them efficiently.

Athena is the natural fit. CloudTrail delivers logs to S3 as JSON files, and Athena can query them directly with SQL. No need to import them into a database or set up an ELK stack. Point Athena at your CloudTrail bucket and start asking questions.

## CloudTrail Log Structure

CloudTrail logs are JSON files organized by account, region, and date:

```
s3://your-cloudtrail-bucket/AWSLogs/123456789012/CloudTrail/us-east-1/2025/01/15/
```

Each file contains an array of events that look like this:

```json
{
  "eventVersion": "1.08",
  "userIdentity": {
    "type": "IAMUser",
    "principalId": "AIDAEXAMPLE",
    "arn": "arn:aws:iam::123456789012:user/alice",
    "accountId": "123456789012",
    "userName": "alice"
  },
  "eventTime": "2025-01-15T14:23:45Z",
  "eventSource": "s3.amazonaws.com",
  "eventName": "PutBucketPolicy",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "198.51.100.42",
  "requestParameters": { ... },
  "responseElements": { ... }
}
```

## Creating the CloudTrail Table

You can create the table manually or let CloudTrail do it from the console. Here's the manual approach with partition projection for best performance:

```sql
-- Create a CloudTrail table with partition projection for automatic partition management
CREATE EXTERNAL TABLE cloudtrail_logs (
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
                creationDate: STRING
            >,
            sessionIssuer: STRUCT<
                type: STRING,
                principalId: STRING,
                arn: STRING,
                accountId: STRING,
                userName: STRING
            >
        >
    >,
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
    readOnly STRING,
    resources ARRAY<STRUCT<
        arn: STRING,
        accountId: STRING,
        type: STRING
    >>,
    eventType STRING,
    apiVersion STRING,
    recipientAccountId STRING,
    serviceEventDetails STRING,
    sharedEventId STRING,
    vpcEndpointId STRING
)
PARTITIONED BY (
    account STRING,
    region STRING,
    year STRING,
    month STRING,
    day STRING
)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
LOCATION 's3://your-cloudtrail-bucket/AWSLogs/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.account.type' = 'enum',
    'projection.account.values' = '123456789012',
    'projection.region.type' = 'enum',
    'projection.region.values' = 'us-east-1,us-west-2,eu-west-1',
    'projection.year.type' = 'integer',
    'projection.year.range' = '2020,2030',
    'projection.month.type' = 'integer',
    'projection.month.range' = '1,12',
    'projection.month.digits' = '2',
    'projection.day.type' = 'integer',
    'projection.day.range' = '1,31',
    'projection.day.digits' = '2',
    'storage.location.template' = 's3://your-cloudtrail-bucket/AWSLogs/${account}/CloudTrail/${region}/${year}/${month}/${day}/'
);
```

Replace the account ID and region values with your actual values. If you have multiple accounts or regions, list them all in the enum values.

## Essential Security Queries

### Who Did What Recently

```sql
-- Find all write actions by a specific user in the last 24 hours
SELECT
    eventTime,
    eventSource,
    eventName,
    sourceIPAddress,
    errorCode
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND day = '12'
    AND userIdentity.userName = 'alice'
    AND readOnly = 'false'
ORDER BY eventTime DESC;
```

### Failed API Calls

Failed calls could indicate brute-force attempts, misconfigured applications, or permission issues:

```sql
-- Find all failed API calls in the last 7 days
SELECT
    eventTime,
    userIdentity.arn as caller,
    eventSource,
    eventName,
    errorCode,
    errorMessage,
    sourceIPAddress
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND day BETWEEN '06' AND '12'
    AND errorCode IS NOT NULL
    AND errorCode != ''
ORDER BY eventTime DESC
LIMIT 200;
```

### Unauthorized Access Attempts

```sql
-- Find Access Denied errors grouped by user and action
SELECT
    userIdentity.arn as caller,
    eventSource,
    eventName,
    COUNT(*) as denied_count
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND errorCode = 'AccessDenied'
GROUP BY userIdentity.arn, eventSource, eventName
ORDER BY denied_count DESC
LIMIT 50;
```

### Console Logins

```sql
-- Track console login activity
SELECT
    eventTime,
    userIdentity.userName,
    sourceIPAddress,
    responseElements,
    userIdentity.sessionContext.attributes.mfaAuthenticated as mfa_used
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND eventName = 'ConsoleLogin'
ORDER BY eventTime DESC;
```

## Infrastructure Change Tracking

### Security Group Changes

```sql
-- Track all security group modifications
SELECT
    eventTime,
    userIdentity.arn as changed_by,
    eventName,
    requestParameters
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND eventSource = 'ec2.amazonaws.com'
    AND eventName IN (
        'AuthorizeSecurityGroupIngress',
        'AuthorizeSecurityGroupEgress',
        'RevokeSecurityGroupIngress',
        'RevokeSecurityGroupEgress',
        'CreateSecurityGroup',
        'DeleteSecurityGroup'
    )
ORDER BY eventTime DESC;
```

### IAM Changes

```sql
-- Monitor IAM policy and user modifications
SELECT
    eventTime,
    userIdentity.arn as changed_by,
    eventName,
    requestParameters
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND eventSource = 'iam.amazonaws.com'
    AND eventName IN (
        'CreateUser', 'DeleteUser',
        'CreateRole', 'DeleteRole',
        'AttachUserPolicy', 'DetachUserPolicy',
        'AttachRolePolicy', 'DetachRolePolicy',
        'PutUserPolicy', 'DeleteUserPolicy',
        'CreateAccessKey', 'DeleteAccessKey'
    )
ORDER BY eventTime DESC;
```

### S3 Bucket Policy Changes

```sql
-- Detect S3 bucket policy and ACL modifications
SELECT
    eventTime,
    userIdentity.arn as changed_by,
    eventName,
    json_extract_scalar(requestParameters, '$.bucketName') as bucket_name,
    sourceIPAddress
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND eventSource = 's3.amazonaws.com'
    AND eventName IN ('PutBucketPolicy', 'DeleteBucketPolicy', 'PutBucketAcl')
ORDER BY eventTime DESC;
```

## Anomaly Detection Queries

### Unusual API Call Volumes

```sql
-- Find users with unusually high API call volumes
SELECT
    userIdentity.arn as caller,
    COUNT(*) as api_calls,
    COUNT(DISTINCT eventName) as unique_actions
FROM cloudtrail_logs
WHERE account = '123456789012'
    AND region = 'us-east-1'
    AND year = '2025'
    AND month = '02'
    AND day = '12'
GROUP BY userIdentity.arn
HAVING COUNT(*) > 1000
ORDER BY api_calls DESC;
```

### API Calls from New IP Addresses

```sql
-- Find API calls from IP addresses not seen in the previous month
WITH recent_ips AS (
    SELECT DISTINCT sourceIPAddress
    FROM cloudtrail_logs
    WHERE account = '123456789012'
        AND region = 'us-east-1'
        AND year = '2025'
        AND month = '01'
),
current_calls AS (
    SELECT
        eventTime,
        userIdentity.arn as caller,
        eventName,
        sourceIPAddress
    FROM cloudtrail_logs
    WHERE account = '123456789012'
        AND region = 'us-east-1'
        AND year = '2025'
        AND month = '02'
        AND day = '12'
)
SELECT
    c.eventTime,
    c.caller,
    c.eventName,
    c.sourceIPAddress
FROM current_calls c
LEFT JOIN recent_ips r ON c.sourceIPAddress = r.sourceIPAddress
WHERE r.sourceIPAddress IS NULL
    AND c.sourceIPAddress != 'AWS Internal'
ORDER BY c.eventTime DESC;
```

## Cost Optimization

CloudTrail logs can get large. A busy account might generate gigabytes of log data per day. To keep Athena query costs manageable:

1. **Always filter on partition columns** (account, region, year, month, day)
2. **Filter on eventSource and eventName early** to narrow results
3. **Use LIMIT** when exploring data
4. **Consider converting to Parquet** for frequently queried log data (see [optimizing with column formats](https://oneuptime.com/blog/post/optimize-athena-queries-with-column-formats-parquet-orc/view))

For even better cost management on Athena, check our dedicated guide on [reducing Athena query costs](https://oneuptime.com/blog/post/reduce-athena-query-costs/view).

## Automating Security Queries

Set up automated queries for daily security reports:

```python
# Run a daily security check query and send results via SNS
import boto3
import json

athena = boto3.client('athena')
sns = boto3.client('sns')

from datetime import datetime, timedelta
yesterday = (datetime.now() - timedelta(days=1)).strftime('%d')
month = datetime.now().strftime('%m')
year = datetime.now().strftime('%Y')

query = f"""
SELECT userIdentity.arn, eventName, errorCode, COUNT(*) as count
FROM cloudtrail_logs
WHERE account = '123456789012' AND region = 'us-east-1'
    AND year = '{year}' AND month = '{month}' AND day = '{yesterday}'
    AND errorCode = 'AccessDenied'
GROUP BY userIdentity.arn, eventName, errorCode
HAVING COUNT(*) > 10
ORDER BY count DESC
"""

# Execute and process results, then send via SNS
response = athena.start_query_execution(
    QueryString=query,
    QueryExecutionContext={'Database': 'default'},
    ResultConfiguration={'OutputLocation': 's3://my-athena-results/security/'}
)

print(f"Query started: {response['QueryExecutionId']}")
```

Combine this with a Lambda function triggered by a CloudWatch Events schedule for daily automated security audits.

## Wrapping Up

Athena and CloudTrail together give you a powerful security and audit tool. The key is using partition projection so you never have to manage partitions manually, and always filtering on date partitions to control query costs. Build a library of your most-used queries and automate the critical ones for continuous security monitoring.

For comprehensive operational monitoring beyond log analysis, check out [Amazon DevOps Guru for operational insights](https://oneuptime.com/blog/post/use-amazon-devops-guru-for-operational-insights/view).
