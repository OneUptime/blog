# How to Enable AWS CloudTrail for API Auditing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudTrail, Security, Auditing

Description: Learn how to enable and configure AWS CloudTrail for comprehensive API auditing, including trail creation, log storage, event analysis, and alerting.

---

Every API call made in your AWS account - every instance launched, every object uploaded, every permission changed - can be recorded. CloudTrail is the service that does this, and it's the foundation of AWS security auditing. Without CloudTrail, you're flying blind. You can't investigate incidents, you can't prove compliance, and you can't answer the question "who did what, and when?"

This guide covers enabling CloudTrail, configuring it for comprehensive coverage, and actually using the data it collects.

## What CloudTrail Records

CloudTrail captures three categories of events:

1. **Management events**: API calls that manage AWS resources (creating EC2 instances, modifying IAM policies, changing S3 bucket settings)
2. **Data events**: API calls that operate on data within resources (S3 GetObject/PutObject, Lambda Invoke)
3. **Insights events**: Unusual API activity patterns (sudden spike in API calls)

By default, AWS provides 90 days of management event history for free in every account. But this isn't a proper trail - it's a view-only history that you can't export, alert on, or keep long-term.

## Step 1: Create an S3 Bucket for Logs

CloudTrail logs need to go somewhere. Create a dedicated bucket:

```bash
# Create a bucket for CloudTrail logs
aws s3 mb s3://my-company-cloudtrail-logs-123456789012 --region us-east-1

# Enable versioning to prevent log tampering
aws s3api put-bucket-versioning \
  --bucket my-company-cloudtrail-logs-123456789012 \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket my-company-cloudtrail-logs-123456789012 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

CloudTrail needs permission to write to this bucket. Apply this bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSCloudTrailAclCheck",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::my-company-cloudtrail-logs-123456789012"
    },
    {
      "Sid": "AWSCloudTrailWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-company-cloudtrail-logs-123456789012/AWSLogs/123456789012/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }
  ]
}
```

```bash
# Apply the bucket policy
aws s3api put-bucket-policy \
  --bucket my-company-cloudtrail-logs-123456789012 \
  --policy file://cloudtrail-bucket-policy.json
```

## Step 2: Create the Trail

```bash
# Create a CloudTrail trail that logs management events across all regions
aws cloudtrail create-trail \
  --name company-audit-trail \
  --s3-bucket-name my-company-cloudtrail-logs-123456789012 \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --include-global-service-events
```

Let's break down those flags:

- **is-multi-region-trail**: Records events from all AWS regions, not just the one where the trail was created
- **enable-log-file-validation**: Creates digest files so you can verify logs haven't been tampered with
- **include-global-service-events**: Captures events from global services like IAM and STS (they happen in us-east-1)

## Step 3: Start Logging

Creating a trail doesn't start it. You need to explicitly enable logging:

```bash
# Start recording events
aws cloudtrail start-logging --name company-audit-trail
```

Verify it's working:

```bash
# Check trail status
aws cloudtrail get-trail-status --name company-audit-trail
```

You should see `IsLogging: true` and a `LatestDeliveryTime` that's recent.

## Step 4: Enable Data Events

Management events are logged by default, but data events (S3 object access, Lambda invocations) are not. Enable them for critical buckets:

```bash
# Enable S3 data events for specific buckets
aws cloudtrail put-event-selectors \
  --trail-name company-audit-trail \
  --event-selectors '[
    {
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": [
        {
          "Type": "AWS::S3::Object",
          "Values": [
            "arn:aws:s3:::production-data-bucket/",
            "arn:aws:s3:::customer-uploads-bucket/"
          ]
        },
        {
          "Type": "AWS::Lambda::Function",
          "Values": ["arn:aws:lambda"]
        }
      ]
    }
  ]'
```

Be careful with S3 data events on high-traffic buckets - they can generate a huge volume of logs and increase costs. Only enable them for buckets that contain sensitive data.

## Step 5: Send Logs to CloudWatch

CloudWatch integration lets you search logs, create metrics, and set up alerts:

```bash
# Create a CloudWatch log group for CloudTrail
aws logs create-log-group --log-group-name /aws/cloudtrail/company-audit-trail

# Create an IAM role for CloudTrail to write to CloudWatch
cat > cloudtrail-cw-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name CloudTrail-CloudWatch-Role \
  --assume-role-policy-document file://cloudtrail-cw-trust.json

aws iam put-role-policy \
  --role-name CloudTrail-CloudWatch-Role \
  --policy-name cloudwatch-logs-write \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "*"
      }
    ]
  }'

# Update the trail to send logs to CloudWatch
aws cloudtrail update-trail \
  --name company-audit-trail \
  --cloud-watch-logs-log-group-arn arn:aws:logs:us-east-1:123456789012:log-group:/aws/cloudtrail/company-audit-trail:* \
  --cloud-watch-logs-role-arn arn:aws:iam::123456789012:role/CloudTrail-CloudWatch-Role
```

## Step 6: Set Up Alerts

Create CloudWatch Metric Filters to alert on suspicious activity:

### Alert on Root Account Usage

```bash
# Create a metric filter for root account API calls
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/company-audit-trail \
  --filter-name RootAccountUsage \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }' \
  --metric-transformations \
    metricName=RootAccountUsageCount,metricNamespace=CloudTrailAlerts,metricValue=1

# Create an alarm
aws cloudwatch put-metric-alarm \
  --alarm-name root-account-used \
  --metric-name RootAccountUsageCount \
  --namespace CloudTrailAlerts \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```

