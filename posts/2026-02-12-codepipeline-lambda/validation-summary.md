# Validation Summary: How to Use CodePipeline with Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodePipeline
- AWS Lambda
- AWS SAM
- AWS CodeBuild
- AWS CloudFormation
- AWS CodeDeploy
- Amazon CloudWatch
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- Boto3

## Sources Consulted
- AWS SAM DeploymentPreference documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-deploymentpreference.html
- AWS CodeDeploy Lambda SAM template tutorial: https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-lambda-sam-template.html
- AWS CodePipeline Lambda invoke action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-Lambda.html
- AWS CodePipeline CloudFormation action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html
- AWS CloudFormation CodePipeline configuration properties reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html
- AWS SAM CLI package documentation and examples: https://docs.aws.amazon.com/serverless-application-repository/latest/devguide/serverlessrepo-how-to-publish.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild runtime versions reference: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Boto3 Lambda update_function_code reference: https://docs.aws.amazon.com/boto3/latest/reference/services/lambda/client/update_function_code.html
- AWS SDK for JavaScript v3 Lambda InvokeCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-lambda/Class/InvokeCommand/

## Issues Found
- The CodeBuild buildspec changed into `src` and then `tests`, leaving the build commands at risk of running outside the SAM template directory. Updated the commands to use `npm --prefix` so dependency installation and tests run in the intended directories without changing the working directory.
- The multiline `sam package` command was written as a YAML folded scalar, which would not reliably behave as a shell line continuation in a real buildspec. Replaced it with a single-line `sam package --output-template-file packaged.yml --s3-bucket my-sam-artifacts` command.
- The second approach described a "Lambda deploy action," but CodePipeline's AWS Lambda action is an Invoke action. Renamed the section and wording to match the official action type.
- The custom deployer Lambda read the whole CodePipeline artifact ZIP and passed it directly to `update_function_code`, while the function code package should be the deployment ZIP inside the pipeline artifact. Updated the deployer to use CodePipeline artifact credentials, download the input artifact, extract `function.zip`, and pass that deployment package to Lambda.

## Review Notes
- The SAM `nodejs18.x` runtime remains supported as of the review date, but AWS lists deprecation milestones beginning September 1, 2025, with update blocking later in 2027. A future refresh should consider moving examples to a newer supported Node.js runtime.
- The SAM template assumes the lifecycle hook handler code calls CodeDeploy `PutLifecycleEventHookExecutionStatus`, which is required for pre-traffic and post-traffic hooks to complete successfully.
