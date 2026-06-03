# Validation Summary: How to Use CDK Aspects for Cross-Cutting Concerns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- CDK Aspects
- TypeScript
- AWS CloudFormation L1 resources
- Amazon S3
- Amazon RDS
- Amazon DynamoDB
- Amazon EC2 security groups
- cdk-nag

## Sources Consulted
- AWS CDK Developer Guide: Aspects and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/aspects.html
- AWS CDK API Reference: IAspect: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IAspect.html
- AWS CDK API Reference: Annotations: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Annotations.html
- AWS CDK Developer Guide: Tags and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/tagging.html
- AWS CDK API Reference: CfnDBInstance: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.CfnDBInstance.html
- AWS CDK API Reference: CfnTableProps: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.CfnTableProps.html
- AWS CloudFormation Reference: DynamoDB SSESpecification: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-ssespecification.html
- AWS CDK API Reference: CfnDeletionPolicy: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnDeletionPolicy.html
- AWS CloudFormation Reference: EC2 SecurityGroup ingress rules: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-securitygroup-ingress.html
- cdk-nag project documentation: https://github.com/cdklabs/cdk-nag

## Issues Found
- The post said CDK Aspects run after synthesis. AWS CDK documentation says Aspects are applied during synthesis/prepare before the final CloudFormation template is emitted. Updated the introduction to describe the timing correctly.
- The DynamoDB encryption example treated a missing `sseSpecification` as no encryption. DynamoDB tables are encrypted at rest by default, while `SSESpecification` controls AWS owned versus KMS-managed encryption. Updated the example and warning text to check for KMS-managed SSE as a compliance requirement.
- The security group example only checked inline `CfnSecurityGroup.securityGroupIngress` rules. CDK and CloudFormation can also model ingress rules as standalone `CfnSecurityGroupIngress` resources, so the Aspect could miss common rules. Updated the example to validate both inline and standalone ingress resources and to check IPv6 open access.
- The required-tags example imported unused `Annotations` and `Tags` symbols. Removed them to keep the TypeScript snippet clean.

## Review Notes
The code examples are illustrative and still assume the surrounding CDK app has common imports such as `cdk`, `IConstruct`, `IAspect`, and service modules available where omitted in later snippets. The resource checks use L1 CloudFormation constructs, which is appropriate for Aspects that inspect synthesized resource properties, but tokenized values may require additional handling in production-grade policy code.
