# How to Set Up AWS Data Exchange for Third-Party Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Data Exchange, Data Integration, Cloud

Description: Learn how to set up AWS Data Exchange to discover, subscribe to, and use third-party data products directly within your AWS environment.

---

If you've ever tried to wrangle third-party data into your analytics pipeline, you know it's a pain. You're dealing with FTP servers, API keys, custom ingestion scripts, and formats that never quite match what you expected. AWS Data Exchange was built to fix exactly this problem. It gives you a marketplace where you can subscribe to curated data products and pull them straight into your AWS account - no middleman, no weird file transfers.

In this post, we'll walk through the full setup: finding data products, subscribing to them, exporting datasets to S3, and automating the whole process so you don't have to think about it again.

## What Is AWS Data Exchange?

AWS Data Exchange is a managed service that lets data providers publish their datasets, and data consumers (that's you) subscribe to them. Think of it like an app store, but for data. The datasets get delivered right into your AWS environment, usually as files in S3 or through API-based access.

Some common use cases include:

- Financial market data feeds
- Weather and climate datasets
- Healthcare and demographics data
- Geospatial information
- Economic indicators

The beauty of it is that once you subscribe, updates flow in automatically. No more chasing vendors for the latest quarterly refresh.

## Prerequisites

Before you get started, make sure you have:

- An AWS account with appropriate IAM permissions
- An S3 bucket where you want to store imported datasets
- The AWS CLI installed and configured (see our post on [setting up AWS CLI named profiles](https://oneuptime.com/blog/post/aws-cli-named-profiles/view))

You'll need these IAM permissions at minimum:

Here's the IAM policy you'll want to attach to your user or role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dataexchange:*",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "*"
    }
  ]
}
```

In production, you'll want to scope those S3 permissions down to your specific bucket ARN. But this works for getting started.

## Step 1: Browse the Data Exchange Catalog

Head to the AWS Data Exchange console and click "Browse catalog." You'll find thousands of data products from providers like Reuters, Foursquare, Dun & Bradstreet, and plenty of others.

You can filter by:

- Category (financial, healthcare, weather, etc.)
- Provider
- Price (there are free datasets too)
- Data delivery method (S3 files, API, or Amazon Redshift)

Let's say you want weather data. Search for "weather" and you'll see options from providers like DTN, Tomorrow.io, and others. Each listing shows a description, sample data, pricing, and the terms of use.

## Step 2: Subscribe to a Data Product

Once you find something useful, click on the product and hit "Continue to subscribe." You'll review the pricing and the data subscription agreement. Some datasets are free, others charge monthly or per-query fees.

After you accept the terms, AWS processes your subscription request. For free products, this is instant. For paid ones, the provider might need to approve your request first.

You can also subscribe via the CLI.

```bash
# List available data sets for a specific product
aws dataexchange list-data-sets \
  --query "DataSets[].{Name:Name, Id:Id}" \
  --output table

# Create a subscription to a data set
aws dataexchange create-data-set \
  --asset-type S3_SNAPSHOT \
  --description "Weather data feed" \
  --name "weather-data-2026"
```

## Step 3: Export Data to S3

Once subscribed, you'll see your entitled data sets under "Entitled data" in the console. Each data set contains one or more revisions, and each revision contains assets (the actual files).

To export data to S3, you create an export job.

```bash
# Create an export job to move data to your S3 bucket
aws dataexchange create-job \
  --type EXPORT_REVISIONS_TO_S3 \
  --details '{
    "ExportRevisionsToS3": {
      "DataSetId": "your-dataset-id",
      "RevisionDestinations": [
        {
          "RevisionId": "your-revision-id",
          "Bucket": "my-data-exchange-bucket",
          "KeyPattern": "weather-data/${Revision.CreatedAt.Year}/${Revision.Id}/"
        }
      ]
    }
  }'

# Start the job
aws dataexchange start-job --job-id "your-job-id"

# Check job status
aws dataexchange get-job --job-id "your-job-id" \
  --query "State"
