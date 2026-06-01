# Validation Summary: How to Configure AKS Image Cleaner to Auto Remove Stale Container Images from

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Image Cleaner
- Eraser
- Azure CLI
- Kubernetes
- kubectl
- Trivy
- Prometheus metrics
- AKS node pools and ephemeral OS disks

## Sources Consulted
- Microsoft Learn: Use Image Cleaner on Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/image-cleaner
- Microsoft Learn: Azure CLI `az aks`: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az aks nodepool`: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Create and manage AKS node pools: https://learn.microsoft.com/en-us/azure/aks/manage-node-pools
- Kubernetes docs: Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes docs: kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes docs: Images and image pull policy: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes docs: Garbage Collection: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Eraser docs: Architecture: https://eraser-dev.github.io/eraser/docs/architecture
- Eraser docs: Manual Removal: https://eraser-dev.github.io/eraser/docs/manual-removal

## Issues Found
- The Azure CLI examples used `--image-cleaner-enabled`, which is not the documented AKS flag. Changed enable commands to `--enable-image-cleaner` and the disable command to `--disable-image-cleaner`.
- The post recommended 6-hour and 12-hour cleanup intervals, but AKS documents a minimum `--image-cleaner-interval-hours` value of 24 hours. Updated those examples to daily cleanup and noted the minimum.
- The post described ImageList resources as both removal and exclusion lists. AKS requires manual removal ImageList resources to be named `imagelist`, and exclusions are configured with a labeled ConfigMap in `kube-system`. Updated the examples and explanations accordingly.
- The post implied vulnerability scanning required separate enablement and only removed high or critical vulnerabilities. AKS Image Cleaner includes Trivy in the worker pod by default and does not allow customizing vulnerability severities. Updated the section to match AKS documentation.
- The `kubectl debug` disk command checked `/`, which is the debug container root, not the node root. Updated it to check `/host`, which Kubernetes mounts as the node filesystem.
- The image-count command used `crictl` inside a BusyBox debug container, where `crictl` would not normally be available. Replaced it with a `kubectl describe node` command that lists images reported for the node.
- The AKS node pool example used `--os-disk-size-gb` and `--os-disk-type`, but the documented node pool flags are `--node-osdisk-size` and `--node-osdisk-type`. Updated the command.
- The opening description and summary overstated Image Cleaner as removing all unused images. Updated wording to focus on vulnerable unused images, which is the documented AKS automatic cleanup behavior.

## Review Notes
Azure CLI was not installed in the local environment, so CLI verification was performed against Microsoft Learn CLI and AKS documentation rather than local `az --help` output. The post's title appears truncated, but that is an editorial issue rather than a technical correctness issue.
