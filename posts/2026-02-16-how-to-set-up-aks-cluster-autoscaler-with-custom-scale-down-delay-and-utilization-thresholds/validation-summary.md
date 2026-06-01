# Validation Summary: How to Set Up AKS Cluster Autoscaler with Custom Scale-Down Delay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Cluster Autoscaler
- Azure CLI
- kubectl
- Kubernetes Pod Disruption Budgets and DaemonSets

## Sources Consulted
- Microsoft Learn: Use the Cluster Autoscaler in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler
- Microsoft Learn: Cluster autoscaling in Azure Kubernetes Service (AKS) overview: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler-overview
- Microsoft Learn: Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The prerequisites named Kubernetes 1.24 or later, which is outdated for AKS in 2026. Changed this to require a supported AKS Kubernetes version.
- The prerequisites required Azure CLI 2.40 or newer, while the official AKS autoscaler documentation requires Azure CLI 2.0.76 or later. Updated the version requirement.
- The `az aks update` and `az aks show` examples used `--cluster-name`, but the `az aks` commands use `--name` for the managed cluster. Updated those commands.
- The `--cluster-autoscaler-profile` examples split multiple profile entries across separate shell arguments. The stable Azure CLI reference documents this parameter as a comma-separated list of `key=value` pairs, so the examples were corrected to pass one comma-separated profile string.
- The system pod pitfall suggested anti-affinity to "spread system pods across fewer nodes," which was technically contradictory and did not reflect the autoscaler behavior precisely. Updated the wording to note the DaemonSet and mirror pod exception and suggest a dedicated system node pool or scheduling rules.

## Review Notes
The autoscaler profile is cluster-wide for autoscale-enabled node pools, so separate node pools can have different min/max node counts but not different AKS autoscaler profile values within the same cluster.
