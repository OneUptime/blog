# Validation Summary: How to Use AWS Data Exchange to Subscribe to Third-Party Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Data Exchange
- AWS Marketplace
- AWS CLI
- Amazon EventBridge
- AWS Lambda
- Python boto3
- Amazon S3
- AWS Glue
- Amazon Athena
- AWS Cost Explorer

## Sources Consulted
- AWS Data Exchange User Guide: Product subscriptions in AWS Data Exchange: https://docs.aws.amazon.com/data-exchange/latest/userguide/product-subscriptions.html
- AWS Data Exchange User Guide: Subscribing to AWS Data Exchange data products: https://docs.aws.amazon.com/data-exchange/latest/userguide/subscribe-to-data-sets.html
- AWS CLI Command Reference: dataexchange list-data-sets: https://docs.aws.amazon.com/cli/latest/reference/dataexchange/list-data-sets.html
- AWS CLI Command Reference: dataexchange list-data-set-revisions: https://docs.aws.amazon.com/cli/latest/reference/dataexchange/list-data-set-revisions.html
- AWS CLI Command Reference: dataexchange list-revision-assets: https://docs.aws.amazon.com/cli/latest/reference/dataexchange/list-revision-assets.html
- AWS Data Exchange User Guide: Exporting AWS Data Exchange asset revisions to an S3 bucket: https://docs.aws.amazon.com/data-exchange/latest/userguide/export-rev-s3-prog.html
- AWS Data Exchange User Guide: Key patterns when exporting asset revisions: https://docs.aws.amazon.com/data-exchange/latest/userguide/revision-export-keypatterns.html
- AWS Data Exchange User Guide: Amazon EventBridge events for AWS Data Exchange: https://docs.aws.amazon.com/data-exchange/latest/userguide/cloudwatch-events.html
- AWS CLI Command Reference: dataexchange send-api-asset: https://docs.aws.amazon.com/cli/latest/reference/dataexchange/send-api-asset.html
- AWS Data Exchange User Guide: Making an AWS Data Exchange API call: https://docs.aws.amazon.com/data-exchange/latest/userguide/tutorial-make-api-call-console.html
- AWS Data Exchange Pricing: https://aws.amazon.com/data-exchange/pricing/

## Issues Found
- The original discovery example implied `aws dataexchange list-data-sets` searched the public Data Exchange catalog. AWS documents this operation as listing owned or entitled data sets, so the post now describes it as a way to list entitled data sets after subscription and uses `--origin "ENTITLED"`.
- The AWS Marketplace Catalog API subscription example used an unsupported `CreateSubscription` change type and incorrect filter shape. The post now directs readers to subscribe through the AWS Data Exchange console or AWS Marketplace product page, matching AWS subscriber documentation.
- Several placeholder data set, revision, asset, and job IDs used prefixes such as `ds-`, `rev-`, and `asset-`, but AWS Data Exchange API IDs are 30-40 alphanumeric characters. These placeholders were replaced with valid-format sample IDs.
- The EventBridge input transformer used non-existent singular fields `detail.DataSetId` and `detail.RevisionId`. AWS Data Exchange revision events include `RevisionIds` and identify the data set in `resources`, so the transformer now reads `$.resources[0]` and `$.detail.RevisionIds[0]`.
- The Lambda polling loop did not handle `TIMED_OUT`, which is a documented AWS Data Exchange job terminal state. The failure branch now includes `TIMED_OUT`.
- The pricing list included per-query and per-revision models as if they were Data Exchange product pricing categories. The AWS pricing page describes subscription-based products, pay-as-you-go products, data transfer fees, and downstream AWS service costs, so the list was corrected.

## Review Notes
The examples still use illustrative IDs, product data, bucket names, and table names. The AWS CLI was not installed locally, so command verification was performed against official AWS CLI and AWS service documentation rather than local `aws --help` output.
