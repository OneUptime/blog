# Validation Summary: How to Build an Image Processing Pipeline on AWS with Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon S3 event notifications
- AWS CDK v2
- Amazon CloudFront
- AWS SDK for JavaScript v3
- Node.js
- Sharp
- npm

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Building Lambda functions with Node.js: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Working with layers for Node.js Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- AWS CDK CloudFront origins module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins-readme.html
- Amazon S3 event notification filtering: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html
- AWS SDK for JavaScript v3 GetObjectCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS SDK for JavaScript v3 CopyObjectCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/CopyObject
- Lambda ephemeral storage: https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html
- Sharp installation guide: https://sharp.pixelplumbing.com/install/
- Sharp resize API: https://sharp.pixelplumbing.com/api-resize/
- Sharp image operations API: https://sharp.pixelplumbing.com/api-operation/
- Sharp composite API: https://sharp.pixelplumbing.com/api-composite/
- Sharp output options API: https://sharp.pixelplumbing.com/api-output/

## Issues Found
- The Sharp layer install command used older npm cross-platform flags and omitted the Linux C library target. Changed it to Sharp's current npm v10+ form: `npm install --os=linux --cpu=x64 --libc=glibc sharp`.
- The Lambda examples used `NODEJS_18_X`, which is deprecated as of September 1, 2025. Updated the CDK layer and function runtime examples to `NODEJS_22_X`.
- The layer description said Amazon Linux 2 even though the updated Node.js runtime uses Amazon Linux 2023. Reworded it to refer to the Amazon Linux environment used by the selected runtime.
- The image variant code converted all resized outputs to JPEG but reused the source extension, which would create keys like `.png` for JPEG bodies when processing PNG uploads. Changed the output naming to use `.jpg` for JPEG variants.
- The EXIF section incorrectly said Sharp auto-rotates by default. Updated it to state that `rotate()` must be called to auto-orient based on EXIF orientation.
- The EXIF example used `withMetadata({ orientation: undefined })`, which is unnecessary and could imply metadata preservation. Removed it because Sharp removes metadata by default when writing output.
- The CloudFront CDK snippet used the deprecated `S3Origin` construct. Updated it to `S3BucketOrigin.withOriginAccessControl(processedBucket)` and added the missing CloudFront imports for the snippet.
- The error-handling snippet referenced `CopyObjectCommand` without showing the import. Added the AWS SDK v3 import.
- The `CopyObjectCommand` example passed an unencoded `CopySource`, which can fail for keys with spaces or special characters. Added URL encoding while preserving slash separators.
- The performance tip said to process variants in parallel with `Promise.all()`, but the shown code uploads generated variants in parallel rather than processing the Sharp transforms in parallel. Reworded the tip to match the implementation.

## Review Notes
The corrected examples are technically sound for a tutorial, but the CDK snippets remain illustrative rather than a complete deployable stack because the CloudFront section is shown separately from the initial stack. Future improvements could include case-insensitive S3 suffix coverage for `.jpeg`, `.JPG`, and `.PNG`, explicit Lambda architecture handling for ARM64, and a production dead-letter queue or failure destination instead of only copying failed objects.
