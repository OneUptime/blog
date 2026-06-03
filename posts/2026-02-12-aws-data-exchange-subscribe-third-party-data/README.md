# How to Use AWS Data Exchange to Subscribe to Third-Party Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Data Exchange, Data Marketplace

Description: Learn how to discover, subscribe to, and integrate third-party datasets from AWS Data Exchange into your analytics workflows and data lake.

---

Building a complete picture of your business often requires data you don't generate yourself - weather data, financial market feeds, demographic information, geospatial data, or industry benchmarks. AWS Data Exchange is a marketplace where data providers publish datasets and you can subscribe to them, getting the data delivered directly to your AWS account.

It's essentially an app store for data. You browse the catalog, subscribe to a product, and the data shows up in your S3 bucket or through an API. No FTP servers, no manual downloads, no emailing vendors for updates.

## Finding Data Products

You can browse the Data Exchange catalog through the console or the AWS Marketplace. The AWS Data Exchange API lists data sets that you own or are entitled to after a subscription:

```bash
# List data sets that are entitled to your account through subscriptions
aws dataexchange list-data-sets \
    --origin "ENTITLED" \
    --query "DataSets[?OriginDetails.ProductId!=null]" \
    --output table
```

In practice, most people browse the Data Exchange console or the AWS Marketplace website to find products. The catalog includes data from providers like Reuters, Foursquare, Dun & Bradstreet, and hundreds of others.

## Subscribing to a Data Product

Once you've found a product you want, subscribe to it. Some products are free, others have monthly or annual fees, and some charge based on usage.

Use the AWS Data Exchange console or AWS Marketplace product page to review the offer terms and submit the subscription request. Some products require subscription verification, and paid subscriptions are billed through AWS Marketplace.

After subscribing, you'll see the data sets associated with the product in your Data Exchange console.

## Exporting Data to S3

The most common way to consume Data Exchange data is to export it to an S3 bucket. Here's how to set up an export job:

```bash
# List the data sets available from your subscription
aws dataexchange list-data-sets --output json

# List revisions (versions) for a specific data set
aws dataexchange list-data-set-revisions \
    --data-set-id "8d494cba5e4720e5f6072e280daf70a8" \
    --output json

# List the assets (files) in a revision
aws dataexchange list-revision-assets \
    --data-set-id "8d494cba5e4720e5f6072e280daf70a8" \
    --revision-id "b655d5be3da04fcbdca21a5a2932d789" \
    --output json

# Export the revision assets to your S3 bucket
aws dataexchange create-job \
    --type "EXPORT_REVISIONS_TO_S3" \
    --details '{
        "ExportRevisionsToS3": {
            "DataSetId": "8d494cba5e4720e5f6072e280daf70a8",
            "RevisionDestinations": [
                {
                    "RevisionId": "b655d5be3da04fcbdca21a5a2932d789",
                    "Bucket": "my-data-lake-bucket",
                    "KeyPattern": "third-party-data/weather/${Revision.CreatedAt.Year}/${Revision.CreatedAt.Month}/${Asset.Name}"
                }
            ]
        }
    }'

# Start the export job
aws dataexchange start-job --job-id "6cEXAMPLE818f7c7a23b3d0EXAMPLE1c"
```

The key pattern supports variables that organize files in your S3 bucket. Using the revision creation date as a partition key makes it easy to query with Athena later.

## Automating Data Delivery with EventBridge

Most data providers publish new revisions on a regular schedule. You can automate the export using EventBridge rules:

```bash
# Create an EventBridge rule that triggers when a new revision is published
aws events put-rule \
    --name "data-exchange-new-revision" \
    --event-pattern '{
        "source": ["aws.dataexchange"],
        "detail-type": ["Revision Published To Data Set"],
        "resources": ["8d494cba5e4720e5f6072e280daf70a8"]
    }' \
    --state "ENABLED"

# Target a Lambda function that exports the new revision to S3
aws events put-targets \
    --rule "data-exchange-new-revision" \
    --targets '[
        {
            "Id": "export-to-s3",
            "Arn": "arn:aws:lambda:us-east-1:123456789012:function/export-data-exchange",
            "InputTransformer": {
                "InputPathsMap": {
                    "dataSetId": "$.resources[0]",
                    "revisionId": "$.detail.RevisionIds[0]"
                },
                "InputTemplate": "{\"dataSetId\": \"<dataSetId>\", \"revisionId\": \"<revisionId>\"}"
            }
        }
    ]'
```

Here's the Lambda function that does the export:

