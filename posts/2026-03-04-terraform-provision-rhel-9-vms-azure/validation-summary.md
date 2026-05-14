# Validation Summary: How to Use Terraform to Provision RHEL 9 VMs on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Terraform
- HashiCorp AzureRM Provider
- Microsoft Azure Virtual Machines
- Azure Marketplace RHEL images
- cloud-init
- Red Hat Subscription Manager
- Red Hat Lightspeed / insights-client

## Sources Consulted
- Microsoft Learn, Overview of Red Hat Enterprise Linux images in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn, Azure CLI `az vm create` reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- HashiCorp Terraform Registry, `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Red Hat Documentation, Deploying RHEL 9 on Microsoft Azure: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_microsoft_azure/
- Red Hat Documentation, Configuring and managing cloud-init for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_cloud-init_for_rhel_9/
- Red Hat Documentation, RHEL 9.6 deprecated functionality for subscription management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/deprecated-functionalities
- Red Hat Documentation, Client configuration guide for Red Hat Lightspeed: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/client_configuration_guide_for_red_hat_lightspeed/

## Issues Found
- The post title and description promised Terraform on Azure, but the implementation section used AWS, Azure CLI, and GCP commands instead of Terraform. Replaced the multi-cloud CLI examples with an AzureRM Terraform configuration using `azurerm_linux_virtual_machine`.
- The Azure image URN `RedHat:RHEL:9:latest` did not match the current documented RHEL 9 Azure Marketplace image metadata. Updated the Terraform image reference to publisher `RedHat`, offer `RHEL`, SKU `9-lvm-gen2`, version `latest`.
- The prerequisites were multi-cloud and listed AWS/GCP CLI tools. Updated them to Azure, Terraform, and Azure CLI.
- The cloud-init snippet was generally valid but minimal. Adjusted the `groups` value to an explicit YAML list and added standard sudo and shell fields for the created administrative user.
- `subscription-manager register --auto-attach` used a deprecated subscription-management option. Changed it to `subscription-manager register`.
- Monitoring examples used a bare `insights-client` command. Updated them to the documented registration form `insights-client --register --display-name myVM`.
- Generic "security groups" wording was AWS-oriented for an Azure post. Updated it to NSGs and firewall rules.

## Review Notes
Terraform was not installed in the local environment, so the HCL was reviewed manually against the AzureRM provider documentation rather than validated with `terraform validate`.
