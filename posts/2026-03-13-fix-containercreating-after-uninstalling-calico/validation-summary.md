# Validation Summary: How to Fix ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Calico
- Flannel
- kubectl

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Troubleshooting CNI plugin-related errors: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/troubleshooting-cni-plugin-related-errors/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Calico quickstart guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Flannel README and Kubernetes deployment instructions: https://github.com/flannel-io/flannel
- containerd CRI CNI configuration documentation: https://containerd.io/docs/2.1/cri/config/

## Issues Found
- The post used the old `coreos/flannel` raw manifest URL. Flannel's current official documentation recommends `https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml`, so the install command was updated.
- The post hardcoded Calico `v3.27.0`, which is not the current Calico documentation version. The reinstall example now sets `CALICO_VERSION=v3.32.0` and notes that operators should use the same Calico version their cluster was running.
- The post stated that stuck `ContainerCreating` pods "will not automatically retry scheduling." That is inaccurate because those pods are already scheduled, and Kubernetes/kubelet can retry container setup. The wording now says to delete pods only if they do not recover promptly after the CNI is healthy.
- The post said the key action was ensuring only one CNI config file exists. This was too absolute because CNI configuration can be a plugin list and runtimes such as containerd load a limited number of config files from the configured CNI directory. The wording now says only one primary CNI config should be active.

## Review Notes
The commands are Linux/node-access oriented and assume SSH access to every Kubernetes node plus conventional CNI paths (`/etc/cni/net.d` and `/opt/cni/bin`). Some managed Kubernetes services restrict this access or use provider-specific recovery workflows.
