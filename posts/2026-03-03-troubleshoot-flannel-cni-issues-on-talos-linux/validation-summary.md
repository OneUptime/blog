# Validation Summary: How to Troubleshoot flannel CNI Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- Flannel CNI
- Kubernetes networking
- VXLAN
- CNI configuration
- kubectl
- talosctl

## Sources Consulted
- Talos Flannel CNI documentation: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Talos machine configuration reference for CNI settings: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos networking resources documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources
- Talos ingress firewall documentation for VXLAN ports: https://docs.siderolabs.com/talos/v1.11/networking/ingress-firewall
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos managed Flannel manifest package: https://pkg.go.dev/github.com/siderolabs/talos/pkg/flannel
- Flannel upstream documentation and backend reference: https://github.com/flannel-io/flannel
- Flannel backend configuration reference: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Talos Cilium deployment documentation: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium

## Issues Found
- The post used upstream flannel DaemonSet and label examples (`kube-flannel-ds`, `app=flannel`) that do not match Talos-managed flannel. Updated commands to use `daemonset kube-flannel` and `k8s-app=flannel`.
- The post said Talos flannel VXLAN uses UDP port `8472`. Talos-managed flannel sets VXLAN `Port` to `4789`, so the port checks and summary were updated.
- The interface selection guidance suggested editing the DaemonSet directly. Talos exposes flannel extra args through machine config, so the post now uses `cluster.network.cni.flannel.extraArgs`.
- The MTU guidance implied Talos-managed flannel MTU can be configured directly through the ConfigMap as normal practice. Updated it to note that Talos does not expose MTU as a managed machine config field and that custom flannel manifests are needed for persistent MTU customization.
- The `talosctl ls` command was replaced with the documented `talosctl list` command.
- The subnet lease section described lease expiry behavior that is not accurate for Talos-managed flannel using Kubernetes node PodCIDRs as the source of truth. Reworded it around PodCIDR changes.
- The Cilium static manifest URL in the CNI switching example returned 404. Replaced it with a generic manifest URL placeholder and clarified that disabling the default CNI is the common Talos approach for Cilium.
- The description of flannel storing node subnet information in etcd through the Kubernetes API was imprecise. Updated it to say flannel uses the Kubernetes API as the subnet manager for node PodCIDR information.

## Review Notes
The post is now accurate for Talos-managed flannel as documented in current Talos references. Some troubleshooting commands, such as UDP checks with `nc`, can still be environment-dependent because UDP does not provide the same connection semantics as TCP.
