# Validation Summary: How to Use Data Sources with Filters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform data sources
- HashiCorp AWS provider
- HashiCorp AzureRM provider
- HashiCorp Google provider
- AWS EC2 filters

## Sources Consulted
- HashiCorp Terraform language documentation: Data sources - https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp AWS provider documentation: `aws_ami` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- HashiCorp AWS provider source documentation: `aws_instances` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/instances.html.markdown
- HashiCorp AWS provider source documentation: `aws_subnets` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/subnets.html.markdown
- HashiCorp AWS provider source documentation: `aws_vpc` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- HashiCorp AWS provider source documentation: `aws_security_groups` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/security_groups.html.markdown
- HashiCorp AWS provider source documentation: `aws_ebs_volumes` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ebs_volumes.html.markdown
- HashiCorp AWS provider source documentation: `aws_ebs_snapshot` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ebs_snapshot.html.markdown
- AWS EC2 API Reference: Filter - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Filter.html
- AWS CLI Command Reference: `ec2 describe-instances` filters - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- HashiCorp AzureRM provider source documentation: `azurerm_virtual_network` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/virtual_network.html.markdown
- HashiCorp AzureRM provider source documentation: `azurerm_subnet` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/subnet.html.markdown
- HashiCorp Google provider source documentation: `google_compute_instance` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/compute_instance.html.markdown
- HashiCorp Google provider documentation: `google_compute_images` data source - https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_images

## Issues Found
- The `tags` argument comparison snippet used the same `data "aws_vpc" "main"` label twice in one HCL code block. Terraform block type/name pairs must be unique in a module, so the second example was renamed to `main_with_filters`, and the explanatory sentence was adjusted to say both examples query the same VPC.
- The no-results example claimed `aws_instances` fails when no instances match. The AWS provider's plural `aws_instances` data source is designed to return lists of instance IDs/IPs, while singular data sources such as `aws_ami` fail when no object matches. The example was changed to `aws_ami`, and the wording now notes that plural/list data source behavior should be checked per data source.
- The GCP example used `data "google_compute_instances"`, which is not a documented current Google provider data source. It was replaced with the documented `google_compute_images` data source using a `filter` string.

## Review Notes
The AWS filter AND/OR explanations, tag filter syntax, dynamic Terraform filter block example, AzureRM lookup examples, and AWS data source examples otherwise matched the official provider and AWS EC2 filter documentation. Wildcard support depends on the underlying AWS EC2 describe operation and filter name, so future posts could call that provider/API-specific behavior out more explicitly.
