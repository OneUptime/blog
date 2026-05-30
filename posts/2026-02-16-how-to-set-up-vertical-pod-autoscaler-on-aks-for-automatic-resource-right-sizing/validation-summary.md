# Validation Summary: How to Set Up Vertical Pod Autoscaler on AKS for Automatic Resource Right-Sizing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes resource requests and limits
- Pod Disruption Budgets
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Vertical pod autoscaling in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/vertical-pod-autoscaler
- Microsoft Learn: Use the Vertical Pod Autoscaler in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/use-vertical-pod-autoscaler
- Microsoft Learn: Vertical Pod Autoscaler API reference in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/vertical-pod-autoscaler-api-reference
- Kubernetes documentation: Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler repository: Vertical Pod Autoscaler quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md

## Issues Found
- The installation section used upstream manifests and a community Helm chart. For AKS, the official setup path is the AKS-managed VPA add-on using `az aks create --enable-vpa` or `az aks update --enable-vpa`, so the installation commands and verification namespace were updated.
- The post described only `Off`, `Initial`, and `Auto` modes. Current Kubernetes and AKS documentation deprecates `Auto` in VPA 1.4.0 and recommends explicit modes such as `Recreate` or `InPlaceOrRecreate`, so the mode descriptions and examples were updated.
- The active update examples used `updateMode: "Auto"`. These were changed to `updateMode: "Recreate"` to avoid recommending a deprecated mode.
- The VPA event query used `reason=EvictedByVPA`, but AKS documentation shows VPA eviction events with reason `EvictedPod`, so the command was corrected.
- Remaining references to "auto mode" were changed to automatic updates or explicit `Recreate`/`InPlaceOrRecreate` wording.

## Review Notes
The YAML examples use the current `autoscaling.k8s.io/v1` VPA API and `autoscaling/v2` HPA API. `InPlaceOrRecreate` is AKS 1.34+ only, so the post now states that version-specific caveat.
