# Validation Summary: How to Use S3 Object Lambda to Transform Data on Retrieval

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- S3 Object Lambda
- S3 Access Points
- AWS Lambda
- AWS CLI
- IAM
- Python
- Boto3
- Pillow

## Sources Consulted
- Amazon S3 Object Lambda availability change: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html
- Amazon S3 Object Lambda event context format and usage: https://docs.aws.amazon.com/AmazonS3/latest/userguide/olap-event-context.html
- Creating Object Lambda Access Points: https://docs.aws.amazon.com/AmazonS3/latest/userguide/olap-create.html
- Writing Lambda functions for S3 Object Lambda Access Points: https://docs.aws.amazon.com/AmazonS3/latest/userguide/olap-writing-lambda.html
- Boto3 write_get_object_response reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/write_get_object_response.html
- Amazon S3 pricing, S3 Object Lambda pricing example: https://aws.amazon.com/s3/pricing/
- AWS S3 Object Lambda feature page: https://aws.amazon.com/s3/features/object-lambda/

## Issues Found
- The post did not mention that, as of November 7, 2025, S3 Object Lambda is available only to existing customers already using the service and select AWS Partner Network partners. Added that caveat to the introduction so the 2026 post does not imply availability for all new AWS customers.
- The architecture explanation said the Lambda function receives the original object data. AWS documentation shows the Lambda event receives context, including `inputS3Url`, `outputRoute`, and `outputToken`; the function fetches the original object through the presigned URL. Updated the explanation accordingly.
- The Python Lambda snippets imported `requests`, but the deployment command packaged only `lambda_function.py`. Since `requests` is not part of the Python standard library, those examples would fail unless dependencies were packaged separately. Replaced `requests` usage with standard-library `urllib.request.urlopen` and used `urllib.parse` for query parsing in the image example.
- The cost section said there is no additional Object Lambda service fee. Current AWS S3 pricing includes an S3 Object Lambda data return charge per GB returned by the Lambda function. Updated the cost breakdown to include that charge.

## Review Notes
The main commands, Object Lambda access point configuration shape, Boto3 `write_get_object_response` parameters, event field names, and 60-second Object Lambda response limit align with AWS documentation. The image resizing example still requires Pillow to be packaged with the Lambda function or provided by a Lambda layer.
