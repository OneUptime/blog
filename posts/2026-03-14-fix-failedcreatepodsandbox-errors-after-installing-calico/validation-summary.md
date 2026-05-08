# Validation Summary: Fixing FailedCreatePodSandBox Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico Open Source
- calicoctl
- Container Network Interface (CNI)
- Linux systemd/kubelet operations

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico CNI plugin installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico CNI plugin configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico IPAM command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico IPPool documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico node status command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- BusyBox command reference for wget options: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The CNI binary check used `ls -la /host/opt/cni/bin/calico*` directly after `kubectl debug --`. The wildcard would not be expanded reliably because it is passed as a command argument rather than evaluated by a shell inside the debug container. Changed it to run through `sh -c`.
- The kubelet restart command used a BusyBox debug container with `nsenter` and no privileged debug profile. Kubernetes documentation notes that node debug pods are not privileged by default and recommends `--profile=sysadmin` when privileged host access is needed. Changed the command to use an Ubuntu debug container, `--profile=sysadmin`, and `chroot /host systemctl restart kubelet`.
- The recovery checklist used `calicoctl ipam check`, which is documented for Calico Enterprise but not in the Calico Open Source latest IPAM command set. Replaced it with the Open Source documented `calicoctl ipam show --show-blocks` and adjusted the layer label from consistency to allocation status.
- The BusyBox `wget` command used GNU-style `--timeout=5`. BusyBox documents `-T SEC` for network read timeout, so the command was updated to `-T 5`.

## Review Notes
The post assumes the operator-installed Calico namespace `calico-system`. Manifest-based Calico installations often run `calico-node` in `kube-system`, so readers may need to adjust the namespace for their deployment. The guide's CNI path checks are consistent with standard Linux CNI locations and Calico documentation, but managed Kubernetes distributions may restrict host debugging or kubelet restarts.
