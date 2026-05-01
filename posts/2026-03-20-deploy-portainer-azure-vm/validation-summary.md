# Validation Summary: How to Deploy Portainer on Azure VM

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Microsoft Azure Virtual Machines
- Azure Virtual Network, Public IP, and Network Security Groups
- cloud-init
- Docker Engine
- Portainer CE

## Sources Consulted
- Azure cloud-init support for Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
- Azure custom data and cloud-init: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- Azure public IP addresses: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- `azurerm_linux_virtual_machine` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- `azurerm_public_ip` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- `azurerm_network_interface` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface
- `azurerm_subnet` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- `azurerm_network_security_group` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- `azurerm_subnet_network_security_group_association` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- cloud-init `runcmd` module reference: https://docs.cloud-init.io/en/latest/reference/modules.html#runcmd
- Portainer CE install with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Terraform `pathexpand` function: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Docker Engine install on Ubuntu: https://docs.docker.com/installation/ubuntulinux/

## Issues Found
- The VM example referenced a network interface and public IP that were never defined. I added the missing virtual network, subnet, public IP, and network interface resources so the configuration is internally complete.
- The NSG was created but never associated with any subnet or NIC, so its inbound rule would not have been enforced. I added `azurerm_subnet_network_security_group_association` to apply the NSG to the VM subnet.
- The public IP resource needed to be explicit about current Azure behavior. I added a Standard SKU public IP with `allocation_method = "Static"` to align with current Azure public IP requirements after Basic SKU retirement.
- The SSH public key path used `file("~/.ssh/id_rsa.pub")`. I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))` so the home-directory path is expanded using the documented HCL function.
- The cloud-init `runcmd` entry split `docker run` over multiple lines in a form that would not execute correctly as a single command. I changed it to a folded YAML scalar so cloud-init passes one valid shell command.
- The Portainer container image used `portainer/portainer-ce:latest`. I changed it to `portainer/portainer-ce:lts` to match the current official Portainer installation guidance.
- The summary instructed readers to run `tofu apply` directly. I updated it to `tofu init` followed by `tofu apply`, which is the correct first-run workflow for a new OpenTofu configuration.

## Review Notes
- Docker's `get.docker.com` convenience script is officially supported for non-interactive installs, but Docker documents it as better suited to testing and development than long-lived production hosts.
- Exposing only port `9443` is technically fine for the Portainer web UI. Port `8000` is only needed if Edge agent features are required.
