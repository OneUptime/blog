# Validation Summary: How to Use CloudFormation Fn::ImportValue for Stack Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation intrinsic functions (`Fn::ImportValue`, `Fn::Sub`, `Fn::Split`, `Fn::Select`)
- CloudFormation outputs and exports
- AWS CLI CloudFormation commands
- Amazon EC2
- Amazon RDS
- AWS Lambda
- AWS Systems Manager Parameter Store
- IAM roles and managed policies

## Sources Consulted
- AWS CloudFormation `Fn::ImportValue` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- AWS CloudFormation `Fn::Sub` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html
- AWS CloudFormation `AWS::EC2::Instance` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-instance.html
- Amazon Linux 2023 CloudFormation AMI parameter documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- AWS CloudFormation `AWS::RDS::DBInstance` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html
- AWS CloudFormation `AWS::EC2::SecurityGroup` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroup.html
- AWS CloudFormation plaintext SSM dynamic references documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html
- AWS CloudFormation secure SSM dynamic references documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html
- AWS CloudFormation `AWS::Lambda::Function` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CLI `cloudformation deploy` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- AWS CLI `cloudformation list-imports` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-imports.html

## Issues Found
- The post used short-form `!ImportValue` with nested short-form `!Sub`, which AWS explicitly disallows. Changed those examples to full-form `Fn::ImportValue` with `Fn::Sub`.
- The EC2 instance example omitted `ImageId`, which is required unless supplied through a launch template. Added a `LatestAmiId` SSM parameter and referenced it from the instance.
- The RDS `AWS::RDS::DBInstance` example omitted allocated storage for the PostgreSQL instance. Added `AllocatedStorage: 20`.
- The SSM Parameter Store alternative security group example omitted the required `GroupDescription` property. Added a description.

## Review Notes
- The post's cross-stack reference behavior, same-account/same-region limitation, export lock explanation, and `list-imports` command are consistent with AWS documentation.
- The AWS CLI was not installed locally, so CLI commands were verified against the official AWS CLI command reference instead of local `--help` output.
- All seven YAML snippets in the edited Markdown were parsed locally with CloudFormation tags accounted for.
