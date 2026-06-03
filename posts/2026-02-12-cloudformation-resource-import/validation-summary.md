# Validation Summary: How to Use CloudFormation Resource Import

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- CloudFormation resource import
- Amazon RDS
- Amazon EC2
- Amazon S3
- Amazon DynamoDB
- AWS Lambda
- AWS IAM
- Amazon SNS
- Amazon SQS
- CloudFormation drift detection

## Sources Consulted
- AWS CloudFormation User Guide: Import AWS resources into a CloudFormation stack manually - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-manually.html
- AWS CloudFormation User Guide: Importing existing resources into a stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-existing-stack.html
- AWS CloudFormation User Guide: Creating a stack from existing resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-new-stack.html
- AWS CloudFormation User Guide: Resource type support - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-supported-resources.html
- AWS CloudFormation User Guide: Moving resources between stacks - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/refactor-stacks.html
- AWS CLI Command Reference: cloudformation create-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CLI Command Reference: cloudformation wait stack-import-complete - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-import-complete.html
- AWS CloudFormation Template Reference: AWS::RDS::DBInstance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- AWS CLI Command Reference: cloudformation describe-stack-resource-drifts - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-resource-drifts.html

## Issues Found
- The introduction said resource import involved "no risk" and the explanation said imported resources are not modified. AWS documentation confirms resource import avoids recreation, but the RDS DBInstance reference specifically states that if the import template does not match the actual DB instance, CloudFormation applies the template changes during the import operation. I narrowed the wording to say the no-downtime/no-migration behavior depends on a matching template and updated the RDS-specific warning to say mismatches can be applied during import.
- The "Getting the Template Right" section said mismatched RDS properties may be updated after import. I changed this to "during import" for RDS DB instances, matching the CloudFormation Template Reference.

## Review Notes
The AWS CLI commands and flags used in the post match the official `create-change-set`, `execute-change-set`, `wait stack-import-complete`, and drift-detection command references. The post correctly notes that imported resources need `DeletionPolicy`, that the identifier property varies by resource type, that not all resource types support import, and that import change sets cannot include unrelated create, update, or delete operations. The local AWS CLI was not installed in the workspace, so command validation was performed against official AWS documentation rather than local `--help` output.
