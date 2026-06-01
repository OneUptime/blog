# Validation Summary: How to Configure AKS Outbound Type with NAT Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure NAT Gateway
- Azure Load Balancer outbound SNAT
- Azure CLI
- Kubernetes networking
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: NAT gateway overview and resource details, https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Microsoft Learn: NAT Gateway resource and SNAT behavior, https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-resource
- Microsoft Learn: Managed NAT Gateway for AKS, https://learn.microsoft.com/en-us/azure/aks/nat-gateway
- Microsoft Learn: AKS outbound network and outbound types, https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- Microsoft Learn: Migrate outbound type in AKS, https://learn.microsoft.com/en-us/azure/aks/migrate-outboundtype
- Microsoft Learn: Azure NAT Gateway metrics and alerts, https://learn.microsoft.com/en-us/azure/nat-gateway/monitor-nat-gateway
- Microsoft Learn: Azure CLI reference for az aks create, https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI reference for NAT Gateway commands, https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn: Azure CLI reference for public IP prefix commands, https://learn.microsoft.com/en-us/cli/azure/network/public-ip/prefix

## Issues Found
- The post said Azure CLI 2.50 or later was required. I changed this to "the latest Azure CLI" because the current Microsoft guidance recommends current CLI versions, and outbound type migration documentation uses newer minimums than 2.50.
- The user-assigned NAT Gateway AKS command did not include an assigned managed identity. I added `az identity create`, `az identity show`, and `--assign-identity` to match the current Microsoft AKS NAT Gateway example for custom networking permissions.
- The monitoring section described SNAT port utilization as though it were directly exposed by the example metric. I changed the wording to monitor connection metrics and failed SNAT connection attempts, which matches Azure NAT Gateway metrics such as `SNATConnectionCount` and `TotalConnectionCount`.
- The idle timeout section implied that increasing idle timeout is the main fix for long-lived connections. I updated it to recommend TCP keepalives first and then longer idle timeout only when needed, which aligns with Microsoft guidance.
- The outbound type comparison said AKS supports only three outbound types. I changed this to "common AKS outbound types" because current AKS supports additional outbound type options beyond those three.
- The UDR description said pods have no direct internet access. I changed it to explain that UDR routes through a managed egress path, because the actual egress behavior depends on the route target and firewall/NVA design.
- The common pitfalls section said changing an existing cluster from load balancer to NAT Gateway is not supported in place. I updated it because current AKS documentation supports outbound type migration, with disruption and planning caveats.

## Review Notes
- I could not verify commands with local `az --help` because Azure CLI is not installed in this environment, so command validation was performed against official Microsoft Learn CLI documentation.
- The cost value in the post is region- and date-dependent. It was left unchanged because it is phrased as approximate, but future reviews should check Azure pricing if exact pricing matters.
