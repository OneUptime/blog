# Validation Summary: How to Set Up App Runner with ECR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Runner
- Amazon Elastic Container Registry
- AWS Identity and Access Management
- AWS CLI
- Docker
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CLI Command Reference: `aws apprunner create-service` - https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-service.html
- AWS CLI Command Reference: `aws apprunner update-service` - https://docs.aws.amazon.com/cli/latest/reference/apprunner/update-service.html
- AWS CLI Command Reference: `aws ecr create-repository` - https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI Command Reference: `aws ecr describe-image-scan-findings` - https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-image-scan-findings.html
- AWS App Runner Developer Guide: App Runner service based on a source image - https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html
- AWS App Runner Developer Guide: Creating an App Runner service - https://docs.aws.amazon.com/apprunner/latest/dg/manage-create.html
- AWS App Runner Developer Guide: Deploying a new application version - https://docs.aws.amazon.com/apprunner/latest/dg/manage-deploy.html
- AWS App Runner Developer Guide: AWS App Runner availability change - https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- AWS Managed Policy Reference: AWSAppRunnerServicePolicyForECRAccess - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSAppRunnerServicePolicyForECRAccess.html
- Amazon ECR User Guide: Image scanning - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- AWS announcement: App Runner cross-region Amazon ECR image support - https://aws.amazon.com/about-aws/whats-new/2022/09/aws-app-runner-deployment-cross-region-amazon-ecr-image/

## Issues Found
- The opening description said App Runner triggers deployments whenever a new image appears in the ECR repository. I changed this to say App Runner watches the configured ECR source image and deploys when that image changes, which matches the App Runner source image deployment model.
- The ECR repository creation comment said "immutable tags" while the command used `--image-tag-mutability MUTABLE`. I changed the comment to "mutable tags" so it matches the command and the later `latest` tag strategy.
- The App Runner `update-service` and `create-service` examples used lower-camel-case JSON member names such as `imageRepository`, `imageIdentifier`, `autoDeploymentsEnabled`, `cpu`, and `protocol`. The AWS CLI App Runner parameter JSON syntax uses PascalCase member names, so I updated those examples to `ImageRepository`, `ImageIdentifier`, `AutoDeploymentsEnabled`, `Cpu`, `Protocol`, and the related documented field names.
- The text referenced `autoDeploymentsEnabled` after the corrected CLI example. I updated it to `AutoDeploymentsEnabled`.
- The cross-region ECR section implied that replication or pushing to both regions were the only options when the ECR repository and App Runner service are in different regions. AWS App Runner has supported deploying private ECR images across regions since 2022, so I updated the wording to state that direct cross-region deployment is supported and framed replication as optional for regional copies.
- The post did not mention the current AWS App Runner availability change. I added a concise note that, as of April 30, 2026, App Runner is closed to new AWS customers, while existing customers can continue using it and creating resources.

## Review Notes
The remaining examples are illustrative and use placeholder account IDs, ARNs, repository names, image tags, and regions. ECR image scanning behavior can differ between basic and enhanced scanning, but the post's `describe-image-scan-findings` examples remain valid for retrieving scan findings and severity counts.
