# Validation Summary: How to Write IAM Policy Conditions for Tag-Based Access Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM policy conditions and policy variables
- AWS attribute-based access control (ABAC)
- Amazon EC2 resource tags and tag-on-create authorization
- Amazon S3 object tag condition keys
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS IAM User Guide: IAM policy elements, variables, and tags - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM User Guide: Condition operators and multivalued context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM User Guide: Conditions with multiple context keys or values - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-logic-multiple-context-keys-or-values.html
- Amazon EC2 User Guide: Grant permission to tag Amazon EC2 resources during creation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon EC2 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- Amazon S3 User Guide: Tagging and access control policies - https://docs.aws.amazon.com/AmazonS3/latest/userguide/tagging-and-policies.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS CLI Command Reference: iam tag-user - https://docs.aws.amazon.com/cli/latest/reference/iam/tag-user.html
- AWS CLI Command Reference: ec2 create-tags - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-tags.html
- Terraform Language Documentation: Strings and Templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform Registry: aws_iam_policy and aws_iam_user resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy

## Issues Found
- The opening example mixed an S3 bucket ARN with the EC2-specific `ec2:ResourceTag/Team` condition key after correction. I changed the ARN to an EC2 instance ARN so the example uses one service's resource and condition-key model consistently.
- The tag-modification deny policy would also deny `ec2:CreateTags` during `RunInstances` tag-on-create when the `Team` tag is present, conflicting with the earlier creation policy. I added a `StringNotEqualsIfExists` condition for `ec2:CreateAction` so the deny applies to existing-resource tag changes but not to tag-on-create for `RunInstances`.
- The S3 policy used `s3:ExistingObjectTag/Team` for both `s3:GetObject` and `s3:PutObject`. AWS documents that existing object tag conditions are not supported for `PUT Object`; I split the statement so reads use `s3:ExistingObjectTag/Team` and writes use `s3:RequestObjectTag/Team`.

## Review Notes
The examples are intentionally simplified. Real EC2 `RunInstances` policies often need additional resource ARNs or conditions for launch templates, key pairs, IAM instance profiles, or other resources depending on how instances are launched.
