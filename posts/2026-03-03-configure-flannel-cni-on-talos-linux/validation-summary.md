# Validation Summary: How to Configure Flannel CNI on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Flannel CNI
- Kubernetes networking
- VXLAN overlay networking
- WireGuard (Flannel backend)
- host-gw (Flannel backend)
- talosctl CLI
- kubectl

## Sources Consulted
- Talos Linux configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos Linux networking resources: https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos Flannel manifest (siderolabs/talos `pkg/flannel`): https://pkg.go.dev/github.com/siderolabs/talos/pkg/flannel
- Sidero Flannel CNI docs: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Flannel backends documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Talos GitHub discussions #8037 and #7891 (Flannel removal/restore)

## Issues Found
1. **Wrong namespace for Flannel in Talos.** The post stated Flannel is deployed in the `kube-flannel` namespace. Talos's bundled Flannel manifest deploys into `kube-system`, not `kube-flannel` (which is the upstream `flannel-io/flannel` manifest convention). Updated the prose in "How Flannel Works in Talos Linux" and every `kubectl` command using `-n kube-flannel` to use `-n kube-system`.
2. **Wrong DaemonSet name.** The post used `kube-flannel-ds` (the upstream Flannel name) for the `kubectl rollout restart` command. In Talos the DaemonSet is named `kube-flannel`. Corrected to `kubectl rollout restart daemonset -n kube-system kube-flannel`.
3. **Wrong pod label selector.** The post used `-l app=flannel` for `kubectl logs`. Talos's Flannel DaemonSet labels pods with `k8s-app=flannel`. Updated all `kubectl logs` selectors to `-l k8s-app=flannel`.

## Review Notes
- VXLAN defaults (VNI=1, Port=8472), VXLAN MTU overhead (50 bytes), and WireGuard MTU overhead (80 bytes as used by Flannel) are all correct.
- `talosctl get links flannel.1` does work — `LinkStatus` reflects all kernel-visible interfaces, including CNI-created ones, once Flannel has started on the node.
- `talosctl pcap` flags (`--interface`, `--bpf-filter`, `--duration`, `-o`) are all valid.
- Flannel flags `--iface`, `--iface-regex`, `--ip-masq`, `--kube-subnet-mgr` are all current and valid.
- Talos config fields `cluster.network.cni.name`, `podSubnets`, `serviceSubnets`, and the `cni.name: none` value for disabling default CNI are all correct.
- The claim that Flannel has no native NetworkPolicy enforcement is correct (Canal pairs Flannel with Calico for policy).
- Note: changing the pod CIDR or migrating away from Flannel on an existing cluster is genuinely disruptive — the post's caveats here are appropriate.
