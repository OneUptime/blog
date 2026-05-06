# Validation Summary: How to Configure Azure Container Registry with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Container Registry (ACR)
- Azure Private Link / Private Endpoint
- Azure Private DNS
- Azure Virtual Network dual-stack / IPv6
- Azure CLI
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay
- Docker
- ACR geo-replication
- ACR webhooks

## Sources Consulted
- Azure Container Registry Private Link: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Azure Container Registry authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry health checks: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health
- Azure Container Registry geo-replication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Azure Virtual Network IPv6 overview: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- AKS dual-stack networking: https://learn.microsoft.com/en-us/azure/aks/configure-dual-stack
- Azure CNI Overlay in AKS: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint?view=azure-cli-latest
- Azure CLI `az network vnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Azure CLI `az acr webhook`: https://learn.microsoft.com/en-us/cli/azure/acr/webhook?view=azure-cli-lts
- Azure Private Link availability: https://learn.microsoft.com/en-us/azure/private-link/availability

## Issues Found
- The post originally claimed that ACR supports direct IPv6 access through public endpoints and dual-stack private endpoints. Current Microsoft Learn guidance does not document public `azurecr.io` IPv6 endpoints for ACR, so I rewrote the framing to describe using ACR from dual-stack Azure networks via Private Link, private DNS, and dual-stack AKS networking.
- The original DNS/connectivity checks used `dig AAAA myregistry.azurecr.io` and `curl -6`, which are not supported by the ACR documentation. I replaced them with generic registry reachability checks that align with Microsoft Learn guidance.
- The original VNet example used an IPv6 subnet prefix of `/112`, but Azure Virtual Network requires IPv6 subnets to be exactly `/64`. I corrected the subnet example accordingly.
- The private endpoint section omitted required ACR Private Link steps. I added disabling private endpoint network policies, creating the `privatelink.azurecr.io` private DNS zone, linking it to the VNet, retrieving the registry and data-endpoint private IPs, and creating the required private DNS A records.
- The original private endpoint section implied the endpoint should expose IPv6 addresses directly. ACR Private Link documentation currently describes registry and data endpoint private IPs and A-record DNS configuration, so I removed that claim.
- The original REST example used `az acr credential show` without enabling the admin account and implied direct IPv6 testing. I replaced it with a simpler connectivity check that does not depend on disabled-by-default admin credentials.
- The AKS example used incorrect dual-stack flags: `--ip-families IPv4 IPv6`, `--pod-cidr-v6`, and no overlay mode. I corrected the command to use `--ip-families ipv4,ipv6`, `--network-plugin-mode overlay`, `--pod-cidrs`, `--service-cidrs`, and `--generate-ssh-keys`, matching current AKS dual-stack guidance.
- The geo-replication section implied geo-replication was specifically for IPv6 availability. I corrected it to high availability and noted that private-endpoint deployments need extra regional data-endpoint DNS records for replicas.
- The webhook example used an invalid IPv6 URI literal (`2001:db8::webhook`). I replaced it with a valid HTTPS webhook endpoint example.

## Review Notes
- Azure's IPv6 guidance currently states that Azure PaaS services are accessed via IPv4 endpoints from dual-stack virtual machines, and that IPv6 support is being expanded over time. That is the main reason the post needed reframing away from public ACR IPv6 endpoint claims.
- For ACR with Private Link, DNS configuration is not optional in practice. Both the registry endpoint and the regional data endpoint must resolve correctly, and geo-replication adds more regional data endpoints.
- Azure CLI was not installed in this workspace, so CLI syntax was verified against Microsoft Learn command reference pages rather than local `az --help` output.
