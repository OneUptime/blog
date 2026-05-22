# Validation Summary: How to Use OpenTofu Provider-Defined Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible provider-defined functions
- HCL
- AWS Terraform provider
- Google Terraform provider
- Kubernetes Terraform provider

## Sources Consulted
- OpenTofu 1.7.0 release announcement: https://opentofu.org/blog/opentofu-1-7-0/
- OpenTofu function call documentation: https://opentofu.org/docs/language/expressions/function-calls/
- OpenTofu built-in provider function documentation: https://opentofu.org/docs/language/providers/builtin/
- Terraform function documentation for provider-defined function namespace behavior: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform 1.8 provider functions announcement and examples for AWS, Google Cloud, and Kubernetes: https://www.hashicorp.com/en/blog/terraform-1-8-adds-provider-functions-for-aws-google-cloud-and-kubernetes
- Terraform Registry documentation for Kubernetes `manifest_decode`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/functions/manifest_decode

## Issues Found
- The AWS `arn_build` examples used an object argument. Official AWS provider examples show `arn_build` taking five positional string arguments: partition, service, region, account ID, and resource. Updated all `arn_build` examples to use the positional signature.
- The multiple-provider example used a hypothetical `provider::google::project_parse` function and a provider version lower than the documented Google provider function release. Replaced it with the documented Google provider function `provider::google::region_from_zone` and updated the Google provider constraint to `>= 5.23.0`.
- The provider alias section said to reference the alias in the function call. Provider-defined functions are addressed with the provider local name from `required_providers`, while aliases apply to provider configurations for resources and modules. Updated the explanation and example.
- The alias-section ARN example previously implied an S3 bucket ARN with a region component. Replaced it with an EC2 VPC ARN example where the region component is appropriate.

## Review Notes
OpenTofu was not installed in the local environment, so I did not execute `tofu init` or validate the snippets with the CLI. The review was performed against official OpenTofu, HashiCorp Terraform, and Terraform Registry documentation.
