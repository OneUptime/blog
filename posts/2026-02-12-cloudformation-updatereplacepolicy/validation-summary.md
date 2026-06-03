# Validation Summary: How to Use CloudFormation UpdateReplacePolicy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation `UpdateReplacePolicy`
- CloudFormation `DeletionPolicy`
- CloudFormation change sets
- CloudFormation stack policies
- AWS CLI
- Amazon RDS
- Amazon S3
- Amazon DynamoDB
- Amazon EC2
- AWS Lambda
- AWS KMS
- Amazon ElastiCache

## Sources Consulted
- AWS CloudFormation Template Reference: UpdateReplacePolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html
- AWS CloudFormation Template Reference: DeletionPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CloudFormation User Guide: Prevent updates to stack resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html
- AWS CloudFormation Template Reference: AWS::RDS::DBInstance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
- AWS CloudFormation Template Reference: AWS::DynamoDB::Table - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- AWS CloudFormation Template Reference: AWS::EC2::Instance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation Template Reference: AWS::ElastiCache::CacheCluster - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-cachecluster.html
- AWS CLI Command Reference: cloudformation create-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CLI Command Reference: cloudformation describe-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-change-set.html

## Issues Found
- The replacement flow diagram showed CloudFormation deleting the old resource before evaluating `UpdateReplacePolicy`, and the `Snapshot` branch said the snapshot was destroyed. Updated the diagram so the policy decision controls whether the old resource is deleted, retained, or snapshotted before deletion.
- The post said `DeletionPolicy` only applies on stack deletion. Updated the text to include its behavior when a resource is removed from a template during a stack update, while preserving the key point that it does not protect replaced resources.
- The RDS replacement trigger list included `Engine` and `AvailabilityZone`, but the current `AWS::RDS::DBInstance` reference lists those as requiring some interruption rather than replacement. Replaced them with documented replacement-triggering properties.
- The DynamoDB replacement trigger list said changing key schema attributes causes replacement. Current docs list `KeySchema` as requiring some interruptions, while editing an existing `AttributeDefinitions` entry can require replacement. Updated the bullet accordingly.
- The change-set query only surfaced `Replacement == True`, missing `Conditional` replacements. Updated the query to include both `True` and `Conditional`, and to display the replacement status.
- The RDS ARN example used a 9-digit account ID. Updated it to a 12-digit AWS account ID.
- The best-practice section said snapshots have no ongoing costs. AWS documentation states snapshots continue to incur charges until deleted, so the text now says snapshots avoid keeping the old resource running but still incur storage costs.
- The closing sentence overpromised that resources survive any CloudFormation operation. Updated it to say resources are retained or backed up during CloudFormation operations.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI syntax was verified against the official AWS CLI Command Reference rather than local `aws --help` output.
