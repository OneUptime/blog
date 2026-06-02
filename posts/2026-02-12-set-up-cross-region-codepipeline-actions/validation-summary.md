# Validation Summary: How to Set Up Cross-Region CodePipeline Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline
- Cross-Region CodePipeline actions
- Amazon S3 artifact stores
- AWS KMS encryption for artifacts
- AWS CodeBuild buildspecs
- Amazon ECS standard deploy actions
- Amazon ECR cross-Region replication
- AWS CloudFormation deploy actions
- IAM service role permissions

## Sources Consulted
- AWS CodePipeline: Add a cross-Region action in CodePipeline - https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-create-cross-region.html
- AWS CodePipeline: Pipeline declaration / artifactStores - https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-requirements.html
- AWS CLI: codepipeline create-pipeline - https://docs.aws.amazon.com/cli/latest/reference/codepipeline/create-pipeline.html
- AWS CodePipeline: Amazon ECS deploy action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECS.html
- AWS CodePipeline: Image definitions file reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html
- Amazon ECR: Private image replication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html
- Amazon ECR: Configuring private image replication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-settings-configure.html
- AWS CLI: ecr put-replication-configuration - https://docs.aws.amazon.com/cli/latest/reference/ecr/put-replication-configuration.html
- AWS CodePipeline: CloudFormation deploy action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html
- AWS CodePipeline: Manage the CodePipeline service role - https://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-custom-role.html
- AWS CodePipeline: Configure server-side encryption for S3 artifacts - https://docs.aws.amazon.com/codepipeline/latest/userguide/S3-artifact-encryption.html

## Issues Found
- The post said cross-region actions can deploy to "any AWS region." AWS documents that cross-Region actions are limited to Regions where CodePipeline is supported and where the specific action provider is available. Changed this to "supported AWS Regions."
- The explanation said CodePipeline copies artifacts generally to the target Region. AWS documents that CodePipeline replicates only the input artifacts of the cross-Region action. Updated the wording to be more precise.
- The prerequisites only mentioned artifact buckets in target regions. AWS requires an artifact bucket in the pipeline Region and one per Region where actions execute. Updated the prerequisite.
- The `create-pipeline` command used `--pipeline file://pipeline.json` while the shown file was intended as a full CLI input file. Updated the command to `--cli-input-json file://pipeline.json` and wrapped the pipeline declaration under the required top-level `pipeline` key.
- The ECS deploy actions all referenced one `imagedefinitions.json` file with the primary Region image URI. For region-local ECR images, each ECS deploy action needs an image definition file that points to the ECR URI in that action's Region. Updated the ECS action `FileName` values and the buildspec to generate `imagedefinitions-us-east-1.json`, `imagedefinitions-eu-west-1.json`, and `imagedefinitions-ap-southeast-1.json`.
- The ECR replication note implied replication alone was enough for regional ECS deploys. Added a note that the image definition files still need region-specific image URIs and that secondary deployments should validate replication completion.
- The IAM example for ECS deploy actions was missing `ecs:DescribeTaskDefinition` and `iam:PassRole`, both required for typical ECS standard deploy actions through CodePipeline. Added these permissions with the documented `iam:PassedToService` condition.
- The S3 artifact permission example omitted `s3:GetObjectVersion` and `s3:GetBucketAcl`, which are included in AWS's CodePipeline service role guidance for artifact access. Added those permissions.

## Review Notes
The examples are intentionally account- and environment-specific, so bucket names, cluster names, service names, role ARNs, container names, and repository names still need to be replaced before use. For production, the IAM examples should be narrowed to specific buckets, roles, ECS services, and task roles rather than broad wildcard resources.
