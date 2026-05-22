# Validation Summary: How to Use the Timeouts Block in Terraform Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform resource `timeouts` blocks
- HashiCorp AWS provider
- HashiCorp AzureRM provider
- HashiCorp Google provider
- AWS RDS, EC2, Security Groups, CloudFront, and EKS
- Google Kubernetes Engine
- Azure Kubernetes Service

## Sources Consulted
- Terraform language documentation: Configure a resource / Define operation timeouts - https://developer.hashicorp.com/terraform/language/resources/configure#define-operation-timeouts
- Terraform Plugin Framework timeouts documentation - https://developer.hashicorp.com/terraform/plugin/framework/resources/timeouts
- Terraform Plugin Framework create behavior documentation - https://developer.hashicorp.com/terraform/plugin/framework/resources/create
- AWS provider `aws_db_instance` documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_instance` documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_security_group` documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_cloudfront_distribution` documentation and source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution and https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/cloudfront/distribution.go
- AWS provider `aws_eks_cluster` documentation and source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster and https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/eks/cluster.go
- AWS provider `aws_vpn_connection` documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Google provider `google_container_cluster` documentation and source - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster and https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/container_cluster.html.markdown
- AzureRM provider `azurerm_virtual_machine` documentation and source - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine and https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/virtual_machine.html.markdown
- AzureRM provider `azurerm_kubernetes_cluster` documentation - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster

## Issues Found
- The resource support list said `aws_instance` supports only `create`, `update`, and `delete` timeouts. Current AWS provider documentation/source also lists `read`, so the list was corrected.
- The GKE cluster example included a `delete` timeout but omitted `deletion_protection = false`. Current Google provider documentation requires this field to be explicitly set to `false` and applied before destroying clusters, so the example was updated.
- The CloudFront example showed a `timeouts` block, but current `aws_cloudfront_distribution` documentation/source does not expose configurable Terraform operation timeouts. The invalid block was removed and the section now notes that `retain_on_delete` is the relevant AWS provider option for avoiding waits during deletion of enabled distributions.
- The VPN connection example showed a `timeouts` block, but current `aws_vpn_connection` documentation does not expose configurable Terraform operation timeouts. The section was replaced with an EKS cluster example, which is a slow AWS resource that does support `create`, `update`, and `delete` timeouts.

## Review Notes
- Terraform was not installed in the local environment, so CLI validation with `terraform validate` was not available. The snippets and claims were checked against official HashiCorp documentation and provider source instead.
- The `azurerm_virtual_machine` resource still documents configurable timeouts, but AzureRM users generally prefer newer OS-specific resources such as `azurerm_linux_virtual_machine` and `azurerm_windows_virtual_machine` for new deployments.
