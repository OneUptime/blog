# Validation Summary: How to Create a CDKTF Project with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform
- Python
- AWS provider for Terraform
- AWS VPC, subnet, EC2, RDS, route table, and security group resources
- Terraform modules
- pytest

## Sources Consulted
- HashiCorp CDKTF project setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF modules documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/modules
- HashiCorp CDKTF unit testing documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- HashiCorp CDKTF Python API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/python/classes
- Archived HashiCorp AWS prebuilt provider repository: https://github.com/cdktf/cdktf-provider-aws
- Terraform Registry AWS provider CDKTF Python examples: https://registry.terraform.io/providers/hashicorp/aws/latest/docs?lang=python

## Issues Found
- The post recommended installing the pre-built `cdktf-cdktf-provider-aws` package. HashiCorp archived the pre-built provider repositories and stopped publishing/supporting these packages on December 10, 2025, so I changed the provider setup to generate local bindings with `cdktf provider add hashicorp/aws --force-local`.
- The Python examples imported resources from `cdktf_cdktf_provider_aws.*`, which matches the deprecated pre-built package workflow. I changed the imports to `imports.aws.*`, matching the generated local binding workflow documented by HashiCorp.
- The project structure listed `.gen/` as the Python provider binding directory. I changed it to `imports/` to match the documented Python import path.
- The multi-tier architecture section said it included compute layers, but the example only created networking and database resources. I corrected the description.
- The multi-tier subnet CIDRs were hardcoded as `10.0.x.x/24`, which made the prod subnets invalid for the configured `10.1.0.0/16` VPC. I changed the example to derive `/24` subnet CIDRs from `config.vpc_cidr` with Python's `ipaddress` module.
- The pytest example used `Testing.synth(stack)` for `Testing.to_be_valid_terraform`. The official CDKTF unit testing example uses `Testing.full_synth(stack)` for Terraform validation, so I updated that test.
- The Terraform module `cdktf.json` example contained a JavaScript-style comment inside a `json` code block and omitted the Python project fields. I changed it to valid JSON with `language`, `app`, and `terraformProviders`.
- The post did not mention CDKTF's current maintenance status. I added a short note that CDKTF was deprecated by HashiCorp on December 10, 2025 and is no longer supported or maintained.

## Review Notes
- CDKTF remains technically usable for existing projects, but its HashiCorp deprecation is a major version-specific caveat for new adoption.
- The first EC2 example creates a subnet and instance but does not include a complete internet gateway, route table, or security group setup for a reachable web server. It is acceptable as a minimal resource example, but a future revision could make the "web server" example operational end to end.
