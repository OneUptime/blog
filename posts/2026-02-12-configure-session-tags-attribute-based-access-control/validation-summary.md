# Validation Summary: How to Configure Session Tags for Attribute-Based Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- AWS STS session tags
- Attribute-based access control (ABAC)
- Amazon S3 bucket tags and bucket ABAC
- Amazon EC2 tag-based permissions
- Amazon DynamoDB ABAC
- AWS IAM Identity Center
- SAML federation
- AWS CLI
- boto3

## Sources Consulted
- AWS IAM User Guide: Pass session tags in AWS STS - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- boto3 STS assume_role reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts/client/assume_role.html
- AWS CLI s3api put-bucket-abac reference - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-abac.html
- Amazon S3 User Guide: Using tags with S3 general purpose buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/buckets-tagging.html
- Amazon S3 User Guide: Enabling ABAC in general purpose buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/buckets-tagging-enable-abac.html
- AWS Service Authorization Reference: Amazon EC2 actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS IAM User Guide: EC2 start or stop instances based on tags - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_ec2-start-stop-tags.html
- Amazon DynamoDB Developer Guide: Using attribute-based access control with DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/attribute-based-access-control.html
- Amazon DynamoDB Developer Guide: Troubleshooting common ABAC errors - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/abac-troubleshooting.html
- Amazon DynamoDB Developer Guide: Enabling ABAC in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/abac-enable-ddb.html
- AWS IAM User Guide: Configure SAML assertions for the authentication response - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml_assertions.html
- AWS IAM User Guide: Use SAML session tags for ABAC - https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_abac-saml.html
- AWS IAM Identity Center User Guide: Attributes for access control - https://docs.aws.amazon.com/singlesignon/latest/userguide/attributesforaccesscontrol.html
- AWS CLI sso-admin create-instance-access-control-attribute-configuration reference - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-instance-access-control-attribute-configuration.html

## Issues Found
- The S3 policy used `s3:ResourceTag/Project`, which is not the documented condition key for bucket-tag ABAC in the shown bucket-data pattern. Changed it to `s3:BucketTag/Project` and added `put-bucket-abac` commands because S3 general purpose bucket tag conditions apply only after bucket ABAC is enabled.
- The EC2 policy placed `ec2:DescribeInstances` under the same resource-tag condition as `StartInstances` and `StopInstances`. Moved describe access into the general read-only statement and scoped start/stop to EC2 instance ARNs with `ec2:ResourceTag/Project`.
- The DynamoDB policy used `dynamodb:ResourceTag/Project`, which DynamoDB documents as invalid for ABAC. Changed it to `aws:ResourceTag/Project` and scoped resources to DynamoDB table and index ARNs.
- The read-only statement compared `aws:PrincipalTag/Department` to itself, making the condition effectively meaningless. Changed it to require that the `Project` principal tag exists.
- The SAML section said the trust policy needed to allow transitive tag keys, but the shown policy only demonstrates allowing session tags through `sts:TagSession`. Corrected the wording.
- The cost tag enforcement explanation said resources are automatically tagged. The policy only denies create requests where the request tag does not match the principal tag, so the explanation now says it requires a matching project tag in create requests.
- The limitations section said tag keys are case-sensitive. STS session tag keys are not case-sensitive, although case is preserved, so the note now distinguishes session tag behavior from service/resource tag casing concerns.

## Review Notes
The boto3 `assume_role` examples use current parameters (`Tags`, `TransitiveTagKeys`, and `DurationSeconds`) and are syntactically valid. The IAM Identity Center CLI example matches the current AWS CLI shape for `create-instance-access-control-attribute-configuration`; the exact attribute paths still depend on the organization's configured identity source schema.
