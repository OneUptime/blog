# Validation Summary: How to Deploy SAM Applications with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Serverless Application Model (AWS SAM)
- AWS SAM CLI
- GitHub Actions
- AWS CodePipeline
- AWS CodeBuild
- AWS CloudFormation
- AWS Lambda
- AWS CodeDeploy gradual deployments
- Amazon EventBridge
- Amazon SNS
- Python / pytest

## Sources Consulted
- AWS SAM CLI `sam pipeline init` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-pipeline-init.html
- AWS SAM starter CI/CD pipeline documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-generating-example-ci-cd.html
- AWS SAM `sam build` command reference and container build behavior: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html
- AWS SAM `sam deploy` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
- AWS CodePipeline CloudFormation resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codepipeline-pipeline.html
- AWS CodePipeline CloudFormation deploy action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html
- AWS SAM `DeploymentPreference` reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-deploymentpreference.html
- GitHub Actions deployment environments documentation: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- GitHub Actions required deployment reviews documentation: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- Official `aws-actions/setup-sam` action documentation: https://github.com/aws-actions/setup-sam
- Official `aws-actions/configure-aws-credentials` action documentation: https://github.com/marketplace/actions/configure-aws-credentials-action-for-github-actions
- AWS CodePipeline EventBridge event monitoring documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html

## Issues Found
- The SAM pipeline support list omitted Jenkins, which AWS SAM documents as one of the supported starter pipeline targets. Added Jenkins to the supported CI/CD systems list.
- The GitHub Actions examples used an older major version of `aws-actions/configure-aws-credentials`. Updated the examples to the current documented major version.
- The CodePipeline CloudFormation example omitted the required `ArtifactStore` / `ArtifactStores` pipeline configuration. Added an S3 `ArtifactStore` reference.
- The CodePipeline CloudFormation deploy action used `ActionMode: CREATE_UPDATE` without a CloudFormation execution `RoleArn`, which AWS documents as required for that action mode. Added a `CloudFormationDeployRole` reference.
- The multi-environment GitHub Actions snippet ran `sam deploy` without configuring AWS credentials in either job. Added credential setup to both deployment jobs.
- The multi-environment GitHub Actions snippet used minimal `sam deploy` commands that would be fragile in non-interactive CI when deployment artifacts require S3 packaging. Added the same non-interactive deployment flags used in the main example.
- The monitoring section referred to CloudWatch Events as the primary event rule service. Updated the wording to Amazon EventBridge rules, which AWS documents as the preferred way to manage these events.

## Review Notes
- The examples still use long-lived AWS access keys in GitHub secrets because the original post used that pattern and it remains supported. For future improvement, consider showing GitHub OIDC with `role-to-assume` as the preferred security posture.
- The CodePipeline template remains intentionally simplified and still assumes supporting resources such as IAM roles, artifact buckets, and the CodeBuild project are defined elsewhere.
