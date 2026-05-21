# Validation Summary: How to Set Up Istio on Azure Arc-Enabled Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Arc-enabled Kubernetes
- Azure CLI
- Kubernetes RBAC
- Istio and istioctl
- IstioOperator
- Azure Monitor managed service for Prometheus
- Azure Policy
- Azure Arc GitOps with Flux v2

## Sources Consulted
- Azure Arc-enabled Kubernetes system requirements: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/system-requirements
- Azure RBAC on Azure Arc-enabled Kubernetes clusters: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/azure-rbac
- Enable monitoring for Arc-enabled Kubernetes clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable-arc
- Azure Monitor custom Prometheus scrape jobs using ConfigMap: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configmap
- Azure Monitor Prometheus scrape configuration: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Azure Arc GitOps with Flux v2 tutorial: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2
- Azure CLI reference for `az k8s-configuration flux create`: https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The prerequisites referenced Kubernetes 1.24+ and `istioctl` 1.20+, but Istio 1.20 is no longer supported and current Istio 1.30 supports Kubernetes 1.32 through 1.36. Updated the prerequisites to use a currently supported Istio release and the Istio 1.30 Kubernetes support range.
- The cluster-admin setup command created a `ClusterRoleBinding` for the signed-in Microsoft Entra user object ID. That is not generally valid for every Arc-connected cluster, because Kubernetes RBAC subjects depend on the cluster's authentication configuration. Replaced it with `kubectl auth can-i '*' '*' --all-namespaces` and guidance to obtain RBAC access from a cluster administrator if needed.
- The resource guidance said Istio's control plane needs at least 2 CPU cores and 2 GB of memory available. That is too absolute and does not match the configured resource requests in the example. Reworded it to advise checking cluster headroom because sizing depends on traffic volume and mesh size.
- The Azure Monitor section said Istio metrics are automatically scraped by the Azure Monitor agent when the monitoring extension is installed. Managed Prometheus has default scrape targets, but Istio metrics require a custom scrape configuration. Reworded the claim and changed the example to create the recommended `ama-metrics-prometheus-config` ConfigMap from a `prometheus-config` file.
- The Flux GitOps command omitted `--kind git`, which is required by current `az k8s-configuration flux create` examples for Git repository sources. Added `--kind git`.
- The Bookinfo sample URL used the old `release-1.20` branch. Updated it to `release-1.30` and verified the URL returns HTTP 200.

## Review Notes
- The local environment did not have the Azure CLI installed, so Azure CLI syntax was checked against official Microsoft Learn command documentation rather than local `az --help` output.
- The Istio Gateway and VirtualService examples use `networking.istio.io/v1`, which is appropriate for current Istio releases.
