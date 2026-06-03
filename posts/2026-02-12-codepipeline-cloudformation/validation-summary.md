# Validation Summary: How to Use CodePipeline with CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline
- AWS CloudFormation
- AWS CodeBuild
- AWS IAM
- AWS CLI
- Amazon EC2
- AWS Systems Manager Parameter Store
- cfn-lint

## Sources Consulted
- AWS CodePipeline CloudFormation deploy action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html
- AWS CloudFormation artifacts and template configuration file format: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-cfn-artifacts.html
- AWS CodePipeline CodeStarSourceConnection action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline service role policy documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-custom-role.html
- AWS CloudFormation AWS::EC2::Instance reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
- AWS CloudFormation supplied Systems Manager parameter types: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- Amazon EC2 public AMI parameters in Systems Manager Parameter Store: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- AWS CLI cloudformation validate-template command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/validate-template.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CloudFormation service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscloudformation.html

## Issues Found
- The sample `AWS::EC2::Instance` did not specify an AMI. `ImageId` is required unless the instance uses a launch template, so I added a Systems Manager public AMI parameter and referenced it from `ImageId`.
- The EC2 example created a VPC security group but did not place the instance in a subnet. I added a `SubnetId` import so the instance and security group are in the intended VPC.
- The CodeBuild validation step uses `aws cloudformation validate-template`, but the post did not mention that the CodeBuild service role needs `cloudformation:ValidateTemplate`. I added that permission note.
- The pipeline service role policy omitted several permissions used by the shown pipeline flow, including CloudFormation describe/template reads, S3 object version access, and CodeConnections/CodeStar Connections `UseConnection`. I updated the example policy.
- The CodeStar connection ARN example used a 9-digit account placeholder. I corrected it to a 12-digit account ID.
- The multi-environment change set example omitted fields required for `CHANGE_SET_REPLACE` and `CHANGE_SET_EXECUTE`, including `TemplatePath`, `RoleArn`, and `ChangeSetName`. I added the missing configuration fields to the fragment.

## Review Notes
- The examples are still intentionally simplified and use placeholder import names, stack names, bucket names, and ARNs. Readers must replace these with values from their own AWS account.
- `AdministratorAccess` on the CloudFormation execution role is correctly called out as something to scope down for production.
