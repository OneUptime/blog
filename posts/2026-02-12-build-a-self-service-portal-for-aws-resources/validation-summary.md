# Validation Summary: How to Build a Self-Service Portal for AWS Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Service Catalog
- AWS CloudFormation
- Amazon S3
- AWS Lambda
- AWS Step Functions
- Amazon SNS
- Amazon DynamoDB
- Amazon SES
- AWS CloudTrail
- Python / boto3

## Sources Consulted
- AWS CloudFormation `AWS::ServiceCatalog::CloudFormationProduct` provisioning artifact properties: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-servicecatalog-cloudformationproduct-provisioningartifactproperties.html
- AWS CloudFormation `AWS::S3::Bucket` lifecycle transition properties: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-transition.html
- AWS CloudFormation `AWS::S3::Bucket` bucket encryption properties: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-bucketencryption.html
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/console/s3/bucket-naming
- AWS Step Functions optimized service integrations: https://docs.aws.amazon.com/step-functions/latest/dg/integrate-optimized.html
- AWS Step Functions SNS integration: https://docs.aws.amazon.com/step-functions/latest/dg/connect-sns.html
- AWS Step Functions callback task token pattern: https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions Task state documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- boto3 Service Catalog `provision_product`: https://docs.aws.amazon.com/boto3/latest/reference/services/servicecatalog/client/provision_product.html
- boto3 DynamoDB guide for `Key` and `Attr` condition expressions: https://docs.aws.amazon.com/boto3/latest/guide/dynamodb.html
- boto3 DynamoDB `Table.scan` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/scan.html
- AWS Service Catalog CloudTrail logging: https://docs.aws.amazon.com/servicecatalog/latest/dg/logging-using-cloudtrail.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The S3 lifecycle rule transitioned objects to `STANDARD_IA` after 30 days. AWS CloudFormation documents that `STANDARD_IA` and `ONEZONE_IA` transitions require positive integers greater than 30, so this was changed to 31 days.
- Several example ARNs used a 9-digit placeholder account ID. AWS account IDs in ARNs are 12 digits, so the placeholders were changed to `123456789012`.
- The DynamoDB query and scan examples used string expressions in boto3 resource calls. The boto3 DynamoDB guide recommends `Key` and `Attr` condition builders for table resource query/scan expressions, so the snippets now import and use those builders.
- The cleanup Lambda scanned only the first DynamoDB page. DynamoDB scans can paginate with `LastEvaluatedKey`, so the example now loops through all pages.
- The Python snippets used `datetime.utcnow()`, which is deprecated in modern Python. The examples now use timezone-aware `datetime.now(timezone.utc)` values.

## Review Notes
- The Service Catalog `LoadTemplateFromURL` values are example S3 URLs and should be replaced with real template URLs in an implementation.
- The Lambda snippets assume API Gateway authorizer claims, DynamoDB table/index definitions, IAM permissions, and Service Catalog product IDs already exist.
