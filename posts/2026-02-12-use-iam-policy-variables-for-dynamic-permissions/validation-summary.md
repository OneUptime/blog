# Validation Summary: How to Use IAM Policy Variables for Dynamic Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM policy variables and condition keys
- Amazon S3 authorization
- Amazon DynamoDB fine-grained access control
- Amazon EC2 tag-based authorization
- Terraform IAM policy generation

## Sources Consulted
- AWS IAM User Guide: IAM policy elements, variables, and tags - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM User Guide: AWS global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM User Guide: IAM JSON policy condition operators - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS Service Authorization Reference: Amazon EC2 actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference: AWS Identity and Access Management actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsidentityandaccessmanagementiam.html
- Amazon DynamoDB Developer Guide: Using IAM policy conditions for fine-grained access control - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
- Amazon S3 User Guide: How Amazon S3 works with IAM - https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html
- Terraform AWS Provider documentation: IAM policy documents and escaping AWS policy variables - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/iam-policy-documents

## Issues Found
- The EC2 team-based policy placed `ec2:DescribeInstances` in the same statement as `ec2:StartInstances` and `ec2:StopInstances` with `ec2:ResourceTag` conditions. AWS's EC2 service authorization reference lists only `ec2:Region` for `DescribeInstances`, so resource-tag authorization conditions do not apply to that action. I moved `ec2:DescribeInstances` to a separate unconditioned statement and updated the explanation.
- The post said unresolved policy variables resolve to an empty string. AWS documents unresolved variables as effectively null, with normal string condition operators not matching and some statements potentially becoming invalid. I corrected the explanation and the follow-up sentence about the `Null` safeguard.

## Review Notes
- The DynamoDB example correctly uses `ForAllValues:StringEquals` with `dynamodb:LeadingKeys`, which AWS requires for that condition key.
- The Terraform example correctly escapes IAM policy variables as `$${aws:username}` when using Terraform interpolation syntax.
- The internal link target exists in the repository.
