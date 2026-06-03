# Validation Summary: How to Create an IAM User in AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Management Console
- AWS CLI
- AWS IAM MFA
- AWS IAM password policies
- AWS CloudFormation
- Terraform AWS provider
- AWS CloudTrail
- AWS IAM Access Analyzer

## Sources Consulted
- AWS IAM User Guide: IAM users - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html
- AWS IAM User Guide: Create an IAM user in your AWS account - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html
- AWS CLI Command Reference: create-login-profile - https://docs.aws.amazon.com/cli/latest/reference/iam/create-login-profile.html
- AWS CLI Command Reference: create-virtual-mfa-device - https://docs.aws.amazon.com/cli/latest/reference/iam/create-virtual-mfa-device.html
- AWS CLI Command Reference: update-account-password-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/update-account-password-policy.html
- AWS IAM User Guide: Manage access keys for IAM users - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- AWS IAM Access Analyzer documentation: unused access findings - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings.html
- AWS CloudFormation Template Reference: AWS::IAM::User - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-user.html
- Terraform Registry: aws_iam_user_login_profile - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_login_profile

## Issues Found
- The console username guidance suggested using the person's email address as an IAM user name. AWS documentation notes that IAM user names appear in ARNs and recommends not including personally identifying information in IAM names. Changed the recommendation to use a non-sensitive identifier.
- The CloudFormation example referenced `DeveloperGroup` but did not define that resource, so the template would not deploy as shown. Added a minimal `AWS::IAM::Group` resource that the user can reference.
- The Terraform example referenced `aws_iam_group.developers.name` but did not define the group resource in the snippet. Added a minimal `aws_iam_group` resource so the example is syntactically complete.

## Review Notes
The CLI commands and options for creating users, login profiles, access keys, virtual MFA devices, password policies, policy attachments, and access key status updates match the AWS CLI documentation. The Terraform login profile example is technically valid, but for production use a PGP key or another secure password handoff mechanism is preferable to leaving generated passwords available in plaintext Terraform state.
