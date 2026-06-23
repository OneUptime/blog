# Validation Summary: How to Understand AssumeRole with EC2 Service

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- AWS IAM roles and trust policies
- Amazon EC2 instance profiles
- Amazon EC2 Instance Metadata Service (IMDS/IMDSv2)
- AWS STS AssumeRole
- Terraform AWS provider
- AWS SDK for Python (Boto3)
- AWS CloudTrail

## Sources Consulted
- AWS IAM User Guide: Use an IAM role to grant permissions to applications running on Amazon EC2 instances - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html
- AWS EC2 User Guide: Retrieve security credentials from instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS IAM User Guide: Use instance profiles - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- AWS IAM User Guide: Access to AWS accounts owned by third parties - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- AWS STS API Reference: AssumeRole - https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS CloudTrail User Guide: CloudTrail userIdentity element - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html
- Boto3 STS client reference: assume_role - https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/assume_role.html
- Boto3 Session reference: client credential arguments - https://docs.aws.amazon.com/boto3/latest/reference/core/session.html
- Terraform AWS provider: aws_iam_role - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider: aws_iam_instance_profile - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform AWS provider: aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The original explanation and sequence diagram implied that IMDS itself sends an `AssumeRole` request to STS when the instance asks for credentials. Updated the wording and diagram to show that AWS delivers temporary credentials for the attached IAM role through IMDS, while the workload retrieves those credentials from IMDS.
- The IAM role section said the role defines the instance permissions. Clarified that the trust policy defines who can assume the role, while permissions are attached separately through IAM policies.
- The Terraform section called the snippet a "complete working example" even though it references surrounding resources such as the S3 bucket, DynamoDB table, and subnet. Changed this to "complete role and instance profile example."
- The troubleshooting section advised looking for `AssumeRole` events generally. Clarified that explicit cross-account role switching produces `AssumeRole` events, while the instance role should also be traced through CloudTrail entries for API calls made with assumed-role credentials.
- The best-practice guidance said to use external IDs for cross-account roles broadly. Narrowed this to third-party cross-account roles, matching AWS guidance for confused deputy prevention.

## Review Notes
The Terraform resource types and arguments, IMDSv2 token command pattern, Boto3 `assume_role` call shape, and instance profile configuration were verified against current official documentation and are valid. The examples still rely on placeholder resources and account IDs, so readers must replace those with real resources in their own environment.
