# Validation Summary: How to Configure AKS Network Observability Add-On for Traffic Flow Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Advanced Container Networking Services (ACNS)
- Container Network Observability
- Azure Monitor managed Prometheus
- Azure Managed Grafana
- PromQL
- Kubernetes PrometheusRule
- eBPF, Retina, Cilium, and Hubble

## Sources Consulted
- Microsoft Learn: Use Advanced Container Networking Services on your Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/use-advanced-container-networking-services
- Microsoft Learn: Set up Container Network Observability for Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/container-network-observability-how-to
- Microsoft Learn: What are container network metrics? - https://learn.microsoft.com/en-us/azure/aks/container-network-observability-metrics
- Microsoft Learn: Advanced Container Networking Services for Azure Kubernetes Service (AKS) overview - https://learn.microsoft.com/en-us/azure/aks/advanced-container-networking-services-overview
- Microsoft Learn: Monitor your AKS cluster network with Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-network-monitoring
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az monitor account` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/account
- Microsoft Learn: Azure CLI `az grafana` reference - https://learn.microsoft.com/en-us/cli/azure/grafana

## Issues Found
- The post used the outdated/non-current `--network-observability-enabled` flag. Replaced enablement with `--enable-acns`, and replaced disablement with `--disable-acns-observability` for Cilium clusters or `--disable-acns` for disabling ACNS entirely.
- The verification query used `networkProfile.monitoring.enabled`, which is not the documented ACNS observability property. Updated it to `networkProfile.advancedNetworking.observability.enabled`.
- The post claimed kubenet support. Current Microsoft documentation describes Container Network Observability as part of ACNS for Azure CNI Cilium and non-Cilium data planes, so the support statement was corrected.
- The post named `azure-cns` as the observability DaemonSet. Current setup guidance uses Retina for non-Cilium clusters and Cilium/Hubble for Cilium clusters, so the pod verification examples were updated.
- Several PromQL examples used undocumented metric names such as `networkobservability_dns_response_latency_bucket`, `networkobservability_tcp_connection_failed_total`, and `networkobservability_tcp_connection_latency_bucket`. Replaced them with documented `networkobservability_*`, `cilium_*`, and `hubble_*` metrics.
- The post described TCP and DNS latency metrics that are not present in the documented metric reference. Reframed those examples around documented DNS response, drop, flow, TCP flag, and TCP state metrics.
- The Azure Monitor section implied all network observability metrics are scraped automatically. Added the documented caveat that high-cardinality Hubble metrics such as `hubble_flows_processed_total` may require updating the Azure Monitor metrics keep-list.
- The performance overhead section included precise unsourced CPU, memory, and latency measurements. Replaced those figures with a more accurate recommendation to measure overhead and ingestion cost in the target cluster.

## Review Notes
The post is now aligned with current Microsoft documentation as of 2026-06-01. The Grafana JSON remains a small illustrative snippet rather than a complete exported dashboard; for production dashboards, Microsoft provides managed dashboard templates and Grafana dashboard IDs.
