# Validation Summary: How to Change the Default Pod Network CIDR for IPv4 in kubeadm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- Flannel
- Calico
- IPv4 networking

## Sources Consulted
- Kubernetes kubeadm configuration API (`v1beta4`): https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes `kubeadm init` reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes installing kubeadm (`criSocket` / containerd path): https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Flannel official repository deployment guidance: https://github.com/flannel-io/flannel
- Calico on-premises installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico manifest customization options: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The kubeadm config examples used `kubeadm.k8s.io/v1beta3`, which is outdated relative to current official kubeadm documentation. Updated both config documents to `kubeadm.k8s.io/v1beta4`.
- The examples pinned Kubernetes `v1.29.0`, which is outdated for a general-purpose guide and unnecessary for demonstrating Pod CIDR configuration. Removed the explicit version pin from both examples.
- The Flannel manifest URL pointed at the repository branch path. Updated it to Flannel's current official release download URL.
- The Calico instructions were incorrect for kubeadm-based installs. Applying the manifest and then setting `CALICO_IPV4POOL_CIDR` on the DaemonSet is not the current kubeadm guidance. Replaced this with the current documented behavior: Calico automatically detects the kubeadm Pod CIDR.
- `kubectl get nodes -o wide` does not display each node's Pod CIDR, so it did not validate the claim it was paired with. Replaced it with a JSONPath command that prints `.spec.podCIDR` for each node.
- The closing statement said changing the CIDR post-init requires a full cluster rebuild. Softened this to reflect current reality more accurately: it usually requires reconfiguring the cluster and CNI, and is often simplest as a rebuild.

## Review Notes
- The post is technically valid after correction.
- Calico's current documentation notes that manifest-based installation is maintained for upgrade compatibility, while new clusters are generally recommended to use the operator. The manifest example remains valid, but it is not the preferred installation path for new Calico deployments.
