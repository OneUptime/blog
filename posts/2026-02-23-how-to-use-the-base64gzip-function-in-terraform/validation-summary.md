# Validation Summary: How to Use the base64gzip Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform functions (`base64gzip`, `base64encode`, `templatefile`, `jsonencode`, `length`, `filebase64`)
- AWS EC2 user data and launch templates
- cloud-init user-data formats, including gzip and MIME multipart data
- AWS Lambda environment variables and Node.js runtime configuration
- Azure Linux VM custom data
- Kubernetes ConfigMap `data` and `binary_data`
- Node.js `zlib`

## Sources Consulted
- HashiCorp Terraform `base64gzip` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64gzip
- HashiCorp Terraform `base64encode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64encode
- HashiCorp Terraform `length` function documentation: https://developer.hashicorp.com/terraform/language/functions/length
- HashiCorp Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- cloud-init user-data formats and gzip documentation: https://docs.cloud-init.io/en/latest/explanation/format/index.html and https://docs.cloud-init.io/en/latest/explanation/format/gzip.html
- AWS Lambda quotas documentation: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Microsoft Azure custom data documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- HashiCorp Terraform AzureRM `azurerm_linux_virtual_machine` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- HashiCorp Terraform Kubernetes provider `kubernetes_config_map` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- Node.js `zlib` documentation: https://nodejs.org/api/zlib.html

## Issues Found
- The AWS user data section said "AWS and most cloud providers" support gzip-compressed user data automatically. This was too broad. I changed it to AWS EC2 user data on cloud-init-based Linux images, matching cloud-init's documented gzip behavior.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. I updated the example to `nodejs24.x`, which is a supported Lambda runtime.
- The comparison example labeled `length(...)` results as bytes. Terraform's `length` for strings counts characters, not bytes, so I renamed the output keys to `*_length`.
- The comparison comments said base64 is always about 33% larger. Base64 expands raw bytes by `ceil(n/3)*4`, so small values can have more padding overhead. I replaced the absolute wording with the exact expansion formula.
- The Azure section implied all Azure VMs process compressed custom data. Azure documents cloud-init as the agent that processes custom data by default on Linux, so I narrowed the wording to Azure Linux VMs that use cloud-init.
- The binary-data note implied `filebase64` is the direct replacement for `base64gzip`. I clarified that `filebase64` is for base64 encoding only, and binary gzip compression should be done outside Terraform.
- The summary said cloud-init and most cloud services handle gzip automatically. I narrowed this to cloud-init and noted that other services need explicit decompression.

## Review Notes
The remaining examples are syntactically plausible Terraform snippets, but several are illustrative and omit surrounding required resources, variables, provider configuration, and IAM permissions. Lambda environment variables are still limited to 4 KB in aggregate, so `base64gzip` only helps when the compressed-and-encoded value remains within that limit.
