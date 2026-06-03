# Validation Summary: How to Build a CI/CD Pipeline for Infrastructure on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CDK v2
- CDK Pipelines
- AWS CodePipeline
- AWS CodeBuild
- AWS CloudFormation
- AWS CodeConnections / CodeStarSourceConnection
- AWS CodeStar Notifications
- Amazon CloudWatch alarms and metrics
- Amazon ECS Fargate
- Checkov
- cfn-lint
- TypeScript

## Sources Consulted
- AWS CDK Pipelines module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html
- AWS CDK `CodePipelineSource` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipelineSource.html
- AWS CDK `CodePipeline` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipeline.html
- AWS CDK `ShellStep` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.ShellStep.html
- AWS CDK stacks guide: https://docs.aws.amazon.com/cdk/v2/guide/stacks.html
- AWS CDK assertions `Template` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- AWS CodePipeline CodeStarSourceConnection / CodeConnections source action documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline CloudWatch metrics documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/metrics-dimensions.html
- AWS Developer Tools notification concepts and CodePipeline event IDs: https://docs.aws.amazon.com/dtconsole/latest/userguide/concepts.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild available runtimes documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- cfn-lint project documentation: https://github.com/aws-cloudformation/cfn-lint
- AWS CDK ECS module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS CloudFormation stack failure options documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html

## Issues Found
- Replaced `CodePipelineSource.gitHub(...)` with `CodePipelineSource.connection(...)` and a connection ARN placeholder. AWS CDK documents the OAuth-based GitHub source method as no longer recommended and advises using `connection()` for GitHub, GitHub Enterprise, and Bitbucket sources.
- Updated the pipeline stack constructor to use the standard `Construct` scope and optional `cdk.StackProps`, matching AWS CDK stack examples and making the snippet reusable beyond direct `cdk.App` scope.
- Added an `environmentName` value when constructing `ApplicationStack` and changed the production check from `this.node.tryGetContext('environment')` to `props.environmentName`. The original snippet did not set a CDK context key per stage, so production-specific settings would not automatically apply to the `Production` stage.
- Removed the unused `Match` import from the CDK assertions test snippet. The tests only use `Template`, and unused imports can fail TypeScript builds when `noUnusedLocals` is enabled.
- Updated the CodeBuild runtime example from `nodejs: '18'` to `nodejs: '22'`. AWS CodeBuild documents Node.js 22 as available for `STANDARD_7_0`, while Node.js 18 is an older runtime.
- Corrected the CloudWatch alarm metric from `PipelineExecutionFailedCount` to the documented CodePipeline metric name `FailedPipelineExecutions`.

## Review Notes
The snippets are illustrative and still depend on application-specific constructs and types such as `NetworkStack`, `DatabaseStack`, `ApplicationStack`, `ApplicationProps`, `taskDefinition`, `notificationTopic`, and CloudWatch imports. The CodeConnections source action has regional availability caveats, and users must create and authorize the connection before the pipeline can use it.
