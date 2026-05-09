# Validation Summary: How to Troubleshoot Installation Issues with Calico on On-Prem Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- CNI
- BGP
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure IP autodetection: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: System requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: Troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Kubernetes documentation: Network plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes documentation: kubectl cluster-info dump: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/kubectl_cluster-info_dump/

## Issues Found
- The IP auto-detection fix patched the `calico-node` DaemonSet directly with a JSON merge patch. In an operator-managed Calico installation, the documented configuration point is the `Installation` custom resource under `spec.calicoNetwork.nodeAddressAutodetectionV4`. I changed the command to patch `installation.operator.tigera.io/default` with `nodeAddressAutodetectionV4.interface`.
- The comment above the `kubectl logs -l k8s-app=calico-node` command said it read logs on a specific node, but the command selects all matching `calico-node` pods in the namespace. I changed the comment to describe the command accurately.

## Review Notes
The remaining commands and claims are consistent with current Calico and Kubernetes documentation. The post assumes an operator-managed Calico installation using the `calico-system` namespace; manifest-based installations may use `kube-system` and environment variables instead.
