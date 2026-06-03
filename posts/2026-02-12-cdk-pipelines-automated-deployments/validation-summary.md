# Validation Summary: How to Set Up CDK Pipelines for Automated Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- CDK Pipelines
- AWS CodePipeline
- AWS CodeConnections
- AWS CodeCommit
- AWS CodeStar Notifications
- Amazon SNS
- cfn-nag
- TypeScript
- CDK CLI bootstrapping

## Sources Consulted
- AWS CDK v2 CDK Pipelines guide: https://docs.aws.amazon.com/cdk/v2/guide/cdk-pipeline.html
- AWS CDK Pipelines API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html
- AWS CDK CodePipelineSource API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipelineSource.html
- AWS CDK bootstrapping customization guide: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-customizing.html
- AWS CDK NotificationRule API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codestarnotifications.NotificationRule.html
- AWS CDK ManualApprovalStep API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.pipelines/ManualApprovalStep.html
- AWS DevOps Blog, The Future of AWS CodeCommit: https://aws.amazon.com/blogs/devops/aws-codecommit-returns-to-general-availability/
- cfn-nag project documentation: https://github.com/stelligent/cfn_nag
- Local CDK CLI help output: `npx cdk bootstrap --help`

## Issues Found
- The GitHub source example used `CodePipelineSource.gitHub()` with a GitHub OAuth token. AWS CDK documents this as no longer the recommended method and recommends `CodePipelineSource.connection()` for GitHub sources. Updated the example to use an AWS CodeConnections connection ARN.
- The cfn-nag installation command used `pip install cfn-nag`. cfn-nag is installed as a Ruby gem, so the command was changed to `gem install cfn-nag`.
- The cross-account bootstrap commands used `--trust` without `--cloudformation-execution-policies`. AWS CDK documentation states that `--cloudformation-execution-policies` must also be provided when `--trust` is used. Added the AdministratorAccess policy ARN to each target-account bootstrap command.

## Review Notes
The remaining CDK Pipelines constructs, stage/pre/post step usage, manual approval step, notification rule pattern, CodeCommit source example, and initial manual deployment explanation are consistent with the consulted AWS CDK documentation. The bootstrap policy uses `AdministratorAccess` because that is the AWS CDK documentation's common example, but production environments should usually scope this down according to organizational policy.
