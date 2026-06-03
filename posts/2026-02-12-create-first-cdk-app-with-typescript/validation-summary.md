# Validation Summary: How to Create Your First CDK App with TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- TypeScript
- Node.js
- Amazon S3
- AWS Lambda
- Amazon CloudWatch Logs
- AWS CLI
- AWS CloudFormation

## Sources Consulted
- AWS CDK prerequisites: https://docs.aws.amazon.com/cdk/v2/guide/prerequisites.html
- AWS CDK supported Node.js versions: https://docs.aws.amazon.com/cdk/v2/guide/node-versions.html
- AWS CDK CLI reference and install guidance: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK `cdk init` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK `cdk deploy` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK S3 `Bucket` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
- AWS CDK S3 auto-delete objects reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.mixins.BucketAutoDeleteObjects.html
- AWS CDK Lambda `Function` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- AWS CDK S3 notifications `LambdaDestination` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_notifications.LambdaDestination.html
- AWS CLI `logs tail` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/tail.html

## Issues Found
- The setup section said Node.js 14.x or later was required. AWS CDK v2 no longer supports Node.js 14.x, so the prerequisite note was updated to Node.js 22.x or later recommended.
- The generated entry point included `source-map-support/register`, which is not present in the current CDK TypeScript app template and would require an additional dependency. The entry point snippet was updated to match the current generated template style.
- The Lambda example used the deprecated `logRetention` property. It was changed to create a `logs.LogGroup` and pass it through the current `logGroup` property.
- The versioned S3 bucket lifecycle rule only expired current object versions while the comment said objects would be deleted after 365 days. Added `noncurrentVersionExpiration` so noncurrent versions are also managed.
- The log-tail command guessed a generated Lambda log group name. The example now outputs the actual log group name and uses `aws logs tail YOUR_LOG_GROUP_NAME --follow`.

## Review Notes
The main CDK app and stack snippets were extracted into a fresh current CDK TypeScript project, compiled with `npm run build`, and synthesized with `npx cdk synth` successfully. The local workspace does not have the AWS CLI installed, so AWS CLI syntax was verified against the official command reference instead of local `aws --help` output.
