# Validation Summary: How to Configure Autoscaling and Custom Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spring Apps
- Azure Monitor autoscale
- Azure CLI
- Azure Resource Manager templates
- DNS CNAME records
- Azure Key Vault certificates
- Spring Boot

## Sources Consulted
- Microsoft Learn: Set up autoscale for Azure Spring Apps applications - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-setup-autoscale
- Microsoft Learn: Azure Spring Apps metrics - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-metrics
- Microsoft Learn: Supported metrics for Microsoft.AppPlatform/spring - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-appplatform-spring-metrics
- Microsoft Learn: Map an existing custom domain to Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-custom-domain
- Microsoft Learn: Azure CLI az spring app custom-domain reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/custom-domain
- Microsoft Learn: Azure CLI az spring certificate reference - https://learn.microsoft.com/en-us/cli/azure/spring/certificate
- Microsoft Learn: Azure CLI az monitor autoscale reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale
- Microsoft Learn: Azure CLI az monitor autoscale profile reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/profile
- Microsoft Learn: Azure CLI az monitor metrics reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Supported metrics for Microsoft.Insights/autoscaleSettings - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-insights-autoscalesettings-metrics
- Microsoft Learn: Microsoft.Insights/autoscaleSettings ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/autoscalesettings

## Issues Found
- The prerequisites incorrectly said autoscaling is not available on the Basic tier. Microsoft documentation lists autoscale setup for Basic/Standard and Enterprise, while custom domains require Standard or Enterprise. Updated the prerequisite and added a retirement/deprecation caveat for existing Azure Spring Apps workloads.
- The autoscale creation command omitted `--resource-group`. Added it to match Azure CLI examples and make the command directly usable.
- The scale-out rule used invalid Azure Monitor autoscale condition syntax and a request-time metric while describing CPU scaling. Replaced it with a `PodCpuUsage` condition using the documented Azure Monitor autoscale condition format and Azure Spring Apps dimensions.
- The ARM autoscale snippet used `PodCpuUsage` without a metric namespace. Added `metricNamespace: "Microsoft.AppPlatform/Spring"` to align with Azure Monitor metric metadata.
- The custom-domain CNAME target used an app-specific hostname. Azure Spring Apps custom-domain documentation maps CNAME records to `<service-name>.azuremicroservices.io`, so the example now points to `myorg-spring-apps.azuremicroservices.io`.
- The domain verification section described an unsupported TXT-token flow and used `az spring app custom-domain show` before the domain exists. Replaced it with DNS verification of the CNAME record before binding.
- The managed certificate command used an unsupported `az spring certificate add --domain-name` option. Azure Spring Apps documentation covers Key Vault-imported certificates for custom domains, so the managed-certificate example was removed and the Key Vault example now enables certificate auto sync.
- The autoscale monitoring example used `az monitor autoscale show-predictive-metric` for recent events, omitted the required metric namespace, and used a nonmatching metric name. Replaced it with `az monitor metrics list` against the autoscale setting resource using the documented `ScaleActionsInitiated` metric.
- The summary claimed Azure Spring Apps supports managed certificates that auto-renew. Updated it to say Azure Spring Apps can auto-sync renewed certificates from Azure Key Vault.

## Review Notes
Azure Spring Apps Basic, Standard, and Enterprise plans are in retirement, and the `az spring` CLI command group is deprecated. The commands remain documented for existing resources, but future posts should consider migration guidance for Azure Container Apps or another supported hosting target.
