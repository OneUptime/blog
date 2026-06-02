# Validation Summary: How to Fix CloudFormation 'DELETE_FAILED' Stack Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- Amazon S3
- Amazon EC2 security groups and network interfaces
- AWS Lambda custom resources
- AWS IAM
- Amazon RDS
- Amazon DynamoDB
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CLI Command Reference: describe-stack-events - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-events.html
- AWS CLI Command Reference: delete-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CloudFormation User Guide: Delete a stack from the CloudFormation console - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-delete-stack
- AWS CloudFormation Template Reference: DeletionPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- Amazon S3 User Guide: Emptying a general purpose bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html
- Amazon S3 User Guide: Deleting object versions from a versioning-enabled bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html
- AWS CLI Command Reference: delete-objects - https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html
- AWS CLI Command Reference: describe-security-groups - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- Boto3 EC2 Reference: describe_network_interfaces filter names - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_network_interfaces.html
- AWS IAM User Guide: Delete roles or instance profiles - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_delete.html
- AWS CLI Command Reference: list-attached-role-policies - https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-role-policies.html
- AWS CloudFormation Template Reference: AWS::RDS::DBInstance - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html
- AWS CLI Command Reference: modify-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CloudFormation Template Reference: AWS::DynamoDB::Table - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- AWS CloudFormation User Guide: cfn-response module - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html
- AWS CloudFormation User Guide: Custom resource request and response reference - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref.html
- AWS Lambda Developer Guide: Building Lambda functions with Python - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html

## Issues Found
- The S3 cleanup example said `aws s3 rm --recursive` emptied versioned objects. AWS documents that recursive `rm` removes current objects but does not permanently remove all object versions or delete markers in versioned buckets. I changed the comment to say it empties current objects, then added a separate `list-object-versions` / `delete-objects` command for delete markers.
- The security group lookup only checked inbound rules with `ip-permission.group-id`. AWS CLI also exposes `egress.ip-permission.group-id`, so I added a matching egress lookup.
- The RDS deletion protection command disabled the flag but did not request immediate application. I added `--apply-immediately` so the command supports the described workflow of retrying stack deletion promptly.

## Review Notes
- The inline Lambda custom resource uses `cfnresponse`, which is valid for CloudFormation `ZipFile` Lambda code. A complete production template would also need the omitted IAM role and permissions for the cleanup Lambda, but the snippet is presented as a focused excerpt.
- The AWS CLI is not installed in this local environment, so command verification was performed against official AWS CLI and service documentation rather than local `aws --help` output.
