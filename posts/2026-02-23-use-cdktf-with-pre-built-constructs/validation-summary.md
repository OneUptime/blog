# Validation Summary: How to Use CDKTF with Pre-Built Constructs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- TypeScript
- npm
- AWS provider for Terraform
- CDKTF constructs and generated provider bindings
- Jest-based CDKTF unit tests

## Sources Consulted
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF project setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF constructs documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/constructs
- HashiCorp CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF unit testing documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- Terraform Registry AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- npm package metadata for `cdktf`, `cdktf-cli`, and `@cdktf/provider-aws`

## Issues Found
- CDKTF is deprecated as of December 10, 2025, but the post described CDKTF and pre-built provider packages as actively maintained and up to date. Added a deprecation caveat and changed the provider guidance to recommend pinning versions and considering locally generated bindings.
- The setup command omitted `--local`, which means current CDKTF initialization defaults to HCP Terraform remote backend behavior. Updated the command to `cdktf init --template=typescript --providers=aws --local` for a local starter project.
- The example package `@myconstructs/cdktf-aws-static-site` is not available on npm but was presented like an installable package. Changed the example to an explicit organization placeholder and clarified that the package name and props are illustrative.
- The provider-generated AWS example used `vpc.publicSubnetsOutput`, but `Vpc` from `@cdktf/provider-aws` is the generated `aws_vpc` resource and does not create or expose subnets. Added an explicit `Subnet`, `InternetGateway`, `RouteTable`, and `RouteTableAssociation`, then changed the EC2 instance to use `subnet.id`.
- The EC2 example used a hard-coded AMI ID that is region-specific and likely stale for `us-west-2`. Replaced it with a `DataAwsAmi` lookup for the most recent Amazon Linux 2023 AMI.
- The test example imported `MyStack` even though the stack class was not exported. Exported `MyStack`.
- The Jest matcher example passed resource type strings, while the current CDKTF Jest matcher type expects generated resource constructors. Updated the test to import and use `S3Bucket` and `S3BucketVersioning`.

## Review Notes
The high-level construct examples remain illustrative because construct APIs vary by package. Before publishing production guidance, consider replacing the organization-placeholder packages with a real maintained construct library or an internal package documented by the author.
