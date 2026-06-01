# Validation Summary: How to Create an Azure VM from a Custom Image

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure managed images
- Azure Compute Gallery
- Azure CLI
- Linux Azure VM Agent (waagent)
- Windows Sysprep
- Azure Virtual Machine Scale Sets
- Generation 2 Azure VMs

## Sources Consulted
- Microsoft Learn: Deprovision or generalize a VM before creating an image - https://learn.microsoft.com/en-us/azure/virtual-machines/generalize
- Microsoft Learn: Create a legacy managed image of a generalized VM in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/capture-image-resource
- Microsoft Learn: Create a VM from a generalized image version - https://learn.microsoft.com/en-us/azure/virtual-machines/vm-generalized-image-version
- Microsoft Learn: Overview of Azure Compute Gallery - https://learn.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery
- Microsoft Learn: az image CLI reference - https://learn.microsoft.com/en-us/cli/azure/image
- Microsoft Learn: az sig image-definition CLI reference - https://learn.microsoft.com/en-us/cli/azure/sig/image-definition
- Microsoft Learn: az sig image-version CLI reference - https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Learn: az vmss CLI reference - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Tutorial - Use a custom VM image in a scale set with Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/tutorial-use-custom-image-cli
- Microsoft Learn: Support for Generation 2 VMs on Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/generation-2

## Issues Found
- The managed image capture command created a default-generation managed image while the later Azure Compute Gallery image definition explicitly used `--hyper-v-generation V2`. I added `--hyper-v-generation V2` to `az image create` and added a short caveat to use `V1` consistently when the source VM is Generation 1.
- The text said the original VM cannot be started again after image creation. Microsoft documents this restriction as applying after the VM is marked generalized, so I clarified the wording.
- The "latest" Azure Compute Gallery VM example used a `/versions/latest` resource ID. Microsoft guidance for images in your own gallery is to use the image definition ID for the latest version, so I changed the example to use the image definition ID.
- The Gen2 best-practice tip was too broad because Gen2 support depends on the OS image and VM size. I updated it to say to use Gen2 images when the OS and VM size support them.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
