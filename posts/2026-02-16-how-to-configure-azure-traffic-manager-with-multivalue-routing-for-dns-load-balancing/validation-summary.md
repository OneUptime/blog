# Validation Summary: How to Configure Azure Traffic Manager with Multivalue Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Traffic Manager
- Traffic Manager Multivalue routing
- Azure CLI
- DNS A and AAAA records
- Azure Monitor metric alerts

## Sources Consulted
- Azure Traffic Manager MultiValue routing documentation: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-configure-multivalue-routing-method
- Azure Traffic Manager routing methods documentation: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- Azure Traffic Manager FAQ: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs
- Azure Traffic Manager endpoint monitoring documentation: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Azure CLI `az network traffic-manager profile` reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Azure CLI `az network traffic-manager endpoint` reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Azure CLI `az monitor metrics alert` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Monitor supported metrics for Traffic Manager profiles: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305

## Issues Found
- Corrected the Azure CLI routing method value from `MultiValue` to `Multivalue`, matching the current Azure CLI accepted value.
- Corrected the `max-return` range from 1-8 to 1-10, matching the Azure Traffic Manager FAQ maximum.
- Corrected the endpoint addressing limitation from IPv4-only to IPv4 or IPv6 addresses. Microsoft documentation states MultiValue routing is enabled for profiles whose endpoints are specified using IPv4 or IPv6 addresses.
- Corrected the health probe CLI option from `--tolerated-number-of-failures` to `--max-failures`, matching the current Azure CLI profile create/update parameter.
- Removed the statement that higher `max-return` values add load to Traffic Manager health probing infrastructure. The setting controls DNS response record count, not probe frequency.
- Clarified endpoint exclusion wording because Traffic Manager has a documented exception when all eligible endpoints are degraded.
- Clarified browser client behavior. Happy Eyeballs is primarily a dual-stack IPv4/IPv6 connection algorithm and should not be presented as a guarantee that browsers quickly retry every returned IPv4 A record.
- Clarified the no-weighting limitation so it does not imply a guaranteed equal inclusion probability for every endpoint in every DNS response.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
