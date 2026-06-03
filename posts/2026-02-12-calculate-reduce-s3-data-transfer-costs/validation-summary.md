# Validation Summary: How to Calculate and Reduce S3 Data Transfer Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3
- Amazon CloudFront
- Amazon VPC gateway endpoints
- AWS Cost Explorer
- Amazon CloudWatch metrics
- AWS CLI
- boto3 for Python
- S3 Select
- S3 Transfer Acceleration
- AWS Cost Anomaly Detection

## Sources Consulted
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Creating S3 CloudWatch request metrics configurations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-request-metrics-bucket.html
- Cost Explorer GetCostAndUsage API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Cost Explorer filter and usage type group documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html
- CloudFront with Amazon S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html
- AWS CLI cloudfront create-distribution reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- CloudFront pricing and flat-rate plans: https://aws.amazon.com/cloudfront/pricing/ and https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
- Amazon VPC gateway endpoints for S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- S3 Select user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html

## Issues Found
- The post omitted the current first 100GB/month free data transfer out tier aggregated across most AWS services and Regions. Updated the pricing table, introductory 1TB estimate, CloudWatch cost estimate, and 50TB example.
- The Cost Explorer command used undocumented usage type group names. Replaced them with documented S3 usage type group names for standard API requests, internet data transfer out, and Region-to-Region data transfer out.
- The CloudWatch metrics section implied S3 request metrics are always available. Added that request metrics must be enabled first and are billed at standard CloudWatch rates.
- The CloudFront section treated $0.085/GB as universal current pricing. Updated wording to account for geography, pay-as-you-go pricing, and CloudFront flat-rate plans.
- The VPC endpoint section implied same-region S3 access from AWS services incurs S3 transfer charges without an endpoint. Corrected it to focus on avoiding NAT gateway or public routing costs; same-region S3 transfer to AWS services is already free.
- The cross-region transfer claim used a single $0.02/GB rate. Updated it to note that rates commonly vary around $0.01-$0.02/GB depending on source and destination Regions.
- The S3 Select recommendation did not mention that S3 Select is no longer available to new customers. Added this limitation and limited the recommendation to accounts that already have access.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and API documentation rather than local `aws --help` output. Python snippets were reviewed for syntax and current boto3 API shape, but boto3 is not installed locally, so they were not executed.
