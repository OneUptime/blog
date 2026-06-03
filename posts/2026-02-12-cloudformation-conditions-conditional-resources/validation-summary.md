# Validation Summary: How to Use CloudFormation Conditions for Conditional Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation Conditions and intrinsic functions
- Amazon EC2 NAT Gateway and Elastic IP
- Amazon RDS DBInstance
- Elastic Load Balancing Application Load Balancer
- AWS WAFv2 WebACL and WebACLAssociation
- Amazon CloudWatch alarms
- Amazon SNS topics
- Amazon S3 bucket policies

## Sources Consulted
- AWS CloudFormation template Conditions syntax: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html
- AWS CloudFormation condition functions: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html
- AWS CloudFormation Fn::ForEach: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-foreach.html
- AWS CloudFormation Fn::Sub: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html
- AWS CloudFormation secure Systems Manager dynamic references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html
- AWS::ElasticLoadBalancingV2::LoadBalancer reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-loadbalancer.html
- AWS::WAFv2::WebACL reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html
- AWS::WAFv2::WebACLAssociation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-webaclassociation.html
- AWS::CloudWatch::Alarm reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- AWS::S3::BucketPolicy reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucketpolicy.html

## Issues Found
- The condition function table described the listed functions as "available" functions, but current CloudFormation documentation also includes `Fn::ForEach` when the `AWS::LanguageExtensions` transform is used. Changed the wording to "commonly used condition functions" to keep the beginner-focused table accurate without expanding the article scope.
- The `Fn::And` and `Fn::Or` examples used bare condition names (`Cond1`, `Cond2`). In CloudFormation condition expressions, existing conditions should be referenced with `!Condition`. Updated the examples to `!And [!Condition Cond1, !Condition Cond2]` and `!Or [!Condition Cond1, !Condition Cond2]`.
- The complete example created an AWS WAFv2 WebACL but did not associate it with the load balancer, so it would not actually provide WAF protection for the ALB. Added an `AWS::WAFv2::WebACLAssociation` resource using the ALB ARN and the WebACL ARN.
- The complete example created an SNS topic for alarm notifications but did not connect the CloudWatch alarm to it. Added `AlarmActions` to the alarm so the topic is used for notifications.

## Review Notes
Several examples are intentionally partial snippets and omit surrounding parameters or resources such as VPC definitions, listeners, target groups, and complete RDS networking. That is acceptable for a conditions-focused article, but readers would need those surrounding resources for deployable production templates.
