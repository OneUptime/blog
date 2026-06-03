# Validation Summary: How to Create EC2 Instances with AWS CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon EC2
- Amazon VPC
- Amazon EBS
- AWS IAM
- AWS Systems Manager Session Manager
- TypeScript
- Jest

## Sources Consulted
- AWS CDK v2 Developer Guide: AWS CDK CLI reference, https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK v2 Developer Guide: Bootstrapping, https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html
- AWS CDK v2 API Reference: aws-cdk-lib.aws_ec2 module, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html
- AWS CDK v2 API Reference: assertions Template, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- AWS CDK v2 API Reference: assertions Match, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Match.html
- Amazon Linux 2023 User Guide: Package management tool, https://docs.aws.amazon.com/linux/al2023/ug/package-management.html

## Issues Found
- The Jest security group assertion used a literal `SecurityGroupIngress` array with one element. Current CDK assertions perform partial top-level object matching, but arrays and array elements need explicit matchers for this case; the synthesized security group contains both HTTP and SSH ingress rules, and each rule includes additional fields such as `CidrIp` and `Description`. Changed the example to import `Match` and use `Match.arrayWith([Match.objectLike(...)])` so the test correctly verifies that the HTTP rule is present.

## Review Notes
- The EC2, VPC, key pair, IAM role, user data, block device, and deployment command examples align with current AWS CDK v2 APIs.
- The bootstrap explanation is directionally correct; the default modern bootstrap stack also creates additional resources such as an ECR repository, depending on the bootstrap template.
