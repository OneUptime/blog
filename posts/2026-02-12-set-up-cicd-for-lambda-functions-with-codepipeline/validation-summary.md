# Validation Summary: How to Set Up CI/CD for Lambda Functions with CodePipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild
- AWS Lambda
- AWS CloudFormation
- AWS Serverless Application Model (SAM)
- AWS CodeConnections / CodeStarSourceConnection
- Amazon S3
- Amazon SNS
- Amazon EventBridge
- Amazon CloudWatch
- IAM
- Node.js 20

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild runtime versions: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- AWS CLI `cloudformation package` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html
- AWS SAM `AWS::Serverless::Function` reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS CodePipeline CodeStarSourceConnection action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline CloudFormation deploy action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html
- AWS CloudFormation CodePipeline parameter override functions: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-parameter-override-functions.html
- AWS CodePipeline manual approval action documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html
- AWS CodePipeline EventBridge event monitoring: https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html
- Amazon EventBridge CodePipeline event reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-codepipeline.html
- AWS CodeConnections CloudFormation connection reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codeconnections-connection.html

## Issues Found
- The build artifact and SAM template used `CodeS3Bucket` and `CodeS3Key` parameters sourced from `Fn::GetArtifactAtt` on the CodePipeline build artifact. AWS documents `ObjectKey` as the key of the generated CodePipeline artifact ZIP, not the nested `function.zip`, so the Lambda code reference would point at the wrong ZIP. I changed the build to run `aws cloudformation package`, changed `CodeUri` to the local `function.zip`, emitted `packaged-template.yml`, and changed the CloudFormation deploy actions to use that packaged template.
- The GitHub source action used the older GitHub OAuth action with `Owner: ThirdParty`, `Provider: GitHub`, and `OAuthToken`. AWS documentation says the recommended GitHub integration is the connection-based `CodeStarSourceConnection` action. I updated the source action to use `Owner: AWS`, `Provider: CodeStarSourceConnection`, `ConnectionArn`, `FullRepositoryId`, `BranchName`, and `OutputArtifactFormat`.
- The CodePipeline service role did not include the required `codeconnections:UseConnection` permission for the connection-based source action. I added that permission to the IAM snippet.
- The CodeBuild project did not pass the S3 bucket needed by `aws cloudformation package`. I added a `DEPLOYMENT_BUCKET` environment variable backed by the artifact bucket.
- The pipeline referenced `CloudFormationRole` but the post did not define it. I added a CloudFormation deployment role snippet with the service trust policy and broad permissions appropriate for the tutorial's SAM-generated Lambda, IAM, CodeDeploy, CloudWatch, logs, and packaged S3 object resources.
- The buildspec used `npm ci --production`. I changed it to `npm ci --omit=dev`, which is the current npm form for installing without development dependencies.
- The monitoring section referred to "CloudWatch Events". I changed this to Amazon EventBridge, the current service name for these events, while leaving the valid `AWS::Events::Rule` CloudFormation resource type.

## Review Notes
- The IAM policies are intentionally broad for a tutorial. A production implementation should scope S3, Lambda, IAM, CodeDeploy, CloudWatch, and logs permissions more tightly.
- The CodeConnections ARN in the sample is a placeholder. In a real CloudFormation template, use an existing authenticated connection ARN or create an `AWS::CodeConnections::Connection` and complete the console handshake before expecting pipeline triggers to work.
- The linked OneUptime Lambda monitoring article returned HTTP 200 during validation.
