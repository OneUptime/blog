# Validation Summary: How to Fix CloudFormation 'Export with name already exists' Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- AWS Systems Manager Parameter Store
- YAML CloudFormation templates

## Sources Consulted
- AWS CloudFormation User Guide: Get exported outputs from a deployed CloudFormation stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html
- AWS CloudFormation Template Reference: Fn::ImportValue - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- AWS CloudFormation User Guide: Outputs syntax - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
- AWS CLI Command Reference: cloudformation list-exports - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-exports.html
- AWS CloudFormation User Guide: Get a plaintext value from Systems Manager Parameter Store - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html
- AWS Systems Manager User Guide: Creating Parameter Store parameters - https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-create.html
- AWS CloudFormation Template Reference: AWS::SSM::Parameter - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ssm-parameter.html

## Issues Found
- The SSM Parameter Store section said there is no uniqueness constraint on parameter names. AWS Systems Manager requires parameter names to be unique within a Region, so I changed the text to clarify that SSM avoids the CloudFormation export-name constraint while parameter names are still regionally unique.
- The SSM Parameter Store section said values can be updated without stack updates. CloudFormation dynamic references are resolved on stack create or update, and AWS recommends updating stacks that use unversioned SSM dynamic references after parameter changes. I changed the text to say parameter values can be updated independently, but consuming stacks need a stack update to re-resolve the latest value.
- The orphaned stack section implied a partially deployed failed stack could leave exports behind. CloudFormation outputs are available after stack operations complete, so I changed the wording to focus on old stacks or stacks that retained existing exports after failed updates or rollbacks.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference instead of local `aws --help` output. The internal OneUptime link points to an existing local post directory with the matching slug.