### Alert on IAM Policy Changes

```bash
# Detect IAM policy modifications
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/company-audit-trail \
  --filter-name IAMPolicyChanges \
  --filter-pattern '{ ($.eventName = "DeleteGroupPolicy") || ($.eventName = "DeleteRolePolicy") || ($.eventName = "DeleteUserPolicy") || ($.eventName = "PutGroupPolicy") || ($.eventName = "PutRolePolicy") || ($.eventName = "PutUserPolicy") || ($.eventName = "CreatePolicy") || ($.eventName = "DeletePolicy") || ($.eventName = "AttachRolePolicy") || ($.eventName = "DetachRolePolicy") || ($.eventName = "AttachUserPolicy") || ($.eventName = "DetachUserPolicy") || ($.eventName = "AttachGroupPolicy") || ($.eventName = "DetachGroupPolicy") }' \
  --metric-transformations \
    metricName=IAMPolicyChangeCount,metricNamespace=CloudTrailAlerts,metricValue=1
```

### Alert on Console Sign-In Without MFA

```bash
# Detect console logins without MFA
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/company-audit-trail \
  --filter-name ConsoleSignInWithoutMFA \
  --filter-pattern '{ ($.eventName = "ConsoleLogin") && ($.additionalEventData.MFAUsed != "Yes") }' \
  --metric-transformations \
    metricName=ConsoleLoginWithoutMFA,metricNamespace=CloudTrailAlerts,metricValue=1
```

## Querying CloudTrail Events

### Using the CLI

```bash
# Look up recent events by username
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=jane \
  --max-items 10

# Look up events by event name
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteBucket \
  --start-time "2026-02-01" \
  --end-time "2026-02-12"

# Look up events by resource
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::S3::Bucket
```

### Using Athena for Deep Analysis

For complex queries, set up Athena to query CloudTrail logs directly in S3:

```sql
-- Create the CloudTrail table in Athena
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
    resources ARRAY<STRUCT<
        arn: STRING,
        accountId: STRING,
        type: STRING
    >>,
    eventType STRING,
    recipientAccountId STRING
)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
LOCATION 's3://my-company-cloudtrail-logs-123456789012/AWSLogs/123456789012/CloudTrail/';
```

Now run queries:

```sql
-- Find all access denied events in the last 7 days
SELECT
    eventTime,
    userIdentity.arn,
    eventName,
    errorCode,
    sourceIPAddress
FROM cloudtrail_logs
WHERE errorCode = 'AccessDenied'
    AND eventTime > date_format(date_add('day', -7, now()), '%Y-%m-%dT%H:%i:%sZ')
ORDER BY eventTime DESC
LIMIT 50;

-- Find who deleted S3 objects
SELECT
    eventTime,
    userIdentity.arn AS who,
    requestParameters AS what_was_deleted,
    sourceIPAddress
FROM cloudtrail_logs
WHERE eventName = 'DeleteObject'
    AND eventSource = 's3.amazonaws.com'
ORDER BY eventTime DESC
LIMIT 20;
```

## Log Integrity Validation

CloudTrail creates digest files that you can use to verify logs haven't been modified:

```bash
# Validate CloudTrail log integrity
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:us-east-1:123456789012:trail/company-audit-trail \
  --start-time "2026-02-01T00:00:00Z" \
  --end-time "2026-02-12T00:00:00Z"
```

This checks every log file against its digest. If any file has been modified or deleted, the validation will report it.

## Cost Considerations

- **Management events**: First copy of management events is free. Additional copies are $2.00 per 100,000 events.
- **Data events**: $0.10 per 100,000 events. High-traffic S3 buckets can generate millions of events per day.
- **S3 storage**: CloudTrail logs are compressed but can still be significant. Set up lifecycle policies.
- **Insights events**: $0.35 per 100,000 events analyzed.

Set up S3 lifecycle rules to manage costs:

```bash
# Move logs to Glacier after 90 days, delete after 1 year
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-company-cloudtrail-logs-123456789012 \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "archive-old-logs",
        "Status": "Enabled",
        "Filter": {"Prefix": "AWSLogs/"},
        "Transitions": [
          {"Days": 90, "StorageClass": "GLACIER"}
        ],
        "Expiration": {"Days": 365}
      }
    ]
  }'
```

## Protecting CloudTrail

CloudTrail itself needs to be protected. An attacker's first move is often to disable logging:

```json
{
  "Sid": "DenyCloudTrailModification",
  "Effect": "Deny",
  "Action": [
    "cloudtrail:DeleteTrail",
    "cloudtrail:StopLogging",
    "cloudtrail:UpdateTrail",
    "cloudtrail:PutEventSelectors"
  ],
  "Resource": "arn:aws:cloudtrail:*:123456789012:trail/company-audit-trail",
  "Condition": {
    "StringNotEquals": {
      "aws:PrincipalArn": "arn:aws:iam::123456789012:role/SecurityAdmin"
    }
  }
}
```

This SCP or IAM policy prevents anyone except the SecurityAdmin role from modifying or disabling the trail.

CloudTrail is non-negotiable for any serious AWS deployment. Enable it on day one, send logs to both S3 and CloudWatch, set up alerts for suspicious activity, and protect the trail itself from tampering. For multi-region coverage, see our guide on [creating CloudTrail trails for multi-region logging](https://oneuptime.com/blog/post/create-cloudtrail-trails-multi-region-logging/view).
