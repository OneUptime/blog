# Validation Summary: How to Configure Overprovisioning in Azure VM Scale Sets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Resource Manager templates
- Azure Spot VMs
- Azure Load Balancer

## Sources Consulted
- Microsoft Learn: Design considerations for Azure Virtual Machine Scale Sets, including overprovisioning support, billing, and quota behavior: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-design-overview
- Microsoft Learn: FAQ for Azure Virtual Machine Scale Sets, including default `overprovision` behavior and VM ID gaps: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-faq
- Microsoft Learn: Azure CLI `az vmss` reference, including `create`, `show`, `scale`, `update`, `--disable-overprovision`, `--orchestration-mode`, Spot VM flags, and generic `--set`: https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-latest
- Microsoft Learn: ARM template reference for `Microsoft.Compute/virtualMachineScaleSets` API version `2023-07-01`, including `overprovision`, `orchestrationMode`, and `doNotRunExtensionsOnOverprovisionedVMs`: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2023-07-01/virtualmachinescalesets

## Issues Found
- The post described overprovisioning as applying to VM Scale Sets generally. Microsoft documents overprovisioning as supported only for Uniform orchestration mode, not Flexible orchestration mode. I updated the introduction, defaults, ARM template, CLI creation examples, and conclusion to make the Uniform orchestration requirement explicit.
- The post said extra overprovisioned VMs could push a deployment over vCPU quota. Microsoft documents that overprovisioned VMs do not count toward quota limits. I replaced the quota scenario with a narrower warning about tightly constrained dependent resources.
- The post said extensions with side effects should require disabling overprovisioning. The ARM/Compute model has `doNotRunExtensionsOnOverprovisionedVMs` to prevent extensions from running on extra overprovisioned VMs. I updated that section to mention the property as the more precise mitigation.
- The post claimed Azure waits for instances to reach `"Creating"` or `"Succeeded"`. Microsoft describes deletion after the requested number of VMs are successfully provisioned. I updated that step to say Azure waits for successful provisioning.
- The post stated a typical 10-20% overprovision buffer. I did not find that range in the current official Microsoft documentation, so I changed the wording to say Azure determines the buffer internally.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Learn Azure CLI reference rather than local `az --help` output.
