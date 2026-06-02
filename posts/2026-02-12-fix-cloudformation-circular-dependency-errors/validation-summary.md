# Validation Summary: How to Fix CloudFormation Circular Dependency Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- AWS EC2 security groups
- AWS Lambda
- AWS IAM
- Elastic IP addresses
- cfn-lint

## Sources Consulted
- AWS CloudFormation DependsOn attribute: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html
- AWS CloudFormation Conditions syntax: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html
- AWS CloudFormation Fn::Sub intrinsic function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html
- AWS CloudFormation AWS::EC2::SecurityGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- AWS CloudFormation AWS::EC2::SecurityGroupIngress: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroupingress.html
- AWS CloudFormation AWS::EC2::SecurityGroupEgress: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroupegress.html
- AWS CloudFormation AWS::Lambda::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation AWS::IAM::Role: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html
- AWS CloudFormation Elastic IP quick reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-ec2-elastic-ip.html
- AWS CloudFormation Linter repository: https://github.com/aws-cloudformation/cfn-lint

## Issues Found
- The post said conditions can create dependencies when conditions reference resources. CloudFormation conditions cannot reference resource logical IDs or resource attributes, so this was corrected to state that conditions can control creation but do not create resource dependencies by themselves.
- The fixed security group example omitted embedded egress rules from the load balancer security group while adding a separate egress resource. Because EC2 adds a default allow-all egress rule when no egress rules are specified, the example could unintentionally change the original restrictive egress behavior. A non-cross-referencing egress rule was added to suppress the default rule while keeping the cross-reference in a separate resource.
- The Lambda/IAM section described an IAM role policy as a resource-based policy. IAM policies attached to roles are identity-based policies, so the wording was corrected.
- The grep example searched for `Fn::Ref`, which is not a CloudFormation intrinsic function. The command was corrected to search for `Ref:` instead.

## Review Notes
cfn-lint was not installed in the local environment, so no local cfn-lint execution was performed. The command and claims were checked against the official AWS CloudFormation Linter repository and AWS documentation.
