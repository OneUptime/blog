# Validation Summary: How to Migrate from Terraform to CDK

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS CDK v2
- AWS CloudFormation resource import
- Terraform CLI and Terraform state
- Terraform AWS Provider
- CDK for Terraform (CDKTF)
- AWS Systems Manager Parameter Store
- Amazon VPC
- Amazon S3
- Amazon ECS Fargate

## Sources Consulted
- AWS CDK CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK EC2 Vpc API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK SSM StringParameter API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.StringParameter.html
- AWS CDK S3 Bucket API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
- AWS CDK ECS FargateTaskDefinition API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateTaskDefinition.html
- AWS CloudFormation resource import support list: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-supported-resources.html
- HashiCorp CDK for Terraform documentation: https://developer.hashicorp.com/terraform/cdktf
- HashiCorp CDKTF provider documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- Terraform state rm command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform state command references: https://docs.hashicorp.com/terraform/cli/commands/state
- Terraform AWS Provider aws_s3_bucket resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider aws_s3_bucket_lifecycle_configuration resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- The post said Terraform HCL lacks type checking. Terraform does validate types during Terraform runs, so I clarified that the difference is TypeScript compile-time type checking and IDE support.
- The post described CDK import as applying to existing AWS resources generally. I qualified this to resources that support CloudFormation resource import and added the documented `cdk diff` pre-check.
- The CDKTF bridge section presented CDKTF as a current recommendation. HashiCorp deprecated CDKTF on December 10, 2025, so I updated the section to treat CDKTF as a legacy bridge only and corrected the TypeScript imports to current documented package paths.
- The Terraform S3 example used deprecated inline `aws_s3_bucket` blocks for encryption, versioning, and lifecycle rules. I replaced them with the current standalone AWS provider resources.
- The Terraform `state rm` examples for indexed resources were unquoted. I quoted the addresses to avoid shell bracket expansion issues.
- The ECS construct snippet imported `aws-ec2` without using it. I removed the unused import so the snippet works in stricter TypeScript configurations.
- The drift warning said to remove resources from Terraform state before CDK deploys, which conflicts with the `cdk import` flow. I changed it to remove Terraform state after a successful import and before later Terraform applies or normal CDK deployment changes.

## Review Notes
- The ECS Fargate construct accepts arbitrary `cpu` and `memory` numbers; AWS Fargate supports only specific CPU and memory combinations. This is acceptable for a reusable construct example, but a production construct should validate or constrain those values.
- `ssm.StringParameter.valueFromLookup` reads during synthesis and requires an explicit stack account and region. The example is valid, but production migration docs could call out that synth-time behavior.
