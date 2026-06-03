# Validation Summary: How to Create IAM Groups and Add Users

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS IAM user groups
- AWS IAM managed and customer managed policies
- AWS CLI for IAM
- Terraform AWS provider
- AWS CloudFormation IAM resources
- IAM Identity Center permission sets

## Sources Consulted
- AWS IAM User Guide: IAM user groups - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups.html
- AWS IAM User Guide: IAM and AWS STS quotas - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS CLI Command Reference: iam create-group - https://docs.aws.amazon.com/cli/latest/reference/iam/create-group.html
- AWS CLI User Guide: Using IAM in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-services-iam.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon EC2 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS IAM User Guide: EC2 start or stop instances based on tags - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_ec2-start-stop-match-tags.html
- AWS IAM User Guide: Permissions boundaries for IAM entities - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM Identity Center User Guide: Create, manage, and delete permission sets - https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsets.html
- Terraform AWS Provider Registry: aws_iam_group_policy_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment
- AWS CloudFormation Template Reference: AWS IAM resource types - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/AWS_IAM.html

## Issues Found
- The custom IAM policy combined `ec2:Describe*` with `ec2:StartInstances` and `ec2:StopInstances` in one statement that used an EC2 resource tag condition. EC2 start/stop can be tag-constrained, but describe/list-style actions generally need broad `Resource: "*"` access and should not be coupled to that resource tag condition. I split the read-only describe permission into its own statement and scoped start/stop to EC2 instance ARNs with the existing development tag condition.
- The text claimed developers could only manage EC2 instances tagged as development. Because the corrected policy still allows describing EC2 resources broadly, I changed the explanation to say they can describe EC2 resources and start/stop tagged development instances.
- The limits section suggested permission boundaries as a response to IAM group limits. AWS permissions boundaries apply to IAM users and roles, not groups, and they do not directly raise the group membership or managed-policy attachment limits. I changed the guidance to suggest policy consolidation or IAM Identity Center permission sets for workforce access.

## Review Notes
- The AWS CLI examples use current IAM commands and option names.
- The Terraform and CloudFormation examples use valid resource types and properties, but the Terraform snippet assumes referenced IAM users and the `aws_iam_policy.developer_access` resource are defined elsewhere in the configuration.
