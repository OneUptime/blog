# Validation Summary: How to Set Up Systems Manager Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager Inventory
- AWS Systems Manager State Manager associations
- AWS CLI
- Amazon S3
- AWS Systems Manager resource data sync
- Amazon Athena
- AWS Glue
- AWS CloudFormation

## Sources Consulted
- AWS Systems Manager User Guide: AWS Systems Manager Inventory - https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-inventory.html
- AWS Systems Manager User Guide: Using the AWS CLI to configure inventory data collection - https://docs.aws.amazon.com/systems-manager/latest/userguide/inventory-collection-cli.html
- AWS Systems Manager User Guide: Walkthrough: Using resource data sync to aggregate inventory data - https://docs.aws.amazon.com/systems-manager/latest/userguide/inventory-resource-data-sync.html
- AWS Systems Manager User Guide: Working with custom inventory - https://docs.aws.amazon.com/systems-manager/latest/userguide/inventory-custom.html
- AWS CLI Command Reference: list-inventory-entries - https://docs.aws.amazon.com/cli/latest/reference/ssm/list-inventory-entries.html
- AWS CLI Command Reference: put-inventory - https://docs.aws.amazon.com/cli/latest/reference/ssm/put-inventory.html
- AWS CLI Command Reference: create-resource-data-sync - https://docs.aws.amazon.com/cli/latest/reference/ssm/create-resource-data-sync.html
- AWS CLI Command Reference: describe-association-executions - https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-association-executions.html
- AWS CloudFormation Template Reference: AWS::SSM::Association - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ssm-association.html
- AWS CloudFormation Template Reference: AWS::SSM::ResourceDataSync S3Destination - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ssm-resourcedatasync-s3destination.html

## Issues Found
- The Services inventory type was described as Windows-only. AWS lists Services as a supported Inventory metadata type without marking it Windows-only, so the parenthetical was removed.
- The Athena query for SSM Agent versions used `ssm_inventory.aws_component`. AWS's resource data sync Athena examples create the AWS components table as `AWS_AWSComponent`, so the query was updated to `ssm_inventory.aws_awscomponent`.
- The CloudFormation example created an `AWS::SSM::ResourceDataSync` without an S3 bucket policy allowing Systems Manager to write inventory data. Added an `AWS::S3::BucketPolicy` and made the resource data sync depend on it.
- The monitoring command used `aws ssm list-association-executions`, which is not an AWS CLI SSM command. Updated it to `aws ssm describe-association-executions`, which is the documented operation for viewing association execution history.

## Review Notes
The local environment did not have the AWS CLI installed, so command verification was done against official AWS CLI documentation rather than local `aws ... help` output. The post's examples remain illustrative and still require readers to replace placeholder instance IDs, bucket names, Regions, and association IDs with their own values.
