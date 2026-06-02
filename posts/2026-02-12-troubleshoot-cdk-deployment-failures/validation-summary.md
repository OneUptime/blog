# Validation Summary: How to Troubleshoot CDK Deployment Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS CDK v2
- AWS CloudFormation
- AWS CLI
- Amazon S3
- Amazon EC2 security groups
- AWS IAM
- AWS Service Quotas
- AWS CloudTrail
- Docker
- TypeScript

## Sources Consulted
- AWS CDK CLI command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd.html
- AWS CDK deploy command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK bootstrapping documentation: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html
- AWS CDK context values documentation: https://docs.aws.amazon.com/cdk/v2/guide/context.html
- AWS CDK SecurityGroup API documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.SecurityGroup.html
- AWS CloudFormation troubleshooting documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html
- AWS CloudFormation stack events documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/view-stack-events.html
- AWS CloudFormation ContinueUpdateRollback API reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ContinueUpdateRollback.html
- AWS CLI delete-stack command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CLI delete-objects command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Local Docker CLI help for `docker build`
- Local TypeScript compiler version check for `npx tsc --noEmit`

## Issues Found
- The Docker build command used `./path/to/dockerfile` as the build context while describing it as a Dockerfile path. Updated it to pass the Dockerfile with `-f` and a separate build context directory.
- The versioned S3 bucket cleanup example deleted object versions but not delete markers. Updated the example to delete both `Versions` and `DeleteMarkers`, matching S3 versioning behavior.
- The security group circular dependency example implied that `connections` was the fix for a cross-stack rule placement issue. Updated the wording and example to explain that same-stack mutual security group references are not circular, and that cross-stack cases should use CDK's `remoteRule` behavior when needed.

## Review Notes
The CDK and AWS CLI examples are generally valid for current AWS CDK v2 and AWS CLI v2. For very large buckets, the `delete-objects` API deletes up to 1,000 keys per request, so the S3 cleanup example may need pagination or batching in production.
