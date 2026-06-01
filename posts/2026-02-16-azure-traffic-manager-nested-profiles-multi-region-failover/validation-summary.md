# Validation Summary: How to Configure Azure Traffic Manager Nested Profiles for Multi-Region Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Traffic Manager
- Azure Traffic Manager nested profiles
- Azure CLI
- Azure App Service
- Azure DNS
- Azure Monitor metric alerts
- DNS failover and TTL behavior

## Sources Consulted
- Microsoft Learn: Azure CLI `az network traffic-manager profile` reference - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Microsoft Learn: Azure CLI `az network traffic-manager endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Microsoft Learn: Nested Traffic Manager profiles - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-nested-profiles
- Microsoft Learn: Traffic Manager endpoint types - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-endpoint-types
- Microsoft Learn: Traffic Manager routing methods - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- Microsoft Learn: Traffic Manager endpoint monitoring - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Microsoft Learn: Traffic Manager metrics and alerts - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-metrics-alerts
- Microsoft Learn: Supported Azure Monitor metrics for `Microsoft.Network/trafficManagerProfiles` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics
- Microsoft Learn: Traffic Manager FAQ - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs

## Issues Found
- The routing-method list omitted the Subnet routing method. Added Subnet to match the current Traffic Manager routing methods.
- The introduction and examples described performance-based routing within a region as routing to the fastest endpoint. Changed this to weighted distribution, which matches the post's actual child-profile configuration and avoids implying per-endpoint latency probing within a single region.
- The App Service endpoint examples used two `azureEndpoints` Web Apps from the same Azure region in one Traffic Manager profile. Azure documents a limit of one Web App Azure endpoint per region per profile. Changed the examples to use `externalEndpoints` with `--target` hostnames and added a short note explaining when `azureEndpoints` can be used.
- The nested endpoint commands set `--min-child-ipv4 1` for non-MultiValue child profiles. Removed that flag and kept `--min-child-endpoints 1`, which is the appropriate general health threshold for this example.
- The endpoint disable commands still used `azureEndpoints`. Updated them to `externalEndpoints` to match the corrected endpoint creation examples.
- The post said Traffic Manager profiles can be nested up to three levels deep. Current Microsoft FAQ states profiles can be nested up to 10 levels deep. Updated the text to describe the diagram as a three-level example.
- The health-probe detection sentence did not mention DNS caching effects. Clarified that failed probes are detected after about 30 seconds, with client failover also affected by TTL and DNS caching.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
