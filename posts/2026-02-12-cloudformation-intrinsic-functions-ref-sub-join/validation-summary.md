# Validation Summary: How to Use CloudFormation Intrinsic Functions (Ref, Fn::Sub, Fn::Join)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- CloudFormation intrinsic functions
- YAML CloudFormation templates
- AWS IAM, S3, EC2, SNS, SQS, Lambda, API Gateway, DynamoDB, CloudWatch Logs

## Sources Consulted
- AWS CloudFormation documentation: Ref - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ref.html
- AWS CloudFormation documentation: Fn::Sub - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html
- AWS CloudFormation documentation: Fn::Join - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-join.html
- AWS CloudFormation documentation: pseudo parameters - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html
- AWS CloudFormation documentation: Fn::Base64 - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-base64.html
- AWS CloudFormation resource reference: AWS::S3::Bucket - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
- AWS CloudFormation resource reference: AWS::SQS::Queue - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html
- AWS CloudFormation resource reference: AWS::IAM::Role - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html
- AWS CloudFormation resource reference: AWS::Lambda::Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html

## Issues Found
- The pseudo-parameter table omitted `AWS::NotificationARNs` while presenting the list as available pseudo parameters. Added `AWS::NotificationARNs` with its documented meaning as the list of notification ARNs for the current stack.
- The `AWS::URLSuffix` row implied `amazonaws.com` was the only suffix. Changed it to an example, since partitions such as AWS China use different suffixes.
- The "Forgetting quotes around Sub strings" mistake claimed YAML interprets `${` specially and that unquoted `!Sub ${Environment}-bucket` would make the parser choke. AWS documentation shows unquoted `!Sub` strings as valid, so this was replaced with the documented `Fn::Sub` literal escaping pattern using `${!Name}`.

## Review Notes
The remaining examples and explanations align with AWS documentation. Several snippets are intentionally partial templates, so they illustrate intrinsic-function usage rather than complete deployable stacks.
