# Validation Summary: How to Set Up Istio on Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes
- Istio and istioctl
- IstioOperator configuration
- Azure Load Balancer annotations
- Azure Application Gateway Ingress Controller (AGIC)
- Azure Monitor and Container insights
- Microsoft Entra ID / Azure RBAC
- Calico network policy

## Sources Consulted
- Istio documentation: Download the Istio release - https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio documentation: Supported releases - https://istio.io/latest/docs/releases/supported-releases/
- Istio documentation: Azure platform setup - https://istio.io/latest/docs/setup/platform-setup/azure/
- Istio documentation: Bookinfo Application - https://istio.io/latest/docs/examples/bookinfo/
- Microsoft Learn: Configure a Public Standard Load Balancer in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Microsoft Learn: Secure pod traffic with network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure CLI az aks reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Enable Application Gateway Ingress Controller add-on for AKS - https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-new
- Microsoft Learn: Application Gateway Ingress Controller annotations - https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- Kubernetes documentation: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Microsoft Learn: Enable monitoring for AKS clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Microsoft Learn: API server authorized IP ranges in AKS - https://learn.microsoft.com/en-us/azure/aks/api-server-authorized-ip-ranges

## Issues Found
- The Istio download example used `curl -L https://istio.io/downloadIstio | sh -` followed by `cd istio-1.24.0`. The script downloads the latest numeric release by default, so the `cd` command would fail today, and Istio 1.24 is no longer supported. Updated the commands to explicitly download and enter `istio-1.30.0`, which is the current supported release in the official Istio docs.
- The Azure Application Gateway Ingress example referenced the `istio-ingressgateway` service without placing the Ingress in the same namespace. Kubernetes Ingress backends reference services in the same namespace as the Ingress, so the example would not work if applied in `default`. Added `namespace: istio-system`.
- The Azure Monitor section implied that enabling the `monitoring` add-on alone sends Istio metrics to Azure Monitor. The basic monitoring add-on enables Container insights/logging; Istio Prometheus metrics require Azure Monitor managed service for Prometheus or another Prometheus setup. Reworded the note to distinguish these.
- The Azure AD wording used the old product name. Updated it to Microsoft Entra ID while preserving the Azure AD reference for reader recognition.
- The webhook troubleshooting note implied API server authorized IP ranges can block admission webhook calls. Authorized IP ranges restrict Kubernetes API access. Reworded the note to focus on API server-to-webhook connectivity and clarify what the `apiServerAccessProfile` query is useful for.

## Review Notes
The remaining commands and configuration snippets are technically valid for the walkthrough. For production use, readers should also pin AKS Kubernetes versions compatible with their chosen Istio minor release and consider Azure Monitor managed Prometheus instead of sample in-cluster Prometheus/Grafana manifests.
