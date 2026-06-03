# Validation Summary: How to Create S3 Buckets with AWS CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon S3
- AWS KMS
- AWS Lambda
- TypeScript
- IAM grants
- S3 lifecycle rules
- S3 event notifications
- S3 CORS configuration

## Sources Consulted
- AWS CDK v2 `Bucket` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
- AWS CDK v2 `BucketGrants` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketGrants.html
- AWS CDK v2 `LambdaDestination` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_notifications.LambdaDestination.html
- AWS CDK v2 `cdk init` CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK v2 CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The permissions section used concrete `Bucket` grant methods such as `grantRead`, `grantReadWrite`, and `grantPut`. These methods still compile, but current AWS CDK `Bucket` documentation marks them as discouraged in favor of the `bucket.grants.*` helpers. Updated the examples to `uploadBucket.grants.read(...)`, `uploadBucket.grants.readWrite(...)`, and `uploadBucket.grants.put(...)`, and adjusted the wording from "grant methods" to "grant helpers."

## Review Notes
- All reviewed CDK snippets were type-checked against the current `aws-cdk-lib` package and compiled successfully after the grant helper update.
- The internal OneUptime links referenced in the post returned HTTP 200.
- `lambda.Runtime.NODEJS_20_X` is still available in CDK and supported by AWS Lambda, though AWS also documents newer Node.js runtimes.
