# Validation Summary: How to Use the tfconfig Import in Sentinel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform / HCP Terraform policy enforcement
- Sentinel `tfconfig/v2`, `tfplan/v2`, and `tfstate/v2` imports
- Terraform AWS provider examples

## Sources Consulted
- HashiCorp Sentinel `tfconfig/v2` import documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfconfig-v2
- HashiCorp Sentinel Terraform feature documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform
- HashiCorp Sentinel built-in functions documentation: https://developer.hashicorp.com/sentinel/docs/functions
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post used Python syntax highlighting for Sentinel policy snippets. Changed code fences from `python` to `sentinel`.
- The S3 examples referenced deprecated `aws_s3_bucket` configuration arguments such as `acl` and `server_side_encryption_configuration`. Replaced those examples with current `aws_instance` checks that demonstrate the same `tfconfig` concepts without using deprecated AWS provider arguments.
- The resource property list omitted `mode` and `provisioners`, which are part of the `tfconfig/v2.resources` structure. Added both properties.
- The module source regex for local modules used an unescaped dot, which matched any character. Escaped the dot in the local module source pattern.
- The variables section claimed `tfconfig.variables` exposes a `sensitive` field. The official `tfconfig/v2` documentation lists only `module_address`, `name`, `default`, and `description` for variables. Removed the unsupported property and replaced the sensitive-variable example with a default-check example.
- The providers example matched AWS providers using `provider_config_key`, which is an opaque key. Updated it to use the documented `provider.name` field.
- The data source section referenced a non-existent `tfconfig.datasources` collection. Updated it to filter `tfconfig.resources` where `mode` is `"data"`.
- The provisioner example checked for provisioners under `resource.config`, but `tfconfig/v2` exposes provisioners through resource `provisioners` and the top-level `tfconfig.provisioners` collection. Updated the example to use `tfconfig.provisioners`.

## Review Notes
The Sentinel CLI was not installed in the local environment, so snippet syntax was reviewed against HashiCorp documentation rather than executed locally.
