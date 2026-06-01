# Validation Summary: How to Deploy Windows Containers Alongside Linux Containers on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Windows Server containers
- Linux containers
- AKS mixed node pools
- Azure CLI
- Kubernetes Deployments, Services, Ingress, node selectors, taints, and tolerations
- Azure CNI networking

## Sources Consulted
- Microsoft Learn: Deploy a Windows Server Container on an Azure Kubernetes Service (AKS) Cluster using Azure CLI: https://learn.microsoft.com/en-us/azure/aks/learn/quick-windows-container-deploy-cli
- Microsoft Learn: Create Node Pools in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Node Images in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/node-images
- Microsoft Learn: Configure kubenet networking in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: Create Windows Server node pools with containerd in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/windows-containerd
- Kubernetes documentation: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Microsoft Container Registry image manifests inspected with Docker for the .NET sample images.

## Issues Found
- The Windows deployment was described as a .NET Framework application but used `mcr.microsoft.com/dotnet/samples:aspnetapp`, which is the general .NET sample image. Changed it to the official Windows .NET Framework sample image `mcr.microsoft.com/dotnet/framework/samples:aspnetapp`.
- The Windows app manifest exposed `containerPort: 8080` and the Service used `targetPort: 8080`. The official .NET Framework ASP.NET sample listens on port 80, so both were changed to port 80.
- The post said `--os-sku` supports only `Windows2019` and `Windows2022`. Updated this for current AKS support: `Windows2019` is no longer supported as of March 1, 2026, `Windows2022` remains the production recommendation for supported Kubernetes versions, and `Windows2025` is available as a preview SKU.
- The Windows node pool naming rule only mentioned the 6-character limit. Expanded it to include the lowercase alphanumeric and starting-letter constraints from AKS documentation.
- The troubleshooting note said Windows containers require Azure CNI for full networking functionality. Tightened this to the documented AKS constraint that Windows node pools are not available with kubenet.

## Review Notes
The Azure CLI and kubectl binaries were not installed in the local environment, so command validation was performed against current Microsoft Learn and Kubernetes documentation. The Kubernetes YAML structures use current `apps/v1` Deployment, `v1` Service, and `networking.k8s.io/v1` Ingress APIs. The post assumes an ingress controller such as ingress-nginx already exists in the cluster; that is correct for the shown Ingress resource but should be made explicit in a future content pass if the guide is expanded.
