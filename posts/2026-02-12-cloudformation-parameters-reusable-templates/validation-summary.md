# Validation Summary: How to Use CloudFormation Parameters for Reusable Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation template parameters
- AWS-specific CloudFormation parameter types
- AWS Systems Manager Parameter Store parameter types
- AWS CLI for CloudFormation stack deployment
- Amazon EC2, Amazon RDS, and Route 53 resource references

## Sources Consulted
- AWS CloudFormation User Guide: Parameters section structure: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html
- AWS CloudFormation User Guide: CloudFormation-supplied parameter types: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- AWS CloudFormation User Guide: Systems Manager Parameter Store dynamic references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html
- AWS CLI Command Reference: cloudformation deploy: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- AWS CLI Command Reference: cloudformation create-stack: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html

## Issues Found
- The post stated that AWS-specific parameter types render as dropdown menus in the CloudFormation Console. AWS documentation confirms that AWS-specific parameter types provide validation, but also notes exceptions such as `AWS::EC2::Image::Id` and `List<AWS::EC2::Image::Id>`, which do not show console dropdowns. Changed the wording to say that many AWS-specific parameter types provide dropdown menus.

## Review Notes
- The CloudFormation parameter attributes, intrinsic function usage, SSM parameter type example, and AWS CLI commands are consistent with current AWS documentation.
- The larger template includes a `SubnetIds` parameter but does not use it. This is not a syntax error, but a future improvement would be to connect the database or application resources to those subnets explicitly if the example is expanded.
