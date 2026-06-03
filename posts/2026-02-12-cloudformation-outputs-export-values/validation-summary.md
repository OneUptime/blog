# Validation Summary: How to Use CloudFormation Outputs and Export Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation Outputs and Exports
- CloudFormation intrinsic functions: `Fn::ImportValue`, `Fn::Sub`, `Fn::Join`, `Fn::Split`, `Fn::GetAZs`, `Fn::Select`, `Ref`
- AWS CLI CloudFormation commands
- Amazon EC2 VPC, Subnet, Security Group, and Elastic Load Balancing resources

## Sources Consulted
- AWS CloudFormation User Guide: Get exported outputs from a deployed CloudFormation stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html
- AWS CloudFormation User Guide: CloudFormation template Outputs syntax - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
- AWS CloudFormation Template Reference: Fn::ImportValue - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- AWS CloudFormation Template Reference: Fn::Split - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-split.html
- AWS CloudFormation Template Reference: Fn::Sub - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html
- AWS CLI Command Reference: cloudformation describe-stacks - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stacks.html
- AWS CLI Command Reference: cloudformation list-exports - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-exports.html
- AWS CLI Command Reference: cloudformation list-imports - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-imports.html
- AWS CLI Command Reference: cloudformation deploy - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html

## Issues Found
- The application stack example used short-form `!ImportValue` with nested short-form `!Sub`. AWS CloudFormation documentation states that this combination is invalid. Changed the three nested imports to use the documented long-form `Fn::ImportValue` with short-form `!Sub` as its value.

## Review Notes
- The post's explanation of export-name uniqueness, same-account/same-Region import behavior, and the dependency lock for imported exports matches the current AWS CloudFormation documentation.
- The AWS CLI examples use valid CloudFormation commands and supported flags.
