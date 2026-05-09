# Validation Summary: How to Troubleshoot Installation Issues with Calico on Single-Node Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- Calico
- calicoctl
- Linux networking
- SELinux and AppArmor

## Sources Consulted
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubeadm installation and swap documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Calico IP autodetection documentation: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico IP pool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calico/node installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node

## Issues Found
- The post claimed that the control-plane taint prevents Calico pods from being scheduled. Calico's `calico-node` runs as a DaemonSet and the documented Calico DaemonSet includes broad `NoSchedule` tolerations, so this was changed to say the taint prevents regular workload pods from being scheduled on a single-node cluster.
- The CIDR mismatch section suggested patching `spec.cidr` on the existing `default-ipv4-ippool`. Calico's documented migration flow is to create a new IPPool, disable the old pool, and recreate affected pods for new allocations. The command sequence was updated accordingly.
- The kubeadm pod CIDR check used a broad `kubectl cluster-info dump | grep -i pod-cidr` command. This was changed to read the kubeadm configuration ConfigMap and grep `podSubnet`, which better matches kubeadm-managed clusters.

## Review Notes
- The `kubectl taint` commands match Kubernetes documentation for removing taints by key. The legacy `node-role.kubernetes.io/master` taint removal remains useful for older clusters.
- Calico supports the `IP_AUTODETECTION_METHOD=interface=...` environment variable for manifest-based installs. Operator-based installs should configure `nodeAddressAutodetectionV4` on the Installation resource instead.
- Swap guidance is accurate for the default kubelet behavior, though recent Kubernetes versions can be configured to tolerate or use swap explicitly.