```python
# Lambda function to automatically export new Data Exchange revisions to S3
import boto3
import json
import time

def lambda_handler(event, context):
    dx = boto3.client('dataexchange')

    data_set_id = event['dataSetId']
    revision_id = event['revisionId']
    target_bucket = 'my-data-lake-bucket'

    # Create the export job
    response = dx.create_job(
        Type='EXPORT_REVISIONS_TO_S3',
        Details={
            'ExportRevisionsToS3': {
                'DataSetId': data_set_id,
                'RevisionDestinations': [
                    {
                        'RevisionId': revision_id,
                        'Bucket': target_bucket,
                        'KeyPattern': f'third-party-data/{data_set_id}/${{Revision.CreatedAt.Year}}/${{Revision.CreatedAt.Month}}/${{Revision.CreatedAt.Day}}/${{Asset.Name}}'
                    }
                ]
            }
        }
    )

    job_id = response['Id']

    # Start the job
    dx.start_job(JobId=job_id)

    # Wait for completion
    while True:
        job = dx.get_job(JobId=job_id)
        state = job['State']

        if state == 'COMPLETED':
            print(f"Export completed: {job_id}")
            return {'status': 'SUCCESS', 'jobId': job_id}
        elif state in ['ERROR', 'CANCELLED', 'TIMED_OUT']:
            print(f"Export failed: {job_id} - {job.get('Errors', [])}")
            raise Exception(f"Export job failed: {state}")

        time.sleep(10)
```

## Using API-Based Data Products

Some Data Exchange products deliver data through APIs instead of file-based exports. These work through API Gateway endpoints managed by the provider:

```bash
# List API assets in a revision
aws dataexchange list-revision-assets \
    --data-set-id "8d494cba5e4720e5f6072e280daf70a8" \
    --revision-id "b655d5be3da04fcbdca21a5a2932d789" \
    --query "Assets[?AssetType=='API_GATEWAY_API']"

# Send a request to an API-based data product
aws dataexchange send-api-asset \
    --data-set-id "8d494cba5e4720e5f6072e280daf70a8" \
    --revision-id "b655d5be3da04fcbdca21a5a2932d789" \
    --asset-id "8550cfab16b444a794402f2c3f11eae1" \
    --method "GET" \
    --path "/v1/market-data/AAPL" \
    --query-string-parameters '{"date": "2026-02-12"}'
```

## Integrating with Your Data Lake

After exporting data to S3, you'll want to make it queryable. Create a Glue crawler to catalog the data:

```bash
# Create a Glue crawler for the exported data
aws glue create-crawler \
    --name "third-party-data-crawler" \
    --role "arn:aws:iam::123456789012:role/GlueCrawlerRole" \
    --database-name "third_party_data" \
    --targets '{
        "S3Targets": [
            {
                "Path": "s3://my-data-lake-bucket/third-party-data/",
                "Exclusions": ["**/_SUCCESS", "**/_metadata"]
            }
        ]
    }' \
    --schedule "cron(0 7 * * ? *)" \
    --schema-change-policy '{
        "UpdateBehavior": "UPDATE_IN_DATABASE",
        "DeleteBehavior": "LOG"
    }'

# Run the crawler
aws glue start-crawler --name "third-party-data-crawler"
```

Once cataloged, you can query the third-party data with Athena and join it with your own data:

```sql
-- Join your internal sales data with third-party weather data
-- to analyze weather impact on sales
SELECT
    s.sale_date,
    s.region,
    SUM(s.amount) AS total_sales,
    w.avg_temperature,
    w.precipitation_inches,
    w.weather_condition
FROM internal_db.sales s
JOIN third_party_data.weather_daily w
    ON s.sale_date = w.observation_date
    AND s.region = w.region
GROUP BY 1, 2, 4, 5, 6
ORDER BY s.sale_date DESC;
```

## Managing Costs

Data Exchange products can have various pricing models:

- **Free** - No cost to subscribe
- **Subscription-based products** - Billed upfront or on the provider's billing schedule
- **Pay-as-you-go products** - Billed for usage during the calendar month
- **AWS service costs** - S3, Athena, API Gateway, or data transfer costs for storing, querying, or moving the data

Monitor your spending:

```bash
# Check Data Exchange costs in Cost Explorer
aws ce get-cost-and-usage \
    --time-period Start=2026-02-01,End=2026-02-12 \
    --granularity DAILY \
    --metrics "UnblendedCost" \
    --filter '{
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["AWS Data Exchange"]
        }
    }'
```

AWS Data Exchange streamlines the process of incorporating external data into your analytics. For organizing this data alongside your internal datasets, look at [Amazon DataZone for data governance](https://oneuptime.com/blog/post/2026-02-12-amazon-datazone-data-governance/view) and [partitioning data in S3 for Athena queries](https://oneuptime.com/blog/post/2026-02-12-partition-data-s3-efficient-athena-queries/view).
