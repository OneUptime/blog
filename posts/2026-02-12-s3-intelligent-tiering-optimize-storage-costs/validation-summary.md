# Validation Summary: How to Use S3 Intelligent-Tiering to Automatically Optimize Storage Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Intelligent-Tiering
- S3 Lifecycle configuration
- AWS CLI
- Boto3 for Python
- Amazon CloudWatch S3 storage metrics
- S3 Batch Operations

## Sources Consulted
- AWS S3 User Guide: How S3 Intelligent-Tiering works: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- AWS S3 User Guide: Managing S3 Intelligent-Tiering: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-managing.html
- AWS S3 User Guide: Restoring an archived object: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects.html
- AWS S3 User Guide: Transitioning objects using Amazon S3 Lifecycle: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 API Reference: Transition: https://docs.aws.amazon.com/AmazonS3/latest/API/API_Transition.html
- AWS CLI Command Reference: put-bucket-intelligent-tiering-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-intelligent-tiering-configuration.html
- AWS CLI Command Reference: put-bucket-lifecycle-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS S3 User Guide: Amazon S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS S3 User Guide: Copying, moving, and renaming objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html
- Boto3 S3 Client Reference: copy_object: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/copy_object.html
- AWS S3 Pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The cost example calculated the monthly savings from moving about 5 TB from S3 Standard at $0.023/GB-month to the Intelligent-Tiering Infrequent Access tier at $0.0125/GB-month as $43.75. The correct arithmetic for 5,000 GB is $52.50, so the net savings after the $25 monitoring fee is $27.50. Updated both figures.
- The post implied that accessing objects in the optional Archive Access and Deep Archive Access tiers automatically triggers restore. AWS documents that these objects must be restored with `RestoreObject` before retrieval, then they move back to Frequent Access after restore completes. Updated the explanation and diagram labels.
- The post described lifecycle rules as setting Intelligent-Tiering as the default for uploads. Lifecycle rules transition objects after creation; they do not change the storage class used by the original PUT request. Updated the wording to say lifecycle rules transition new uploads automatically.
- The Python migration example used `copy_object`, which is limited to copying objects up to 5 GB in a single operation. Updated the surrounding text to limit the example to objects under 5 GB and recommend S3 Batch Operations or multipart copy for larger objects.
- The post broadly said there are no retrieval fees for any tier. AWS pricing says standard and bulk retrievals and restore requests are free for S3 Intelligent-Tiering, while expedited retrievals from Archive Access are charged. Updated wording to refer to standard or bulk retrievals.

## Review Notes
The lifecycle JSON, Intelligent-Tiering configuration JSON, AWS CLI command names and parameters, Boto3 API usage, and CloudWatch `BucketSizeBytes` storage type names matched current AWS documentation. The AWS CLI was not installed locally, so command validation was performed against the official AWS CLI documentation.
