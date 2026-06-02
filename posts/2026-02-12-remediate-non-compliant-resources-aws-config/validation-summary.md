# Validation Summary: How to Remediate Non-Compliant Resources with AWS Config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Config
- AWS Systems Manager Automation runbooks
- AWS CLI
- AWS Lambda
- Python and Boto3
- Terraform AWS provider
- Amazon S3
- Amazon EC2 and EBS
- Amazon SNS
- AWS CloudTrail

## Sources Consulted
- AWS CLI Command Reference: `put-remediation-configurations` - https://docs.aws.amazon.com/cli/latest/reference/configservice/put-remediation-configurations.html
- AWS CLI Command Reference: `describe-remediation-execution-status` - https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-remediation-execution-status.html
- AWS CLI Command Reference: `ssm create-document` - https://docs.aws.amazon.com/cli/latest/reference/ssm/create-document.html
- AWS Config Developer Guide: Setting Up Auto Remediation - https://docs.aws.amazon.com/config/latest/developerguide/setup-autoremediation.html
- AWS Config API Reference: RemediationConfiguration - https://docs.aws.amazon.com/config/latest/APIReference/API_RemediationConfiguration.html
- AWS Config managed rule: `S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED` - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config managed rule: `VPC_DEFAULT_SECURITY_GROUP_CLOSED` - https://docs.aws.amazon.com/config/latest/developerguide/vpc-default-security-group-closed.html
- AWS Config managed rule: `ENCRYPTED_VOLUMES` - https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS Systems Manager Automation runbook: `AWS-EnableS3BucketEncryption` - https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enableS3bucketencryption.html
- AWS Systems Manager Automation runbook: `AWS-DisablePublicAccessForSecurityGroup` - https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-disablepublicaccessforsecuritygroup.html
- AWS Systems Manager Automation runbook: `AWS-EnableCloudTrail` - https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enablecloudtrail.html
- AWS Systems Manager Automation runbook: `AWSConfigRemediation-EnableEbsEncryptionByDefault` - https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-aws-enable-ebs-encryption.html
- AWS Systems Manager Automation runbook: `AWS-ConfigureS3BucketLogging` - https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-aws-configures3bucketlogging.html
- AWS Systems Manager Automation runbook: `AWS-EnableCLBAccessLogs` - https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/enable-clb-access-logs.html
- AWS Systems Manager Automation runbook: `AWS-PublishSNSNotification` - https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-aws-publishsnsnotification.html
- AWS Systems Manager Automation action: `aws:invokeLambdaFunction` - https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-lamb.html
- Boto3 EC2 `create_tags` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/create_tags.html
- Boto3 S3 bucket tagging references - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_bucket_tagging.html and https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_bucket_tagging.html
- Terraform AWS provider: `aws_config_remediation_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration

## Issues Found
- AWS Config remediation was described as targeting either an SSM document or Lambda directly. AWS Config remediation target type is `SSM_DOCUMENT`; Lambda can be invoked from an SSM Automation runbook. Updated the explanation and diagram.
- The manual and automatic remediation examples omitted `AutomationAssumeRole`. AWS Config documentation requires an assume-role parameter for manual remediation and specifically `AutomationAssumeRole` for automatic remediation. Added the parameter to the AWS CLI and Terraform examples.
- The automatic security group example paired the `vpc-default-security-group-closed` rule with `AWS-DisablePublicAccessForSecurityGroup`, but that runbook disables public SSH/RDP ingress rules rather than closing all default security group rules. Updated the example to describe and name a security-group rule such as `restricted-ssh`.
- The automatic remediation retry explanation was incomplete. Updated it to state that AWS Config adds a remediation exception after the configured failed attempts occur within the retry window.
- The common SSM documents table listed `AWS-EnableEbsEncryptionByDefault` and `AWS-EnableCLBAccessLogging`, which do not match the documented runbook names. Corrected them to `AWSConfigRemediation-EnableEbsEncryptionByDefault` and `AWS-EnableCLBAccessLogs`.
- The table descriptions for `AWS-DisablePublicAccessForSecurityGroup` and `AWS-EnableCloudTrail` were too broad. Updated them to match the documented runbook behavior.
- The custom Lambda remediation was wired to `AWS::EC2::Volume` resources but the Lambda code only tagged EC2 instances and S3 buckets. Updated the Lambda code to tag EC2 volumes with `ec2.create_tags`.

## Review Notes
- Amazon S3 now applies SSE-S3 as the base level of encryption for all bucket uploads, but the AWS Config rule and SSM runbook discussed in the post are still documented and valid for managing default bucket encryption configuration.
- `AWS-ConfigureS3BucketLogging` uses S3 bucket logging APIs with ACL-related parameters. AWS documentation notes Email Grantee ACL support ended for new ACL creation on October 1, 2025, but the runbook remains documented.
