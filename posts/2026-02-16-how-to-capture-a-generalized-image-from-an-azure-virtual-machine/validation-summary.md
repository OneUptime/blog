# Validation Summary: How to Capture a Generalized Image from an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure CLI
- Azure Compute Gallery
- Managed VM images
- Azure Linux Agent / waagent
- Windows Sysprep
- cloud-init
- HashiCorp Packer azure-arm builder

## Sources Consulted
- Microsoft Learn: Deprovision or generalize a VM before creating an image - https://learn.microsoft.com/en-us/azure/virtual-machines/generalize
- Microsoft Learn: Create a legacy managed image of a generalized VM in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/capture-image-resource
- Microsoft Learn: Tutorial - Create custom VM images with the Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-custom-images
- Microsoft Learn Azure CLI reference: az sig image-version - https://learn.microsoft.com/en-us/cli/azure/sig/image-version?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az sig image-definition - https://learn.microsoft.com/en-us/cli/azure/sig/image-definition?view=azure-cli-latest
- Microsoft Learn: Create a VM from a generalized image version - https://learn.microsoft.com/en-us/azure/virtual-machines/vm-generalized-image-version
- Microsoft Learn: Overview of Azure Compute Gallery - https://learn.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery
- HashiCorp Developer: Packer Azure ARM builder - https://developer.hashicorp.com/packer/integrations/hashicorp/azure/latest/components/builder/arm

## Issues Found
- The Azure Compute Gallery image-version command created `VM_ID` with `az vm show` but passed it to `--managed-image`. Microsoft documents VM sources with `--virtual-machine` and managed image sources with `--managed-image`, so the command was corrected to `--virtual-machine $VM_ID`.
- The Packer example did not include a final Linux deprovision step, while the surrounding text said Packer generalized the VM. HashiCorp's Azure ARM builder documentation shows `waagent -deprovision+user` as the final Linux deprovision operation, so a final shell provisioner was added and the explanatory text was adjusted.
- The best-practice item said to use lifecycle policies to automatically delete old image versions. Azure Compute Gallery supports end-of-life metadata and image version deletion, but end-of-life dates are informational, so the wording was changed to recommend end-of-life dates plus cleanup automation.

## Review Notes
- The Azure CLI command group could not be checked locally because Azure CLI is not installed in this environment, so commands were verified against current Microsoft Learn CLI reference pages.
- Managed images are now documented by Microsoft as legacy technology compared with Azure Compute Gallery, but the post already recommends Azure Compute Gallery for production use.
