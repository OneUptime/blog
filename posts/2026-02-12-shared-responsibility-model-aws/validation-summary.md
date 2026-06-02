# Validation Summary: How to Implement the Shared Responsibility Model on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS shared responsibility model
- Amazon EC2 security groups
- AWS Lambda managed runtimes
- AWS IAM and IAM Identity Center
- Terraform AWS provider
- Python and boto3
- Amazon S3 and AWS KMS
- AWS CloudFormation
- AWS Systems Manager Patch Manager
- Amazon GuardDuty and Amazon EventBridge
- AWS Config managed rules

## Sources Consulted
- AWS Shared Responsibility Model: https://aws.amazon.com/compliance/shared-responsibility-model/
- AWS Lambda runtime shared responsibility: https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-shared.html
- Terraform AWS provider `aws_iam_account_password_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_account_password_policy
- Terraform AWS provider `aws_ssm_patch_baseline`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_patch_baseline
- Terraform AWS provider `aws_ssm_patch_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_patch_group
- Terraform AWS provider `aws_ssm_maintenance_window_task`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_maintenance_window_task
- boto3 EC2 `describe_security_groups`: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_security_groups.html
- boto3 EC2 `modify_instance_attribute`: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/modify_instance_attribute.html
- AWS CloudFormation `AWS::S3::Bucket`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
- AWS CloudFormation S3 `LoggingConfiguration`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-loggingconfiguration.html
- Amazon S3 server access logging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- Amazon S3 bucket policies for HTTPS enforcement: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS Systems Manager Patch Manager patch groups: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-patch-groups.html
- AWS Systems Manager `AWS-RunPatchBaseline`: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html
- Amazon GuardDuty EventBridge findings: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- AWS Config managed rules: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html
- AWS Config `ENCRYPTED_VOLUMES`: https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS Config `ROOT_ACCOUNT_MFA_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html
- AWS Config `S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html

## Issues Found
- The Lambda responsibility explanation overstated AWS's runtime responsibility. Updated it to clarify that AWS applies managed runtime updates when automatic runtime updates are used, while customers still own code, IAM, and runtime update settings.
- The IAM Terraform snippet created an MFA enforcement policy but did not attach it anywhere. Added an IAM group and policy attachment so the policy is actually enforceable for users placed in that group.
- The security group audit script only read the first `describe_security_groups` response page and only checked IPv4 `0.0.0.0/0`. Updated it to use the boto3 paginator and flag IPv6 `::/0` as well.
- The S3 CloudFormation snippet referenced `DataEncryptionKey` and `LoggingBucket` without defining them. Added a KMS key, logging bucket, logging bucket policy for the S3 logging service principal, and an explicit bucket policy version.
- The SSM patching Terraform snippet created a baseline, window, and target but did not register the patch group or run `AWS-RunPatchBaseline`. Added `aws_ssm_patch_group` and `aws_ssm_maintenance_window_task` using `Operation = Install`.
- The GuardDuty Lambda snippet used uppercase finding keys such as `Resource`, `ResourceType`, and `InstanceDetails`, but GuardDuty EventBridge finding details use lower-camel-case fields. Updated the code to use `resource`, `resourceType`, `instanceDetails`, and related lower-camel-case fields.
- The GuardDuty isolation code used `modify_instance_attribute`, which can fail for instances with multiple network interfaces, and assumed a newly created security group has no traffic rules even though security groups can have default egress. Updated it to remove existing egress from the isolation group and modify each network interface's security groups.

## Review Notes
Python snippets were parsed successfully with Python's `ast` module. Terraform and `cfn-lint` are not installed in this workspace, so the Terraform and CloudFormation snippets were verified against official documentation rather than local validation tools. The two referenced OneUptime links returned HTTP 200.
