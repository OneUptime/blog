# Validation Summary: How to Use CloudFormation Nested Stacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- CloudFormation nested stacks
- AWS::CloudFormation::Stack
- AWS CloudFormation intrinsic functions
- AWS CLI
- Amazon S3
- Amazon VPC and EC2 networking resources
- Elastic Load Balancing v2

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::CloudFormation::Stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-stack.html
- AWS CloudFormation User Guide: Split a template into reusable pieces using nested stacks - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html
- AWS CloudFormation User Guide: Understand CloudFormation quotas - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS CLI Command Reference: aws cloudformation package - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html
- AWS CLI Command Reference: aws cloudformation deploy - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy/
- AWS CLI Command Reference: aws cloudformation describe-stack-events - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-events.html
- AWS CloudFormation Template Reference: AWS::ElasticLoadBalancingV2::LoadBalancer - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-loadbalancer.html
- AWS CloudFormation Template Reference: AWS::EC2::Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroup.html

## Issues Found
- The `aws cloudformation package` section said the command would automate child-template uploads while the earlier parent template used S3 `TemplateURL` values. AWS CLI package only uploads and rewrites local artifact references, including local `AWS::CloudFormation::Stack` `TemplateURL` paths. Updated the text and comment to state that `TemplateURL` must use local paths such as `templates/network.yaml` and `templates/application.yaml` for that workflow.

## Review Notes
The CloudFormation nested stack syntax, nested output references, template size limits, AWS CLI deployment flags, and resource property names were consistent with current AWS documentation. The `InstanceType` parameter in the application child template is unused; it is harmless but could be removed in a future cleanup if no instance resource is added.
