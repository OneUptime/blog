# Validation Summary: How to Troubleshoot Azure Kubernetes Service Pod CrashLoopBackOff Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes pods, deployments, events, probes, resources, logs, DNS, and persistent volumes
- kubectl
- Azure CLI
- Azure Container Registry (ACR)
- Docker containers

## Sources Consulted
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- Kubernetes kubectl quick reference: https://kubernetes.io/cheatsheet
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes resource management for pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Secret API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/secret-v1/
- Azure CLI az aks reference: https://learn.microsoft.com/en-us/cli/azure/aks
- AKS monitoring documentation: https://learn.microsoft.com/en-us/azure/aks/monitor-aks
- AKS Azure Disk CSI storage documentation: https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision

## Issues Found
- Corrected the health check section to state that misconfigured liveness probes can cause restarts and CrashLoopBackOff, while readiness probe failures do not restart containers.
- Corrected the HTTP probe success criteria from only "non-200" to the Kubernetes-defined 200-399 success range.
- Corrected the image pull section to clarify that image pull failures show as `ImagePullBackOff` or `ErrImagePull`, not `CrashLoopBackOff`.
- Updated the `az aks check-acr` example to use the ACR login server format expected by the Azure CLI `--acr` parameter.
- Fixed the debug pod `kubectl run` command so `-n <namespace>` is parsed as a kubectl flag instead of being passed to the container command after `--`.

## Review Notes
The remaining commands and configuration examples are technically sound for current Kubernetes and AKS usage. `kubectl top` depends on the metrics API being available; AKS documentation describes an out-of-the-box metrics server in the `kube-system` namespace for platform metrics.
