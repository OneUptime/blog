# Validation Summary: How to Use Lambda for PDF Generation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon S3
- AWS SDK for JavaScript v3
- AWS CLI
- Amazon API Gateway REST APIs
- AWS Step Functions
- AWS CloudFormation
- PDFKit
- Puppeteer and puppeteer-core
- @sparticuz/chromium
- Python boto3
- ReportLab

## Sources Consulted
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda quotas and ephemeral storage documentation: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda EphemeralStorage API reference: https://docs.aws.amazon.com/lambda/latest/api/API_EphemeralStorage.html
- AWS CloudFormation AWS::Lambda::Function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CLI lambda invoke command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- Amazon API Gateway binary media types documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
- Amazon API Gateway patch operations reference: https://docs.aws.amazon.com/apigateway/latest/api/patch-operations.html
- AWS Step Functions Inline Map state documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS SDK for JavaScript v3 S3 PutObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/Class/PutObjectCommand
- Amazon S3 multipart upload documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
- PDFKit getting started documentation: https://pdfkit.org/docs/getting_started.html
- Puppeteer PDFOptions documentation: https://pptr.dev/api/puppeteer.pdfoptions
- Puppeteer Page.pdf documentation: https://pptr.dev/api/puppeteer.page.pdf
- Sparticuz Chromium README: https://github.com/Sparticuz/chromium
- ReportLab user guide: https://docs.reportlab.com/reportlab/userguide/ch2_graphics/

## Issues Found
- The AWS CLI v2 `aws lambda invoke` example omitted `--cli-binary-format raw-in-base64-out`, which is required when passing literal JSON in `--payload`. Added the option to the command.
- The Puppeteer deployment explanation stated that a Lambda Layer is required. Updated it to say a Lambda Layer or container image is commonly used, which matches Lambda packaging limits and current deployment options.
- The CloudFormation `AWS::Lambda::Function` snippet omitted the required `Code` property. Added placeholder S3 package fields.
- The CloudFormation snippet used `nodejs20.x`, which is past its AWS Lambda deprecation date as of this validation date. Updated it to `nodejs22.x`.
- The Step Functions Map example used the older `Iterator` field. Replaced it with the current `ItemProcessor` structure and inline processor config.

## Review Notes
- The AWS CLI was not installed in the local workspace, so AWS CLI commands were checked against the official AWS CLI command reference.
- The HTML-to-PDF sample interpolates event data directly into HTML. That is acceptable for a compact tutorial example, but production code should escape or sanitize user-controlled values before rendering.
