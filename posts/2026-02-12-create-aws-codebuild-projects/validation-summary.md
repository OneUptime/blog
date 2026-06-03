# Validation Summary: How to Create AWS CodeBuild Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeBuild
- AWS IAM
- Amazon S3
- Amazon CloudWatch Logs
- AWS CodeCommit
- Amazon EventBridge / CloudWatch Events
- AWS Systems Manager Parameter Store
- AWS CLI
- CodeBuild buildspec YAML
- Node.js, Python, and Go build environments

## Sources Consulted
- AWS CodeBuild service role documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/setting-up-service-role.html
- AWS CodeBuild create-project AWS CLI reference: https://awscli.amazonaws.com/v2/documentation/api/2.22.8/reference/codebuild/create-project.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild runtime versions: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- AWS CodeBuild EC2 compute images: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CodeBuild compute modes and types: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-compute-types.html
- AWS CodeBuild test report permissions: https://docs.aws.amazon.com/codebuild/latest/userguide/test-permissions.html
- AWS CodeBuild batch-get-builds AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/codebuild/batch-get-builds.html
- Amazon EventBridge targets documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- AWS CodeBuild build triggers documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/build-triggers.html

## Issues Found
- The CodeBuild managed image `aws/codebuild/amazonlinux2-x86_64-standard:5.0` is not the current documented identifier for Amazon Linux 2023 standard 5.0. Updated the Node.js and Python project examples to use `aws/codebuild/amazonlinux-x86_64-standard:5.0`.
- The compute type descriptions used older memory values for `BUILD_GENERAL1_MEDIUM` and `BUILD_GENERAL1_LARGE`. Updated them to the current documented Linux on-demand values: 8 GiB and 16 GiB.
- The IAM policy placed `s3:GetBucketAcl` and `s3:GetBucketLocation` on object ARNs. Split bucket-level S3 permissions onto bucket ARNs while keeping object actions on object ARNs.
- The IAM policy did not include CloudWatch Logs log stream ARNs for `logs:CreateLogStream` and `logs:PutLogEvents`. Split log group and log stream permissions so the resource scopes match the actions.
- The examples use Parameter Store values, but the CodeBuild service role did not allow `ssm:GetParameters`. Added scoped Parameter Store read permission for `/myapp/*`.
- The buildspec examples define test and coverage reports, but the CodeBuild service role did not include required report permissions. Added the documented CodeBuild report actions, including `BatchPutCodeCoverages`.
- The EventBridge target referenced `EventsCodeBuildRole` without creating it. Added the minimal trust policy and inline policy needed for EventBridge to assume the role and call `codebuild:StartBuild`.
- The monitoring query labeled the boolean `buildComplete` field as `Duration`. Renamed the query output label to `Complete`.

## Review Notes
- The post uses `aws events` commands. This CLI namespace is still valid for EventBridge rules, though AWS now generally brands the service as EventBridge rather than CloudWatch Events.
- The examples assume the placeholder account ID, region, bucket names, repository names, and Parameter Store paths have been replaced with real resources.
- The referenced OneUptime CloudWatch alarms and buildspec guide links resolve to relevant posts.
