# How to Use Macie to Find PII in S3 Buckets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Macie, S3, PII, Data Privacy

Description: A practical guide to using Amazon Macie to discover personally identifiable information in S3 buckets, including configuring jobs, interpreting findings, and building automated remediation.

---

Personally identifiable information showing up where it shouldn't is a recipe for a compliance violation - or worse, a data breach. Under GDPR, CCPA, HIPAA, and similar regulations, organizations are required to know where PII lives and protect it appropriately. The problem is that PII tends to scatter across S3 buckets through data exports, application uploads, backup jobs, and developer testing.

Amazon Macie can systematically scan your S3 data and tell you exactly where PII is hiding. Let's walk through configuring Macie specifically for PII discovery, interpreting what it finds, and automating the response.

## What PII Does Macie Detect?

Macie's managed data identifiers can find dozens of PII types across multiple categories.

**Personal identifiers:**
- Social Security Numbers (US)
- National Insurance Numbers (UK)
- Tax File Numbers (Australia)
- Passport numbers (multiple countries)
- Driver's license numbers

**Contact information:**
- Email addresses
- Phone numbers
- Physical addresses (US)
- Names (first, last, full)

**Financial data:**
- Credit/debit card numbers
- Bank account numbers
- IBAN numbers

**Health data:**
- Health insurance claim numbers
- Medical record numbers
- National Drug Codes
- DEA registration numbers

**Technical identifiers:**
- IP addresses
- MAC addresses
- AWS secret access keys

## Setting Up a PII-Focused Discovery Job

Rather than scanning everything, create a job specifically targeting buckets that are likely to contain PII.

```bash
# Create a PII-focused classification job
aws macie2 create-classification-job \
  --job-type ONE_TIME \
  --name "pii-scan-customer-data" \
  --s3-job-definition '{
    "bucketDefinitions": [
      {
        "accountId": "123456789012",
        "buckets": [
          "customer-data-bucket",
          "user-uploads",
          "crm-exports",
          "support-tickets"
        ]
      }
    ],
    "scoping": {
      "includes": {
        "and": [
          {
            "simpleScopeTerm": {
              "comparator": "CONTAINS",
              "key": "OBJECT_EXTENSION",
              "values": ["csv", "json", "xlsx", "txt", "pdf", "doc", "docx"]
            }
          }
        ]
      },
      "excludes": {
        "and": [
          {
            "simpleScopeTerm": {
              "comparator": "GT",
              "key": "OBJECT_SIZE",
              "values": ["524288000"]
            }
          }
        ]
      }
    }
  }' \
  --managed-data-identifier-selector INCLUDE \
  --managed-data-identifier-ids '[
    "CREDIT_CARD_NUMBER",
    "CREDIT_CARD_EXPIRATION",
    "US_SOCIAL_SECURITY_NUMBER",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "US_PASSPORT_NUMBER",
    "US_DRIVER_LICENSE",
    "ADDRESS",
    "NAME",
    "DATE_OF_BIRTH",
    "BANK_ACCOUNT_NUMBER",
    "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER"
  ]' \
  --description "Targeted scan for PII in customer-facing data stores"
```

By specifying `managed-data-identifier-ids`, you can focus on the specific PII types relevant to your compliance requirements rather than scanning for everything.

## Monitoring Job Progress

Discovery jobs can take a while for large buckets. Track progress through the API.

```bash
# Check job status
aws macie2 describe-classification-job \
  --job-id "job-id-123" \
  --query '{Status:jobStatus,ObjectsProcessed:statistics.approximateNumberOfObjectsToProcess}'

# List all running jobs
aws macie2 list-classification-jobs \
  --filter-criteria '{
    "includes": [
      {
        "comparator": "EQ",
        "key": "jobStatus",
        "values": ["RUNNING"]
      }
    ]
  }'
```

## Interpreting PII Findings

Once the job completes, examine the findings. Each finding tells you what type of PII was found, where it was found, and how much of it exists.

```bash
# Get PII-specific findings
aws macie2 list-findings \
  --finding-criteria '{
    "criterion": {
      "category": {
        "eq": ["CLASSIFICATION"]
      },
      "classificationDetails.result.sensitiveData.detections.type": {
        "eq": ["PII"]
      }
    }
  }' \
  --sort-criteria '{"attributeName": "severity.score", "orderBy": "DESC"}' \
  --max-results 20
```

For detailed information about a specific finding.

```bash
# Get full finding details
FINDINGS=$(aws macie2 get-findings \
  --finding-ids '["finding-id-here"]' \
  --query 'findings[0]')

echo "$FINDINGS" | jq '{
  severity: .severity.description,
  bucket: .resourcesAffected.s3Bucket.name,
  object: .resourcesAffected.s3Object.key,
  piiTypes: .classificationDetails.result.sensitiveData[].detections[].type,
  count: .classificationDetails.result.sensitiveData[].totalCount
}'
```

## Understanding Severity Levels

Macie assigns severity based on the type and quantity of PII found:

- **High** - Large volumes of highly sensitive data like SSNs, credit card numbers, or health data
- **Medium** - Moderate volumes or less sensitive types like email addresses and names
- **Low** - Small amounts or low-sensitivity data

The severity is also influenced by the bucket's security configuration. PII in a public bucket gets a higher severity than PII in an encrypted, private bucket.

