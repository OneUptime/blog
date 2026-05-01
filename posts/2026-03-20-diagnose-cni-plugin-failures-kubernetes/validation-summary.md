# Validation Summary: How to Diagnose CNI Plugin Failures During Pod Creation in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Calico
- Flannel
- Cilium
- `kubectl`
- `crictl`
- `cnitool`
- Linux networking

## Sources Consulted
- Kubernetes: Debugging Kubernetes nodes with crictl - https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Kubernetes: Network Plugins - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes: kube-controller-manager reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Calico: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Flannel: project README and deployment manifest - https://github.com/flannel-io/flannel and https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Cilium: Troubleshooting - https://docs.cilium.io/en/stable/network/kubernetes/troubleshooting/
- CNI: specification - https://github.com/containernetworking/cni/blob/main/SPEC.md
- CNI: cnitool README - https://github.com/containernetworking/cni/blob/main/cnitool/README.md

## Issues Found
- The original direct-test section used `docker ps` and `docker inspect` to locate pod sandboxes. That is outdated for modern Kubernetes because current node-debug guidance uses CRI tooling. I replaced those commands with `crictl` and `cnitool` examples.
- The original `calicoctl ipam show --summary` command used a flag that is not documented for `calicoctl ipam show`. I changed it to `calicoctl ipam show`, which already prints the IP usage summary.
- The original JSON validation note referenced the Python 2 era error string `No JSON object could be decoded`. I replaced it with a generic JSON parse error note so it remains correct for current Python 3.
- The original Flannel reinstall example relied on a local `kube-flannel.yml` file without identifying the current official manifest source. I changed it to the documented Flannel release manifest URL.
- The original generic log command hard-coded `kube-system`, which is not correct for all plugins covered by the post. I changed it to use a `<cni-namespace>` placeholder.
- The original node-reset note implied surviving pods would automatically keep working after deleting `/var/lib/cni/`. I corrected the explanation to reflect that local allocation state is rebuilt on new sandbox creation and existing pods may need recreation.

## Review Notes
- The Calico namespace differs by installation method. Current Calico docs use `calico-system` for operator-based installs and `kube-system` for manifest-based installs, so the post's dual examples are reasonable.
- The Flannel and Cilium pod-label examples are consistent with current upstream manifests and troubleshooting docs.
- `cnitool` is a low-level CNI test utility and may not be installed on production nodes by default.
