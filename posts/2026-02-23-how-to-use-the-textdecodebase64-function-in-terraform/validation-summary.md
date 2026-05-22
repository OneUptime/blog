# Validation Summary: How to Use the textdecodebase64 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform encoding functions: `textdecodebase64`, `textencodebase64`, and `base64decode`
- Base64 encoding
- Character encodings including UTF-8, UTF-16LE, UTF-16BE, ISO-8859-1, and Windows-1252
- HashiCorp external provider data source
- AWS provider data sources for SSM Parameter Store and Lambda
- PowerShell

## Sources Consulted
- HashiCorp Terraform `textdecodebase64` function documentation: https://developer.hashicorp.com/terraform/language/functions/textdecodebase64
- HashiCorp Terraform `textencodebase64` function documentation: https://developer.hashicorp.com/terraform/language/functions/textencodebase64
- HashiCorp Terraform `base64decode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64decode
- HashiCorp External provider `external` data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp AWS provider `aws_lambda_function` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/lambda_function
- HashiCorp AWS provider `aws_ssm_parameter` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Microsoft PowerShell `Get-CimInstance` documentation: https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance

## Issues Found
- Replaced `Get-WmiObject` with `Get-CimInstance` in the PowerShell example because `Get-CimInstance` is the current Microsoft-documented cmdlet for retrieving CIM/WMI instances and works with modern PowerShell.
- Corrected the international text example variable names and comments. The original snippet described Japanese text but used an English string, so the snippet now describes generic international text without making a false claim.
- Replaced the statement that Terraform supports other encodings from Go's `encoding` package. The official Terraform documentation says the encoding name must be from the IANA registry, Terraform supports only a subset, and support can vary by Terraform version.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`. The core function behavior, `base64decode` comparison, HCL snippets, and referenced provider data source attributes are consistent with the official documentation consulted.
