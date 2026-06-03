# Validation Summary: How to Build a Static Website with CI/CD on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS S3
- Amazon CloudFront
- CloudFront Origin Access Control
- AWS CodeBuild
- AWS CodePipeline
- AWS CodeConnections
- AWS CLI
- GitHub Actions
- Node.js/npm
- AWS Certificate Manager
- Amazon CloudWatch

## Sources Consulted
- AWS CLI Command Reference: `cloudfront create-origin-access-control` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-origin-access-control.html
- Amazon CloudFront Developer Guide: Get started with a standard distribution using the AWS CLI - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/get-started-cli-tutorial.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: CloudFront metrics in CloudWatch - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CodeBuild User Guide: Runtime versions - https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- AWS CodeBuild User Guide: Available runtimes - https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS CodeBuild User Guide: Create a build project - https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html
- AWS CodePipeline User Guide: AWS CodeBuild build and test action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html
- AWS CodePipeline User Guide: CodeStarSourceConnection source action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Building and testing Node.js - https://docs.github.com/actions/how-tos/writing-workflows/building-and-testing/building-and-testing-nodejs

## Issues Found
- The CodeBuild project used `aws/codebuild/amazonlinux2-x86_64-standard:5.0` with `nodejs: 20`. AWS's current CodeBuild runtime tables list Node.js 20 support on images such as Amazon Linux 2023 standard 5.0, not the Amazon Linux 2 standard 5.0 image shown. Changed the image to `aws/codebuild/amazonlinux2023-x86_64-standard:5.0`.
- The CodeBuild project was configured with a direct GitHub source and `NO_ARTIFACTS`, while the later CodePipeline stage supplies the source artifact and expects a build output artifact. Changed the project source and artifact types to `CODEPIPELINE` to match the pipeline integration.
- The CodePipeline GitHub source action used the legacy OAuth-token style GitHub action. Replaced it with the current connection-based `CodeStarSourceConnection` action configuration using `ConnectionArn`, `FullRepositoryId`, `BranchName`, and `OutputArtifactFormat`.
- The CodeBuild deployment excluded `service-worker.js` and `manifest.json` from the long-cache S3 sync but only uploaded `index.html` afterward, so those optional files would not be deployed. Added guarded no-cache uploads for `service-worker.js` and `manifest.json`, and included them in the CloudFront invalidation paths.
- The CloudWatch alarm for CloudFront 5xx errors omitted the `Region=Global` metric dimension and did not specify the required `us-east-1` API region for CloudFront metrics. Added `Name=Region,Value=Global` and `--region us-east-1`.

## Review Notes
- The GitHub Actions example is syntactically plausible and uses supported action versions, but long-lived AWS access keys are less preferred than OIDC-based federation for production deployments.
- The CloudFront distribution JSON is illustrative rather than a full copy-and-run command; readers still need to save it to a file and call `aws cloudfront create-distribution --distribution-config file://...`.
