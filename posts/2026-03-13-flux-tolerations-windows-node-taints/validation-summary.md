# Validation Summary: How to Use Tolerations for Windows Node Taints with Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubernetes taints and tolerations
- Kubernetes Windows containers
- Flux CD
- Kustomize
- kubectl
- AKS node pools
- NVIDIA GPU device plugin

## Sources Consulted
- Kubernetes: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: Guide for Running Windows Containers - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes: Update API Objects in Place Using kubectl patch - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl reference: taint - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#taint
- Microsoft Learn: Use node taints in an AKS cluster - https://learn.microsoft.com/en-us/azure/aks/use-node-taints
- Microsoft Learn: Deploy a Windows Server container on AKS - https://learn.microsoft.com/en-us/azure/aks/learn/quick-windows-container-deploy-cli
- NVIDIA Kubernetes device plugin README - https://github.com/NVIDIA/k8s-device-plugin

## Issues Found
- The post described `os=windows:NoSchedule` as an AKS-managed standard taint. AKS documentation shows node taints as node-pool configuration, while Kubernetes Windows documentation uses `os=windows:NoSchedule` as an example taint. Updated the wording to avoid implying AKS applies it automatically.
- The full Deployment examples omitted required fields such as `spec.selector`, pod template labels, and containers. Added minimal valid Deployment structure for the Windows and Linux examples.
- The Kustomize section said strategic merge would add tolerations to existing ones. Kubernetes documentation states PodSpec `tolerations` are replaced by strategic merge patch. Updated the section to say the patch sets the tolerations list and that existing tolerations must be included if they should be preserved.
- The Kustomize patch target matched all Deployments in the namespace by kind and namespace only. Added `name: windows-app` so the example targets the intended Deployment.
- The GPU section said the NVIDIA device plugin applies the `nvidia.com/gpu` taint. NVIDIA's device plugin documentation shows workloads tolerating that taint, but the taint itself is a common node-pool/admin convention rather than something the plugin universally applies. Updated the wording.
- The `NoExecute` command was in a `yaml` fenced block even though it was a shell command. Changed the fence to `bash`.
- The pod audit command processed the `kubectl get pods` header row. Updated the `awk` command to skip the header.
- Added a managed node-pool caveat so users know provider-level taint configuration is preferred for AKS or other managed pools that scale or replace nodes.

## Review Notes
The guide is technically valid after the corrections. The examples are provider-neutral, but users should still verify their own cluster's actual Windows node taints because managed Kubernetes providers do not all apply the same taint keys or values by default.
