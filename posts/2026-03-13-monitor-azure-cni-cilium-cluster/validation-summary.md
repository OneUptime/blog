# Validation Summary: Monitor Azure CNI with Cilium Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Advanced Container Networking Services (ACNS)
- Cilium
- Hubble CLI and Hubble UI
- Kubernetes
- Azure Monitor managed service for Prometheus
- OneUptime synthetic monitoring

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Advanced Container Networking Services overview - https://learn.microsoft.com/en-us/azure/aks/container-network-security-concepts
- Microsoft Learn: Set up container network logs with ACNS - https://learn.microsoft.com/en-us/azure/aks/how-to-configure-container-network-logs
- Microsoft Learn: Container network metrics overview - https://learn.microsoft.com/en-us/azure/aks/container-network-observability-metrics
- Microsoft Learn: Customize scraping of Prometheus metrics in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Cilium documentation: Monitoring and metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Hubble UI - https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Cilium command reference: cilium connectivity test - https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/

## Issues Found
- The post described Azure CNI Powered by Cilium itself as a premium networking option. Updated this to avoid implying that the base AKS networking option is the paid component; ACNS is the paid add-on that provides the managed observability features.
- The post used `cilium hubble enable --ui` and direct `cilium-config` edits for an AKS-managed Azure CNI Powered by Cilium cluster. AKS manages Cilium configuration and ACNS is the documented way to enable Hubble-based observability on AKS. Replaced those commands with `az aks update --enable-acns`, Hubble relay checks, and the documented Hubble relay port-forward pattern.
- The Hubble CLI setup omitted the mTLS client certificate configuration required for ACNS Hubble relay access. Added the documented `hubble-relay-client-certs` extraction and `hubble config set` commands.
- The metrics section attempted to edit the `cilium-config` ConfigMap and restart the Cilium DaemonSet. This is not appropriate for managed AKS Cilium. Replaced it with Azure Monitor managed Prometheus enablement and validation of the managed metrics pods.
- The connectivity test used `cilium connectivity test --namespace cilium-test`, which sets the namespace where Cilium is installed, not the test namespace. Changed it to `--test-namespace cilium-test`.

## Review Notes
- The post now assumes ACNS is enabled for managed Hubble observability on AKS. Hubble UI still requires deploying the AKS Hubble UI manifest before the `svc/hubble-ui` port-forward command will work.
- Cilium L7 and DNS observability on AKS can have feature-specific prerequisites, such as ACNS security features or FQDN policies, depending on the metric or flow type being inspected.
