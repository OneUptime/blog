# Validation Summary: How to Configure IPv6 for Azure Container Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Container Instances (ACI)
- Azure Virtual Network (VNet)
- Azure CLI
- Terraform with the AzureRM provider
- Azure Container Instances YAML configuration

## Sources Consulted
- Microsoft Learn: Azure Container Instances virtual network scenarios and limitations - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-virtual-network-concepts
- Microsoft Learn: Deploy container instances into an Azure virtual network - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: IPv6 for Azure Virtual Network overview - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Configure a NAT gateway for static IP address for outbound traffic from a container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-nat-gateway
- Microsoft Learn: Expose a static IP address for a container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-application-gateway
- HashiCorp AzureRM provider docs: `azurerm_container_group` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_group.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_subnet` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/subnet.html.markdown

## Issues Found
- The post's core claim was incorrect. It stated that ACI supports IPv6 in VNet-integrated deployments and that container groups receive IPv6 addresses from dual-stack subnets. I changed the title, description, introduction, and conclusion to state that ACI currently does not support IPv6 addresses. Microsoft Learn explicitly lists IPv6 addresses as unsupported for ACI, and the Azure Virtual Network IPv6 overview also names Azure Container Instances as a platform that does not support IPv6 communication for containers.
- The Azure CLI example was not a supported ACI IPv6 deployment. It created dual-stack VNet and subnet prefixes and implied that the container group would use them. I changed the example to a supported delegated IPv4 subnet deployment, added `--ip-address Private`, and corrected the IP lookup to `--query "ipAddress.ip" --output tsv`.
- The Terraform example used IPv6 subnet prefixes and a placeholder `ENABLE_IPV6` environment variable that has no effect on ACI IPv6 support. I removed the IPv6 subnet prefix, removed the unused environment variable, and updated the subnet delegation actions to the current AzureRM provider documentation for `Microsoft.ContainerInstance/containerGroups`.
- The verification section told readers to expect an IPv6 address inside the container and to test IPv6 egress with `curl -6` and `ping6`. I changed that section to verify the private IPv4 mapping instead and explicitly note that ACI does not assign IPv6 addresses.
- The multi-container YAML example had multiple technical problems: it was framed as IPv6-capable, used `memoryInGb` instead of `memoryInGB`, omitted `protocol` on the exposed group port, used a placeholder sidecar image, and did not include the optional subnet `name` field shown in current docs. I corrected the schema fields and swapped the images to Microsoft Learn sample images that match current ACI examples.

## Review Notes
- As of this review on 2026-05-07, Microsoft Learn says VNet-integrated ACI requires a NAT gateway for supported outbound connectivity.
- VNet-integrated ACI container groups do not expose a public IP address directly. For public ingress, Microsoft Learn documents fronting them with Azure Application Gateway or Azure Standard Load Balancer.
