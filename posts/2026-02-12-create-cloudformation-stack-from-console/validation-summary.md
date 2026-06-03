# Validation Summary: How to Create a CloudFormation Stack from the Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- AWS Management Console
- CloudFormation YAML templates
- Amazon S3
- Amazon SNS
- AWS IAM

## Sources Consulted
- AWS CloudFormation User Guide: Create a stack from the CloudFormation console: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html
- AWS CloudFormation User Guide: Choose how to handle failures when provisioning resources: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html
- AWS CloudFormation Template Reference: CloudFormation resource tagging: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-resource-tags.html
- AWS CloudFormation User Guide: Delete a stack from the CloudFormation console: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-delete-stack.html
- AWS CloudFormation Template Reference: DeletionPolicy attribute: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CloudFormation Template Reference: AWS::SNS::Topic Subscription: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-sns-topic-subscription.html
- AWS Infrastructure Composer User Guide: Create a new template in Infrastructure Composer in CloudFormation console mode: https://docs.aws.amazon.com/infrastructure-composer/latest/dg/composer-cfn-mode-create.html

## Issues Found
- The post described the current create-stack template choices as "Template is ready," "Use a sample template," and "Create template in Designer." AWS's current documentation describes choosing an existing template or building from Infrastructure Composer in the CloudFormation console flow. I updated the wording to use "Choose an existing template" and "Build from Infrastructure Composer."
- The post said stack option tags are applied to all resources in the stack. AWS documents that stack-level tag propagation varies by resource type, so I changed this to say tags are associated with the stack and propagated to resources that support stack-level tag propagation.
- The post said CloudFormation removes all resources it created when deleting a stack. AWS documents that deletion policies can retain resources, so I changed this to say CloudFormation removes resources unless a deletion policy retains specific resources.

## Review Notes
The example CloudFormation template uses valid resource types and properties for an S3 bucket and SNS topic with an embedded email subscription. The email subscription resource can be created by CloudFormation, but the recipient must still confirm the SNS subscription before email notifications are delivered.
