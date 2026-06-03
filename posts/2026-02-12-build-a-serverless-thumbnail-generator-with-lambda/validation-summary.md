# Validation Summary: How to Build a Serverless Thumbnail Generator with Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon S3 event notifications
- AWS IAM policies
- Amazon CloudFront
- Amazon CloudWatch alarms
- Python 3.12
- Boto3
- Pillow

## Sources Consulted
- AWS Lambda documentation: Building Lambda functions with Python - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda documentation: Working with layers for Python Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- AWS Lambda documentation: Configure Lambda function memory - https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html
- AWS CLI Command Reference: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- Amazon S3 API Reference: LambdaFunctionConfiguration - https://docs.aws.amazon.com/AmazonS3/latest/API/API_LambdaFunctionConfiguration.html
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Pillow documentation: Image module - https://pillow.readthedocs.io/en/stable/reference/Image.html
- Pillow documentation: ImageOps.exif_transpose - https://pillow.readthedocs.io/en/stable/reference/ImageOps.html

## Issues Found
- The layer build comment said the Python 3.12 Lambda layer was for Amazon Linux 2. AWS documents the Python 3.12 runtime as Amazon Linux 2023, so the comment was changed to avoid naming the wrong base OS.
- The Lambda deployment example used `--memory-size 1536` while the text claimed this gives roughly one full vCPU. AWS documents the one-vCPU equivalent at 1,769 MB, so the command and explanation were updated to use 1,769 MB.
- The IAM policy allowed writes only to `thumbnails/*`, but the corrupted-image example copies invalid files to `errors/*`. The `s3:PutObject` resource list now includes both prefixes.
- The corrupted-image example described `copy_object` as moving the file. The comment now says it copies the file, matching the API call.
- The IAM policy block was labeled as JSON but contained a JavaScript-style `//` comment. The comment was removed so the policy is valid JSON.
- The corrupted-image snippet used a top-level `return`, which is invalid Python. It was wrapped in a helper function that returns the reopened image or `None`.

## Review Notes
The main Lambda, S3 notification, Pillow thumbnailing, EXIF orientation, CloudWatch alarm, and CloudFront examples are broadly consistent with current official documentation. The CloudFront example is intentionally minimal and leaves origin privacy hardening, such as origin access control and bucket policy setup, for a production deployment.
