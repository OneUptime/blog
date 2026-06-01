# Validation Summary: How to Configure Azure Application Gateway URL Path-Based Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway
- Azure URL path-based routing
- Azure CLI
- Azure Virtual Network and subnets
- Backend pools, HTTP settings, health probes, and request routing rules

## Sources Consulted
- Microsoft Learn: URL Path Based Routing overview - https://learn.microsoft.com/en-us/azure/application-gateway/url-route-overview
- Microsoft Learn: Route web traffic based on the URL using Azure CLI - https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-url-route-cli
- Microsoft Learn: Application Gateway request routing rules - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-request-routing-rules
- Microsoft Learn Azure CLI reference: az network application-gateway url-path-map - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/url-path-map
- Microsoft Learn Azure CLI reference: az network application-gateway url-path-map rule - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/url-path-map/rule
- Microsoft Learn Azure CLI reference: az network application-gateway rule - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule
- Microsoft Learn Azure CLI reference: az network application-gateway http-settings - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Microsoft Learn Azure CLI reference: az network application-gateway probe - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe

## Issues Found
- The post stated that path matching is case-sensitive by default. Microsoft documents Application Gateway path rules as case-insensitive, so the path matching behavior and troubleshooting note were corrected.
- The introduction implied that any Application Gateway provides WAF. WAF requires a WAF SKU, so the statement was qualified to say WAF is available if you use a WAF SKU.

## Review Notes
The Azure CLI is not installed in this workspace, so command validation was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output. The command structure and flags used in the post match the documented Azure CLI commands for Application Gateway URL path maps, rules, HTTP settings, probes, and the Microsoft URL-routing tutorial.
