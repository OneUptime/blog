# Validation Summary: How to Build Custom RHEL VHD Images for Azure with Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux Image Builder
- osbuild-composer and composer-cli
- RHEL Image Builder blueprint TOML
- Azure Linux Agent
- cloud-init
- Azure Storage page blobs
- Azure managed images
- Azure Compute Gallery / Shared Image Gallery
- Azure CLI

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 8 documentation: Preparing and uploading cloud images by using RHEL image builder - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Deploying RHEL 9 on Microsoft Azure - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/deploying_rhel_9_on_microsoft_azure/Red_Hat_Enterprise_Linux-9-Deploying_RHEL_9_on_Microsoft_Azure-en-US.pdf
- Microsoft Learn: Azure CLI az sig image-version - https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Learn: Azure CLI az vm - https://learn.microsoft.com/en-us/cli/azure/vm

## Issues Found
- The blueprint filesystem customization used `size`, but current RHEL Image Builder documentation uses `minsize` for `[[customizations.filesystem]]`. Changed both `/var` and `/var/log` entries to `minsize` so the blueprint matches the documented schema.

## Review Notes
- The VHD image type, `composer-cli` workflow, default Azure-related services for `vhd` images, page blob upload, managed image creation from a VHD URL, Azure Compute Gallery image version creation, and VM deployment from a gallery image are consistent with Red Hat and Microsoft documentation.
- The sample storage account name must still be globally unique in a real Azure subscription.
