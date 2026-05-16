# Validation Summary: How to Troubleshoot DNS Resolution Failures on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes DNS
- CoreDNS
- kubelet DNS configuration
- kubectl

## Sources Consulted
- Talos Linux Host DNS documentation: https://docs.siderolabs.com/talos/v1.10/networking/host-dns
- Talos Linux machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Kubernetes Debugging DNS Resolution documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/

## Issues Found
- The post suggested checking DNS-related host errors with `talosctl dmesg | grep -i dns`. Talos official Host DNS documentation recommends `talosctl logs dns-resolve-cache` for resolver logs and `talosctl get dnsupstream` for upstream health, so the command was updated.
- The post used `talosctl images`, but the current Talos CLI reference uses `talosctl image list` to list CRI images. The command was corrected.
- The post used `talosctl get machineconfiguration`; Talos documentation refers to the resource as `machineconfig` for retrieving the current machine configuration. Both examples were corrected.
- The post stated that CoreDNS pod `/etc/resolv.conf` comes directly from the host. This is broadly true through kubelet resolver configuration, but Talos 1.8+ host DNS forwarding can configure `kube-dns`/CoreDNS to use the Talos host DNS resolver. The wording was adjusted to include that Talos-specific behavior.

## Review Notes
The remaining Kubernetes and CoreDNS commands align with official documentation, including the `k8s-app=kube-dns` label for CoreDNS pods, the `kube-dns` service name, CoreDNS ConfigMap editing, `kubectl rollout restart`, `dnsConfig.options.ndots`, and the CoreDNS `forward` plugin syntax.