```

The key pattern is helpful for organizing files by date or revision. You can use variables like `${Revision.CreatedAt.Year}`, `${Revision.CreatedAt.Month}`, and `${Revision.Id}`.

## Step 4: Automate with EventBridge

Here's where it gets really useful. AWS Data Exchange publishes events to Amazon EventBridge whenever a new revision is published for a dataset you're subscribed to. You can set up a rule that automatically exports new data to S3 the moment it arrives.

This CloudFormation snippet sets up the automation.

```yaml
# CloudFormation template for automated data export
Resources:
  DataExchangeRule:
    Type: AWS::Events::Rule
    Properties:
      Name: auto-export-data-exchange
      Description: "Trigger export when new revision is published"
      EventPattern:
        source:
          - "aws.dataexchange"
        detail-type:
          - "Revision Published To Data Set"
        detail:
          DataSetId:
            - "your-dataset-id"
      State: ENABLED
      Targets:
        - Arn: !GetAtt ExportFunction.Arn
          Id: "ExportTarget"

  ExportFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: data-exchange-auto-export
      Runtime: python3.12
      Handler: index.handler
      Timeout: 300
      Role: !GetAtt LambdaRole.Arn
      Code:
        ZipFile: |
          import boto3
          import json

          def handler(event, context):
              client = boto3.client('dataexchange')
              detail = event['detail']

              # Create an export job for the new revision
              response = client.create_job(
                  Type='EXPORT_REVISIONS_TO_S3',
                  Details={
                      'ExportRevisionsToS3': {
                          'DataSetId': detail['DataSetId'],
                          'RevisionDestinations': [{
                              'RevisionId': detail['RevisionId'],
                              'Bucket': 'my-data-exchange-bucket',
                              'KeyPattern': 'auto-export/${Revision.CreatedAt.Year}/${Revision.CreatedAt.Month}/'
                          }]
                      }
                  }
              )

              # Start the export job
              client.start_job(JobId=response['Id'])
              return {'statusCode': 200, 'jobId': response['Id']}
```

With this in place, every time the data provider publishes a new revision, your Lambda function kicks off an export. The data lands in your S3 bucket without you lifting a finger.

## Step 5: Query the Data with Athena or Redshift

Once the data sits in S3, you can query it with whatever tool you prefer. Amazon Athena is a great choice for ad-hoc queries since it's serverless and works directly on S3 data.

Set up an Athena table that points to your exported data.

```sql
-- Create an Athena table pointing to your exported data
CREATE EXTERNAL TABLE weather_data (
  station_id STRING,
  timestamp BIGINT,
  temperature DOUBLE,
  humidity DOUBLE,
  wind_speed DOUBLE,
  precipitation DOUBLE
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
LOCATION 's3://my-data-exchange-bucket/auto-export/'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Query recent weather data
SELECT station_id,
       FROM_UNIXTIME(timestamp) as reading_time,
       temperature,
       humidity
FROM weather_data
WHERE temperature > 30
ORDER BY timestamp DESC
LIMIT 100;
```

## Monitoring Your Subscriptions

You should keep an eye on your Data Exchange usage, especially for paid subscriptions. CloudWatch metrics can help here. You can track export job failures, data freshness, and costs.

For monitoring your AWS infrastructure more broadly, tools like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) can give you a unified view of your services' health.

## Cost Considerations

A few things to watch out for:

- **Subscription fees** vary wildly. Some datasets are free, others cost thousands per month.
- **Data transfer costs** apply when exporting to S3 (standard S3 PUT pricing).
- **Storage costs** for the data sitting in S3.
- **Query costs** if you're using Athena or Redshift to analyze the data.

Start with free datasets to get comfortable with the workflow before committing to expensive subscriptions.

## Wrapping Up

AWS Data Exchange takes the friction out of working with third-party data. Instead of building custom integrations for every data provider, you get a single, consistent interface. The EventBridge integration is the real game-changer - set it up once and fresh data appears in your bucket automatically.

The hardest part is honestly just picking which datasets to subscribe to. The catalog has grown significantly, and there's good stuff in there for almost every industry. Start small, automate the export, and build from there.
