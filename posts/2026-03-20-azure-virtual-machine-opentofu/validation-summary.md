# Validation Summary: How to Create a Virtual Machine with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Azure Virtual Machines
- Azure Resource Manager (`azurerm`) provider

## Sources Consulted
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values documentation: https://opentofu.org/docs/v1.9/language/values/outputs/
- HCL native syntax specification: https://raw.githubusercontent.com/hashicorp/hcl/main/hclsyntax/spec.md
- AzureRM provider documentation for `azurerm_linux_virtual_machine`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine.html.markdown
- Microsoft Learn Ubuntu Linux VM Bicep quickstart: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-bicep
- Microsoft Learn B-family VM size documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family

## Issues Found
- The VM resource referenced `azurerm_network_interface.main.id`, but no such resource was defined in the post. I changed `network_interface_ids` to use `var.network_interface_ids`, which matches the provider's required list-of-NIC-IDs input and makes the snippet internally consistent as a reusable module example.
- The variables section was incomplete for the shown resource. I added `network_interface_ids`, `ssh_public_key`, and `vm_size` because they are referenced by the configuration.
- The `location` variable used `variable "location" { type = string; default = "East US" }`. HCL one-line block syntax allows at most one attribute, so this form was invalid. I converted it to a standard multi-line block.
- The outputs section used the placeholder resource reference `azurerm_resource_type.main`. I corrected both outputs to reference `azurerm_linux_virtual_machine.main`.
- The introduction claimed the guide creates a public IP, but the post did not define any public IP resource. I narrowed the wording to describe the VM resource actually shown: managed OS disk, attached network interface, and SSH key authentication.
- The description overclaimed general network interface configuration. I adjusted it to say "attached network interface" so it matches the code.

## Review Notes
- The `azurerm_linux_virtual_machine` arguments used in the post are current as of 2026-05-07. The provider still requires `network_interface_ids`, `os_disk`, and either `admin_password` or `admin_ssh_key`, and `disable_password_authentication` still defaults to `true`, so the SSH-key-only example remains valid.
- The Ubuntu image reference `Canonical / 0001-com-ubuntu-server-jammy / 22_04-lts-gen2 / latest` is still valid according to current Microsoft Learn examples.
- This post now reads as a core VM resource/module snippet rather than a full end-to-end deployment. Resource group, virtual network, subnet, and NIC creation are expected to exist elsewhere or be passed in by the caller.
