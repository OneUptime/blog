# Validation Summary: How to Diagnose CNI Plugin Failures During Pod Creation

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Container Network Interface (CNI)
- Calico
- Cilium
- Flannel
- Linux network namespaces, kernel modules, bridges, and MTU

## Sources Consulted
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes network plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes registry migration announcement: https://kubernetes.io/blog/2022/11/28/registry-k8s-io-faster-cheaper-ga/
- CNI specification: https://www.cni.dev/docs/spec/
- CNI `cnitool` documentation: https://www.cni.dev/docs/cnitool/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Cilium IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Flannel project documentation: https://github.com/flannel-io/flannel

## Issues Found
- The introduction said CNI failures put pods into `CrashLoopBackOff`. A pod whose sandbox network cannot be created usually remains in `ContainerCreating` or `Pending`; `CrashLoopBackOff` applies after containers repeatedly start and fail. Updated the wording.
- Several `kubectl debug node` examples accessed host files as if `/opt/cni/bin`, `/etc/cni/net.d`, and host logs were directly in the debug container root. Kubernetes node debug pods mount the node filesystem at `/host`, so host file paths and kubelet log access were corrected.
- Host-level operations such as loading modules and inspecting node internals may need elevated debug capabilities. Added `--profile=sysadmin` to node debug examples that require host-level access.
- The Calico IPPool YAML example implied that `kubectl get ippools ... -o yaml` shows available address counts. It shows pool configuration, not usage. Added `calicoctl ipam show --show-blocks` for utilization.
- The manual CNI execution example invoked `/opt/cni/bin/calico` directly with a `.conflist`, which is not a reliable way to execute a full CNI configuration chain. Replaced it with a `cnitool add` example using `CNI_PATH` and `NETCONFPATH`, matching CNI tooling documentation.
- The Calico IP conflict check used `calico-node -birdv`, which is not an IPAM consistency command. Replaced it with `calicoctl ipam show --show-blocks`.
- The test pod used `k8s.gcr.io/pause:3.8`. Kubernetes images moved to `registry.k8s.io` starting with Kubernetes 1.25, so the image reference was updated to `registry.k8s.io/pause:3.8`.
- The bridge inspection example used `brctl show`, which is often unavailable on modern systems. Replaced it with `ip link show type bridge` and `bridge link`.
- The MTU section overstated the failure mode by saying mismatches prevent plugin initialization. Updated it to say MTU mismatches can cause post-initialization networking problems and may surface as setup errors in some configurations.

## Review Notes
Local checks: extracted Bash snippets passed `bash -n`, the YAML snippet parsed successfully with PyYAML, and `git diff --check` reported no whitespace errors. Runtime validation against a live Kubernetes cluster was not possible in this workspace because `kubectl` is not installed.
