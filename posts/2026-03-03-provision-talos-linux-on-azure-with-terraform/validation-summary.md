# Validation Summary: How to Provision Talos Linux on Azure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI, machine configuration, bootstrap workflow)
- Microsoft Azure (Resource Groups, Virtual Networks, Subnets, Network Security Groups, Public IP, Load Balancer, Linux Virtual Machines)
- Terraform (HCL syntax, hashicorp/azurerm provider)
- Kubernetes (control plane / worker topology, API on port 6443, etcd on 2379-2380)

## Sources Consulted
- hashicorp/azurerm Terraform Registry: https://registry.terraform.io/providers/hashicorp/azurerm/latest
- azurerm features block guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- azurerm_lb_probe resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_probe
- azurerm_linux_virtual_machine resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- azurerm_network_interface_backend_address_pool_association docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_backend_address_pool_association
- Azure Public IP addresses (Standard SKU allocation requirement): https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Sidero Labs talosctl CLI reference (gen secrets, gen config, apply-config, bootstrap)
- etcd configuration / ports 2379 (client) and 2380 (peer): https://etcd.io/docs/

## Issues Found

1. **Outdated azurerm provider version constraint.** The post pinned `version = "~> 3.0"`. As of 2026, the current major version of the `hashicorp/azurerm` provider is 4.x, and 3.x is legacy. Updated to `~> 4.0`. The `features {}` provider block remains required in 4.x, so no other changes were needed.

2. **Load balancer backend pool never had NICs attached.** The post created an `azurerm_lb_backend_address_pool` but never attached the control plane network interfaces to it. Without `azurerm_network_interface_backend_address_pool_association`, the backend pool stays empty and the Kubernetes API LB cannot route traffic to the control plane nodes, so the bootstrap step would fail to reach the API through `https://<LB_PUBLIC_IP>:6443`. Added an `azurerm_network_interface_backend_address_pool_association` resource (counted across control plane nodes) inside the existing "Provisioning Virtual Machines" code block.

3. **Worker NIC resource was missing.** The worker VM resource referenced `azurerm_network_interface.worker[count.index].id`, but only a `cp` network interface resource was defined. This would fail at `terraform plan` with an unresolved reference. Added a matching `azurerm_network_interface` "worker" resource (counted across worker nodes) alongside the existing control plane NIC definition.

## Review Notes

- The `admin_ssh_key` block on the Linux VM is required by the `azurerm_linux_virtual_machine` schema (one of `admin_password` / `admin_ssh_key` must be set, and password auth is disabled by default), even though Talos Linux does not run an SSH daemon. The key supplied is effectively dummy. Left in place because removing it would make the Terraform invalid; worth a callout in a future revision.
- The post does not show outbound rules / outbound NAT for the Standard SKU load balancer. With Standard SKU public IP + Standard LB, VMs require an explicit outbound path (LB outbound rule, NAT Gateway, or instance-level public IP) for internet egress, which Talos needs to pull container images. Not added because it would be a new section, but is a real production gap worth noting.
- The health probe is a TCP probe on 6443; an HTTPS probe against `/readyz` would be more semantically correct for the Kubernetes API server, but TCP works.
- The bootstrap snippet uses `--insecure` correctly for the initial `apply-config` (the maintenance API before secrets are installed); after the first apply, subsequent `talosctl` calls would need a real talosconfig and endpoints, which is implied but not explicitly walked through.
- Per Talos docs the post could also mention enabling boot diagnostics and using Trusted Launch / SecureBoot images where supported, but these are enhancements rather than corrections.
