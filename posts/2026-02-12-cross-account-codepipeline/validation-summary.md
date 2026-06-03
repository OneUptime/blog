# Validation Summary: How to Set Up Cross-Account CodePipeline Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild
- AWS CodeDeploy
- AWS IAM roles and policies
- AWS KMS customer managed keys
- Amazon S3 artifact buckets
- AWS CLI

## Sources Consulted
- AWS CodePipeline User Guide: Create a pipeline in CodePipeline that uses resources from another AWS account - https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create-cross-account.html
- AWS CodePipeline User Guide: Pipeline structure reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-pipeline-structure.html
- AWS CodePipeline User Guide: Action declaration - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-requirements.html
- AWS CodePipeline User Guide: AWS CodeDeploy deploy action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeDeploy.html
- AWS CodePipeline User Guide: CodeStarSourceConnection action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CLI Command Reference: deploy create-deployment-group - https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment-group.html
- AWS CLI Command Reference: kms create-key - https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS CLI Command Reference: iam create-role - https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html

## Issues Found
- The cross-account role trust policy allowed the tools account root principal and required `sts:ExternalId`. AWS's CodePipeline cross-account guidance has the target account role trusted by the CodePipeline service role from the pipeline account, and the pipeline action `roleArn` configuration does not provide an external ID. Updated the trust policy to trust `arn:aws:iam::111111111111:role/CodePipelineServiceRole` and removed the external ID condition.
- The CodeDeploy setup omitted the EC2 instance profile permissions required for instances in the target account to download pipeline artifacts and decrypt SSE-KMS encrypted artifacts. Added a policy snippet for the EC2 instance profile with S3 read and KMS decrypt permissions.
- The multi-account example was marked as JSON but included an invalid manual approval placeholder object. Replaced it with syntactically valid manual approval action placeholders using the `Approval` / `Manual` action type.

## Review Notes
- The pipeline JSON remains an illustrative example; a real `update-pipeline` workflow should start from `aws codepipeline get-pipeline`, remove metadata before updating, and include the full action declarations.
- The post correctly uses a customer managed KMS key ARN for the artifact store. AWS documentation notes that aliases are recognized only in the account that created the key, so cross-account actions should identify the key by key ID or key ARN.
