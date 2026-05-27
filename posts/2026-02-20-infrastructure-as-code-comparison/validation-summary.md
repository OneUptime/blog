# Validation Summary: Comparing Infrastructure as Code Tools: Terraform, Pulumi, and CDK

## Status
validated

## Post Type
Guide

## Technologies Covered
- Infrastructure as Code
- Terraform
- HashiCorp Configuration Language
- AWS provider for Terraform
- Pulumi
- TypeScript
- AWS CDK
- AWS CloudFormation
- Amazon VPC
- Amazon ECS and AWS Fargate
- AWS Application Load Balancer
- CDK assertions

## Sources Consulted
- Terraform AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform `test` command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform Registry providers overview: https://developer.hashicorp.com/terraform/registry/providers
- Pulumi supported languages and concepts: https://www.pulumi.com/docs/iac/concepts/
- Pulumi AWS `getAvailabilityZones` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/getavailabilityzones/
- AWS CDK supported programming languages: https://docs.aws.amazon.com/cdk/v2/guide/languages.html
- AWS CDK `ClusterProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ClusterProps.html
- AWS CDK `ContainerInsights` enum documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ContainerInsights.html
- AWS CDK `ApplicationLoadBalancedFargateServiceProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateServiceProps.html
- AWS CDK testing documentation: https://docs.aws.amazon.com/cdk/v2/guide/testing.html

## Issues Found
- The Terraform example referenced `data.aws_availability_zones.available.names[count.index]` without declaring the `aws_availability_zones` data source. Added the missing data source block with `state = "available"`.
- The Terraform weaknesses and comparison table said Terraform had no built-in testing framework and listed only Terratest. Updated this to mention `terraform test`, which is part of the Terraform CLI, while retaining Terratest as an external option.
- The Pulumi language list omitted current supported languages including JavaScript, Java, and YAML. Updated the text and comparison table to match Pulumi's supported language documentation.
- The Pulumi availability-zone example used a Promise `.then()` block to create resources. Updated it to the current TypeScript top-level `await` style shown in Pulumi examples.
- The CDK comparison table omitted JavaScript and C# from the officially supported AWS CDK languages. Updated the table to list the official first-class languages.
- The AWS CDK example used the deprecated `containerInsights` property. Updated it to `containerInsightsV2: ecs.ContainerInsights.ENABLED`.

## Review Notes
- The CDK `ApplicationLoadBalancedFargateService` `healthCheck` property is current and valid for configuring the container health check.
- The Terraform provider count claim of 3000+ providers remains plausible and is supported by HashiCorp's public ecosystem materials.
