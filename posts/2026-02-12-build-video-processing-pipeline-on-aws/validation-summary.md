# Validation Summary: How to Build a Video Processing Pipeline on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elemental MediaConvert
- Amazon S3
- AWS Lambda
- AWS Step Functions
- Amazon EventBridge
- Amazon CloudFront
- AWS CDK
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS SDK for JavaScript v3 MediaConvert client documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/mediaconvert/
- AWS Elemental MediaConvert EventBridge event list: https://docs.aws.amazon.com/mediaconvert/latest/ug/mediaconvert_event_list.html
- AWS Elemental MediaConvert COMPLETE event documentation: https://docs.aws.amazon.com/mediaconvert/latest/ug/ev_status_complete.html
- AWS Elemental MediaConvert ERROR event documentation: https://docs.aws.amazon.com/mediaconvert/latest/ug/ev_status_error.html
- AWS Elemental MediaConvert sample job settings JSON: https://docs.aws.amazon.com/mediaconvert/latest/apireference/sample-json.html
- AWS Elemental MediaConvert frame capture output documentation: https://docs.aws.amazon.com/mediaconvert/latest/ug/file-group-with-frame-capture-output.html
- AWS Step Functions StartExecution API reference: https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html
- AWS CDK CloudFront origins documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins-readme.html
- AWS CDK ResponseHeadersCorsBehavior API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ResponseHeadersCorsBehavior.html
- AWS DevOps blog on CDK S3BucketOrigin and Origin Access Control: https://aws.amazon.com/blogs/devops/a-new-aws-cdk-l2-construct-for-amazon-cloudfront-origin-access-control-oac/
- OneUptime linked article page: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- The MediaConvert Lambda used `DescribeEndpointsCommand` and stated that MediaConvert requires a customer-specific endpoint. AWS SDK v3 documentation says `DescribeEndpoints` is no longer required and recommends sending requests directly to the regional endpoint, so the code now constructs `MediaConvertClient` directly.
- The Step Functions execution name was derived from the full uploaded filename and could exceed the 80-character maximum. The trigger Lambda now sanitizes and truncates the generated name.
- The architecture included MP4 output, but the MediaConvert job only generated HLS and thumbnails. Added an MP4 file output group so the code matches the architecture.
- The HLS outputs did not declare HLS container settings. Added `ContainerSettings: { Container: 'M3U8' }` to the HLS renditions to match MediaConvert job settings examples.
- The CloudFront CDK snippet used the deprecated `origins.S3Origin`. Updated it to `origins.S3BucketOrigin.withOriginAccessControl(outputBucket)`, which is the current CDK API for an S3 bucket origin with OAC.

## Review Notes
The examples remain illustrative and omit surrounding production wiring such as Lambda permissions, S3 event notification configuration, EventBridge rule definitions, Step Functions state machine definition, and full CDK imports. Those omissions are acceptable for the scope of the post but would need to be filled in for a deployable project.
