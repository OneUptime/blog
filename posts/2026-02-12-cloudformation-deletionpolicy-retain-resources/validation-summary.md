# Validation Summary: How to Use CloudFormation DeletionPolicy to Retain Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation `DeletionPolicy` and `UpdateReplacePolicy`
- AWS CLI
- Amazon RDS
- Amazon S3
- AWS KMS
- Amazon ElastiCache
- Amazon Redshift
- Amazon Neptune
- Amazon DocumentDB
- Amazon EC2 EBS volumes
- Amazon SQS
- Amazon DynamoDB
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CloudFormation Template Reference: `DeletionPolicy` attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CLI Command Reference: `cloudformation create-change-set` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CloudFormation User Guide: Import AWS resources into a CloudFormation stack manually - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-manually.html
- AWS CloudFormation User Guide: Creating a stack from existing resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-new-stack.html
- AWS CLI Command Reference: `cloudformation describe-stack-resources` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-resources.html
- AWS CLI Command Reference: `cloudformation list-stacks` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stacks.html
- AWS CloudFormation User Guide: View CloudFormation stack events - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/view-stack-events.html
- AWS CloudFormation Template Reference: `AWS::RDS::DBInstance` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- AWS CloudFormation Template Reference: `AWS::ElastiCache::CacheCluster` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-cachecluster.html
- AWS CloudFormation Template Reference: `AWS::KMS::Key` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-kms-key.html
- AWS CLI Command Reference: `rds describe-db-instances` - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html

## Issues Found
- The post said CloudFormation deletes every resource by default. AWS documents exceptions for `AWS::RDS::DBCluster` and standalone `AWS::RDS::DBInstance`, whose default policy is `Snapshot`, so the wording now says most resources are deleted by default.
- The post listed only three `DeletionPolicy` options. AWS now documents four template values, including `RetainExceptOnCreate`, so the options table was updated.
- The `Snapshot` support list omitted `AWS::DocDB::DBCluster` and `AWS::EC2::Volume`, both listed in AWS documentation. These resource types were added.
- Two RDS DB instance examples created new DB instances without master credentials. The examples now use `MasterUsername` with `ManageMasterUserPassword: true`, matching current CloudFormation support for RDS-managed master passwords.
- The deleted-stack tracking example implied `describe-stack-resources` could use a deleted stack name. AWS requires the unique stack ID for deleted stacks, so the command now shows a stack ARN and filters retained resources with `DELETE_SKIPPED`.
- The tracking section said CloudFormation has no built-in way to list retained resources from deleted stacks. AWS retains deleted stack resource details for up to 90 days, so the text now limits the tagging recommendation to longer-term tracking.
- The best-practices section said RDS snapshots have no ongoing costs. AWS documents that snapshots created by `Snapshot` continue to incur applicable charges, so the wording now says snapshots avoid keeping the database instance running.
- The best-practices section described orphaned database cost as negligible. This was softened because retained databases can continue to incur meaningful charges.

## Review Notes
The AWS CLI and `cfn-lint` were not installed in the local workspace, so validation was performed against official AWS documentation rather than local command help or template linting. The examples remain illustrative and omit production details such as subnet groups, VPC security groups, parameterized usernames, and engine-version choices.
