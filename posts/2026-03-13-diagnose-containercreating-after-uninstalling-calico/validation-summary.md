# Validation Summary: How to Diagnose ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Calico
- containerd / CRI
- kubelet diagnostics
- Linux systemd journal logs

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes kubeadm troubleshooting documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/troubleshooting-kubeadm/
- CNI specification: https://www.cni.dev/docs/spec/
- containerd CRI configuration documentation: https://containerd.io/docs/2.1/cri/config/
- containerd crictl documentation: https://containerd.io/docs/2.1/cri/crictl/
- libcni package documentation: https://pkg.go.dev/github.com/containernetworking/cni/libcni

## Issues Found
- The introduction said kubelet calls the CNI plugin directly. For modern Kubernetes, kubelet asks the container runtime to create the pod sandbox, and the runtime loads CNI configuration and plugins. Updated the explanation to match current Kubernetes documentation.
- The symptoms said all new pods cannot start. Host-networked pods do not require normal pod-network CNI setup in the same way, so this was narrowed to new non-hostNetwork pods.
- The node condition wording used `NetworkPlugin not initialized`. Updated it to `NetworkPluginNotReady`, `cni plugin not initialized`, or similar messages, which better matches common kubelet/runtime status output.
- The root cause about Calico config precedence was too absolute. Updated it to explain that stale Calico config is loaded first when the runtime is configured to load only one CNI config, such as containerd's default `max_conf_num = 1`.
- The root cause and diagnostic step said to restart or inspect kubelet CNI configuration. Since Kubernetes 1.24 removed kubelet CNI management flags, updated the post to inspect container runtime CNI configuration with `crictl info` and containerd config instead.

## Review Notes
The post assumes Linux nodes with standard CNI paths (`/etc/cni/net.d` and `/opt/cni/bin`) and a containerd-style runtime configuration. Those defaults are common, but managed Kubernetes distributions or CRI-O-based clusters may use different paths or tooling.
