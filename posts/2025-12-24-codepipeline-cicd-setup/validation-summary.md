# Validation Summary: How to Set Up CodePipeline for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild (buildspec.yml)
- AWS CodeDeploy / ECS deployment actions
- AWS CloudFormation (pipeline-as-code)
- AWS IAM (service roles and policies)
- Amazon S3 (artifact store)
- AWS CodeStar Connections (GitHub integration)
- AWS CodeStar Notifications / Amazon SNS
- AWS CLI

## Sources Consulted
- AWS CodeBuild — Available runtimes: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS CodeBuild — Docker images provided by CodeBuild: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html
- AWS CodeBuild — Build spec reference (buildspec.yml syntax): https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS re:Post — "When will CodeBuild offer nodejs v18 (or higher)?" (confirms Node.js 18 is not available on Amazon Linux 2 images): https://repost.aws/questions/QUDDQb8kbNT8SuREtCdDpNOA/when-will-codebuild-offer-nodejs-v18-or-higher
- AWS CodePipeline — CloudFormation reference (AWS::CodePipeline::Pipeline): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codepipeline-pipeline.html
- AWS CodePipeline — Action structure reference (GitHub v1, CodeStarSourceConnection, ECS, CloudFormation, Manual approval): https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference.html
- AWS CLI reference — codestar-connections, codestar-notifications, codebuild, codepipeline command syntax

## Issues Found
1. **Incorrect CodeBuild image / Node.js runtime mismatch** (Step 3, `aws codebuild create-project` command).
   - **What was wrong:** The buildspec specifies `runtime-versions: nodejs: 18`, but the CodeBuild project was created with the image `aws/codebuild/amazonlinux2-x86_64-standard:4.0`. The Amazon Linux 2 standard:4.0 image only provides Node.js runtimes up to version 16; Node.js 18 is not available on any Amazon Linux 2 CodeBuild image. A build using this combination fails with `YAML_FILE_ERROR Message: Unknown runtime version named '18' of nodejs`.
   - **What was changed:** Updated the image to `aws/codebuild/amazonlinux2023-x86_64-standard:5.0`, the Amazon Linux 2023 standard image that supports Node.js 18 (and 20), matching the buildspec's declared runtime.
   - **Why:** To make the example internally consistent and actually buildable, per the AWS CodeBuild available-runtimes documentation.

## Review Notes
- The CloudFormation pipeline template (Step 4) is an illustrative snippet that references resources (`PipelineRole`, `CodeBuildProject`, `ApprovalTopic`) not defined within the shown excerpt. This is acceptable for a tutorial fragment; readers must supply those resources to deploy it as-is.
- The GitHub v1 source action (`Owner: ThirdParty`, `Provider: GitHub`, `OAuthToken`) shown in Step 4 is the legacy GitHub source integration. It still works, but AWS recommends the `CodeStarSourceConnection` approach the post correctly introduces in Step 5 as the preferred, more secure option.
- `discard-paths: no` in the buildspec is valid (CodeBuild accepts `yes`/`no`). YAML 1.1 would interpret `no` as a boolean, but CodeBuild's parser handles this value as documented.
- The `codestar-notifications` event type IDs (`codepipeline-pipeline-pipeline-execution-failed` / `-succeeded`) are correct, including the doubled `pipeline-pipeline` segment, which is the documented format.
- `aws codestar-connections` CLI commands remain functional; note AWS has since rebranded the service to "CodeConnections" (`aws codeconnections ...`), though the `codestar-connections` namespace is still supported for backward compatibility.
