# Validation Summary: How to Configure Virtual Network Deployment for Azure Container Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Instances
- Azure Virtual Network
- Azure CLI
- Azure Network Security Groups
- Azure Private Endpoints
- Azure Private DNS
- Azure NAT Gateway
- Azure Firewall
- YAML container group configuration

## Sources Consulted
- Microsoft Learn: Deploy container instances into an Azure virtual network - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Microsoft Learn: Scenarios to use a virtual network with Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-virtual-network-concepts
- Microsoft Learn: Configure a NAT gateway for static IP address for outbound traffic from a container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-nat-gateway
- Microsoft Learn: Configure a single public IP address for outbound and inbound traffic to a container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-egress-ip-address
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Deploy a container group with custom DNS settings - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-custom-dns

## Issues Found
- The YAML example used `memoryInGb`, but the ACI YAML schema uses `memoryInGB`. Updated the property casing so the configuration matches the documented schema.
- The post stated that VNet-deployed containers can make outbound internet connections by default through the VNet default route. Current Azure Container Instances documentation says VNet deployments need an explicitly supported outbound configuration, with NAT Gateway documented as the supported static egress path and Azure Firewall documented for routed ingress/egress scenarios. Updated the outbound section and prerequisite wording.
- The NAT Gateway example created the gateway before the public IP and then updated it. Updated the example to create the public IP first and attach it during `az network nat gateway create`, matching Microsoft Learn examples.
- The limitations section said VNet deployment is only supported for Linux containers and that Windows containers are unsupported. Current Microsoft Learn VNet deployment documentation says deployment to a virtual network is generally available for Linux and Windows containers in most supported regions. Updated the limitation.
- Added the ACI DNS caveat that container instances do not inherit DNS settings from the associated VNet and custom DNS settings must be explicitly configured for the container group.

## Review Notes
The post is technically relevant and the reviewed commands/configuration are aligned with current Microsoft Learn guidance after the corrections above. Azure CLI was not installed in the local environment, so command verification was performed against official Microsoft documentation rather than local `az --help` output.
