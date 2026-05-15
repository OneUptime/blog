# Validation Summary: How to Deploy RHEL on Microsoft Azure with Marketplace Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9.4
- Microsoft Azure Virtual Machines
- Azure Marketplace images
- Azure CLI
- Azure Network Security Groups
- cloud-init
- Azure Linux Agent
- Red Hat Update Infrastructure

## Sources Consulted
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Red Hat Update Infrastructure for on-demand Red Hat Enterprise Linux VMs in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-rhui
- Microsoft Learn: Azure CLI `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nsg rule create` reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Custom data and cloud-init on Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- Microsoft Learn: cloud-init support for Linux VMs in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
- cloud-init documentation: Module reference - https://docs.cloud-init.io/topics/modules.html
- Red Hat Documentation: Deploying RHEL 9 on Microsoft Azure - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_rhel_9_on_microsoft_azure/deploying_rhel_9_on_microsoft_azure

## Issues Found
- The image search comment said "RHEL.4" instead of "RHEL 9.4". I corrected the comment so it accurately describes the `9_4` SKU being queried.
- The post suggested checking `subscription-manager status` because PAYG images are auto-registered. Azure documentation states that RHEL PAYG images are preconfigured for Azure RHUI, and Red Hat documentation treats RHSM automatic registration as a Gold Image/BYOS workflow. I replaced that verification step with `sudo dnf repolist`, which better matches PAYG RHUI-based updates.

## Review Notes
The Azure CLI commands and options used in the post are current and valid according to the Azure CLI reference. The cloud-init keys used in the YAML snippet are valid, and Azure CLI can pass the cloud-init file through `--custom-data`.
