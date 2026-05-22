# Validation Summary: How to Use CDKTF Constructs for Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- CDKTF constructs
- TypeScript
- AWS provider for Terraform
- Amazon S3
- Amazon CloudFront

## Sources Consulted
- HashiCorp CDKTF Constructs documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/constructs
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- Terraform Registry AWS provider documentation for `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry AWS provider documentation for `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform Registry AWS provider documentation for `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform Registry AWS provider documentation for `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform Registry AWS provider documentation for `aws_s3_bucket_website_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration
- Terraform Registry AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Current npm package metadata and TypeScript declarations for `cdktf-cli@0.21.0`, `cdktf@0.21.0`, and `@cdktf/provider-aws@21.22.1`

## Issues Found
- CDKTF is now deprecated. HashiCorp's current CDKTF documentation states that CDKTF was deprecated on December 10, 2025 and is no longer supported or maintained. Added a note near the beginning and adjusted the conclusion so the post is accurate for existing projects without encouraging uninformed new adoption.
- The post said constructs come from the AWS CDK construct library. CDKTF uses the `constructs` programming model also used by AWS CDK, so the wording was corrected.
- The post said every construct takes scope, id, and config. That is true for most CDKTF resource constructs, but not every construct, so the statement was narrowed.
- The AWS examples imported from the prebuilt `@cdktf/provider-aws` package. The current package installs with a deprecation warning, and current HashiCorp examples show generated local provider bindings. Updated the setup command to run `cdktf provider add aws --force-local` and changed imports to `./.gen/providers/aws/...`.
- The CloudFront example pointed the origin at `bucketRegionalDomainName` while also configuring S3 website hosting, and omitted an origin configuration block. Updated the example to use the S3 website configuration's `websiteEndpoint` with `customOriginConfig`, which matches the static website endpoint pattern.
- The static website example called itself a complete setup. Since it does not include all production requirements such as object uploads, DNS, certificates, or bucket access policy, changed that wording to "basic".

## Review Notes
- The edited TypeScript resource examples were checked against the current generated AWS provider declaration shapes using `@cdktf/provider-aws@21.22.1`; the compile check passed.
- A full `cdktf init` plus local provider generation run was not completed in this environment because the Terraform CLI is not installed and `cdktf init` stopped at its non-interactive crash-reporting prompt.
- The static website example remains intentionally minimal. A production CloudFront/S3 setup should also handle bucket access policy or CloudFront Origin Access Control, custom domains, ACM certificates, DNS records, object deployment, and cache behavior choices.
