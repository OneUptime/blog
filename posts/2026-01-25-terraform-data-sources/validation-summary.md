# Validation Summary: How to Use Data Sources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform data sources and HCL
- HashiCorp AWS provider
- HashiCorp AzureRM provider
- HashiCorp Google provider
- HashiCorp HTTP provider
- HashiCorp External provider
- AWS EC2, VPC, IAM, Lambda, Secrets Manager, and IP ranges
- Azure virtual machines and networking
- Google Compute Engine and networking

## Sources Consulted
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform data block reference: https://developer.hashicorp.com/terraform/language/block/data
- Terraform file function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform pathexpand function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS provider aws_ami data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider aws_vpc data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- AWS provider aws_security_group data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
- AWS provider aws_security_groups data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups
- AWS provider aws_secretsmanager_secret data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret
- AWS provider aws_secretsmanager_secrets data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secrets
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AzureRM provider azurerm_linux_virtual_machine resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Google provider google_compute_instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google provider google_compute_image data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_image
- Google provider google_compute_network data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_network
- Google provider google_compute_subnetwork data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_subnetwork
- HTTP provider data source: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- External provider data source: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- AWS IP ranges endpoint: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The post said data sources query infrastructure at "plan and apply time." Terraform attempts to read data sources during planning and defers reads to apply only when arguments depend on values unknown until apply. Updated the wording to reflect that behavior.
- The Lambda example used `runtime = "nodejs18.x"`, which AWS lists as a deprecated Lambda runtime as of the review date. Updated the example to `nodejs22.x`.
- The Azure VM example used `file("~/.ssh/id_rsa.pub")`. Terraform's `file()` function does not perform shell-style home directory expansion. Updated it to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The error handling section implied that `try()` can turn a failed provider data source lookup into `null`. Terraform's `try()` does not catch provider read failures. Replaced the example with the plural `aws_secretsmanager_secrets` data source and a collection length check for optional lookup behavior.

## Review Notes
Most examples are illustrative snippets and assume surrounding provider configuration and referenced resources, such as launch templates, network interfaces, and function zip files, already exist. The GCP, AWS data source, HTTP, and external provider examples match current provider documentation patterns.