## Building an Automated Response

When Macie finds PII, you probably want to do something about it automatically. Here's an architecture using EventBridge and Lambda.

```python
import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
sns_client = boto3.client('sns')

ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:pii-alerts'
QUARANTINE_BUCKET = 'quarantine-bucket'


def lambda_handler(event, context):
    """Handle Macie PII findings from EventBridge."""
    detail = event['detail']

    severity = detail['severity']['description']
    bucket = detail['resourcesAffected']['s3Bucket']['name']
    obj_key = detail['resourcesAffected']['s3Object']['key']

    # Get PII types found
    pii_types = []
    for data_group in detail.get('classificationDetails', {}).get('result', {}).get('sensitiveData', []):
        for detection in data_group.get('detections', []):
            pii_types.append(detection['type'])

    logger.info(f"PII found: {pii_types} in s3://{bucket}/{obj_key} (severity: {severity})")

    if severity == 'High':
        # For high severity: quarantine the object
        quarantine_object(bucket, obj_key)

        # Alert the security team
        alert_message = {
            'action': 'QUARANTINED',
            'bucket': bucket,
            'key': obj_key,
            'pii_types': pii_types,
            'severity': severity
        }
        sns_client.publish(
            TopicArn=ALERT_TOPIC,
            Subject=f"HIGH PII Alert: Object quarantined from {bucket}",
            Message=json.dumps(alert_message, indent=2)
        )
    elif severity == 'Medium':
        # For medium severity: alert but don't quarantine
        sns_client.publish(
            TopicArn=ALERT_TOPIC,
            Subject=f"PII Detected in {bucket}",
            Message=json.dumps({
                'bucket': bucket,
                'key': obj_key,
                'pii_types': pii_types,
                'severity': severity,
                'action_needed': 'Review and remediate'
            }, indent=2)
        )

    return {'statusCode': 200}


def quarantine_object(source_bucket, key):
    """Move an object to the quarantine bucket."""
    try:
        # Copy to quarantine
        s3_client.copy_object(
            Bucket=QUARANTINE_BUCKET,
            Key=f"{source_bucket}/{key}",
            CopySource={'Bucket': source_bucket, 'Key': key}
        )

        # Add a tag to mark it
        s3_client.put_object_tagging(
            Bucket=QUARANTINE_BUCKET,
            Key=f"{source_bucket}/{key}",
            Tagging={
                'TagSet': [
                    {'Key': 'QuarantineReason', 'Value': 'PII-Detected'},
                    {'Key': 'SourceBucket', 'Value': source_bucket}
                ]
            }
        )

        # Delete from source
        s3_client.delete_object(
            Bucket=source_bucket,
            Key=key
        )

        logger.info(f"Quarantined s3://{source_bucket}/{key}")
    except Exception as e:
        logger.error(f"Failed to quarantine: {e}")
        raise
```

Wire it up with EventBridge.

```hcl
resource "aws_cloudwatch_event_rule" "macie_pii" {
  name = "macie-pii-findings"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      type = ["SensitiveData:S3Object/Personal"]
    }
  })
}

resource "aws_cloudwatch_event_target" "pii_handler" {
  rule = aws_cloudwatch_event_rule.macie_pii.name
  arn  = aws_lambda_function.pii_handler.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pii_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.macie_pii.arn
}
```

## Custom PII Identifiers

If your organization has custom PII formats, create custom data identifiers.

```bash
# Custom identifier for internal patient IDs
aws macie2 create-custom-data-identifier \
  --name "PatientID" \
  --regex "PAT-[0-9]{8}-[A-Z]{2}" \
  --keywords '["patient", "medical record", "health"]' \
  --description "Internal patient identifier format"

# Custom identifier for membership numbers
aws macie2 create-custom-data-identifier \
  --name "MembershipNumber" \
  --regex "MEM-[A-Z]{2}-[0-9]{7}" \
  --keywords '["member", "membership", "subscriber"]' \
  --description "Customer membership number"
```

## Generating PII Reports

For compliance reporting, you can export Macie findings to S3.

```bash
# Configure findings export to S3
aws macie2 put-findings-publication-configuration \
  --security-hub-configuration '{"publishClassificationFindings": true, "publishPolicyFindings": true}' \
  --client-token "$(uuidgen)"
```

You can also query findings programmatically to build custom reports.

```bash
# Get a count of PII findings by type
aws macie2 get-finding-statistics \
  --group-by "classificationDetails.result.sensitiveData.detections.type" \
  --finding-criteria '{
    "criterion": {
      "category": {"eq": ["CLASSIFICATION"]},
      "updatedAt": {"gte": 1706745600}
    }
  }'
```

For the broader Macie setup including automated discovery, check our guide on [enabling Macie for S3](https://oneuptime.com/blog/post/2026-02-12-enable-amazon-macie-s3-data-discovery/view). And if you want automated discovery running continuously, see [configuring Macie automated discovery](https://oneuptime.com/blog/post/2026-02-12-configure-macie-automated-sensitive-data-discovery/view).

## Wrapping Up

Finding PII in your S3 buckets is the first step toward data privacy compliance. Macie makes the discovery part straightforward - point it at your buckets and it tells you what's there. The harder part is deciding what to do with the findings. Start with alerting, then build toward automated remediation for high-severity cases. And run scans regularly - PII has a tendency to show up in new places over time.
