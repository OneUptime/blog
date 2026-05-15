# Validation Summary: How to Create Azure-Compatible RHEL VM Images with Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder / osbuild-composer
- composer-cli
- Azure CLI
- Azure Blob Storage
- Azure managed images and Linux VMs
- VHD images
- Azure Linux Agent
- cloud-init

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: RHEL image builder description and supported output formats, including Microsoft Azure `vhd` output: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 8 documentation: creating system images with `composer-cli`, blueprint format, packages, kernel customization, hostname customization, and default services for `vhd` images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 8 documentation: preparing and uploading cloud images by using RHEL image builder, including Azure page blob upload and `az image create`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 10 documentation: deploying a RHEL image as a compute instance on Azure, including VHD upload and custom image creation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_and_managing_rhel_on_microsoft_azure/deploying-a-rhel-image-as-an-compute-instance-on-azure
- Microsoft Learn: Install the Azure CLI on Linux with DNF for RHEL/CentOS Stream: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Microsoft Learn: `az image create` command reference: https://learn.microsoft.com/en-us/cli/azure/image
- Microsoft Learn: `az storage blob upload` command reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: cloud-init support for Linux VMs in Azure and the relationship between cloud-init and the Azure Linux Agent: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init

## Issues Found
- The Azure CLI installation snippet imported Microsoft's RPM signing key but did not configure the Microsoft package repository before running `sudo dnf install -y azure-cli`. Added the official RHEL 9 `packages-microsoft-prod.rpm` repository setup command so the install sequence works on a plain RHEL 9 host.
- The Azure resource creation examples omitted explicit `--location eastus` values after creating the resource group in `eastus`. Added `--location eastus` to the storage account, managed image, and VM creation commands to match the region used by the resource group and the pattern shown in official Azure and Red Hat examples.

## Review Notes
- Red Hat documents that `vhd` images enable `sshd`, `chronyd`, `waagent`, `cloud-init`, `cloud-init-local`, `cloud-config`, and `cloud-final` by default, so explicitly enabling some of these services in the blueprint is redundant but technically valid.
- The Azure CLI repository command added in the post is for RHEL 9. RHEL 8 and RHEL 10 use different `packages-microsoft-prod.rpm` URLs in Microsoft's installation documentation.
