# Validation Summary: Recover Flannel VXLAN Routes After Reboot

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes and `kubectl`
- Flannel v0.28.9 and the Linux VXLAN backend
- NetworkManager and `nmcli`
- Linux routing, neighbor, and VXLAN forwarding state
- CNI bridge networking
- systemd module loading and sysctl configuration

## Sources Consulted
- [Flannel v0.28.9 release notes](https://github.com/flannel-io/flannel/releases/tag/v0.28.9)
- [Flannel v0.28.9 configuration and health checks](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md)
- [Flannel v0.28.9 Kubernetes manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml)
- [Flannel running and restart behavior](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/running.md)
- [Flannel backend documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md)
- [Flannel troubleshooting documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/troubleshooting.md)
- [Flannel VXLAN route, neighbor, FDB, and device-recreation source](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan_network.go)
- [Flannel v0.27.4 release notes](https://github.com/flannel-io/flannel/releases/tag/v0.27.4)
- [Flannel CNI delegation source](https://github.com/flannel-io/cni-plugin/blob/main/flannel_linux.go)
- [CNI bridge plugin source](https://github.com/containernetworking/plugins/blob/main/plugins/main/bridge/bridge.go)
- [NetworkManager configuration reference](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html)
- [NetworkManager daemon reference](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.html)
- [`nmcli` reference](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html)
- [`kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [`kubectl wait` v1.34.1 implementation](https://github.com/kubernetes/kubernetes/blob/v1.34.1/staging/src/k8s.io/kubectl/pkg/cmd/wait/wait.go)
- [`kubectl delete` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes JSONPath documentation](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes field-selector documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Filesystem Hierarchy Standard: `/run`](https://specifications.freedesktop.org/fhs/latest/run.html)
- [Linux kernel IPv4 sysctl documentation](https://docs.kernel.org/networking/ip-sysctl.html)
- [Linux kernel bridge/netfilter documentation](https://www.kernel.org/doc/html/latest/networking/bridge.html)
- [systemd `modules-load.d` documentation](https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html)
- [systemd `sysctl.d` documentation](https://www.freedesktop.org/software/systemd/man/latest/sysctl.d.html)
- [iproute2 `ip-route(8)` manual](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [iproute2 `ip-neighbour(8)` manual](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html)
- [iproute2 `bridge(8)` manual](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [`lsmod(8)` manual](https://man7.org/linux/man-pages/man8/lsmod.8.html)

## Issues Found
- An empty `/run/flannel` was listed as a cause of failed route reconciliation. `subnet.env` is an output written after Flannel initializes, so its absence is a symptom and can block new CNI operations, but it does not itself prevent Flannel from reconstructing VXLAN state. Removed it from the causal list.
- The NetworkManager snippet used `unmanaged-devices=`, which could replace unmanaged-device rules loaded from distribution configuration. Changed it to the documented list-append form, `unmanaged-devices+=`, and used explicit literal interface matches so existing rules are preserved.
- The bare `flannel*` example was not valid glob syntax in NetworkManager's device-list format. Changed it to the qualified `interface-name:flannel*` matcher, for which simple globbing is supported.
- The replacement-Pod readiness sequence could race the DaemonSet controller: `kubectl wait --for=condition=Ready` returns `no matching resources found` if it runs before the replacement Pod exists. Added a separate `kubectl wait --for=create` before the readiness wait.
- The post described both `flannel.1` and `cni0` as Flannel-owned. `flanneld` owns the VXLAN device, while the delegated CNI bridge plugin creates `cni0`. Updated the terminology to refer to Flannel and CNI devices.
- A failed `lsmod` match could be mistaken for proof that kernel support is absent. Added the caveat that `lsmod` does not report features compiled into the kernel.
- The bridge-netfilter module and `bridge-nf-call-iptables` setting were presented as universal VXLAN prerequisites. Qualified them as requirements for the default upstream iptables path and noted that an nftables-only design can have different requirements.
- “Windows backends” treated a platform implementation as a backend type. Updated the wording to distinguish Windows implementations from backend choices.

## Review Notes
- Flannel v0.28.9, released on 2026-08-07, is the current release reviewed. Its upstream manifest enables `/healthz` and `/readyz`; readiness becomes successful only after traffic rules are initialized and `subnet.env` is written. Older manifests may omit these probes, as the post notes.
- Missing-VXLAN-device detection and recreation was introduced in Flannel v0.27.4. Operators should still verify routes, neighbor entries, and FDB entries after recovery because behavior differs by pinned release and failure mode.
- The namespace, ConfigMap name, labels, container name, and default `flannel.1` device used by the commands match the upstream manifest. Helm charts and distribution-integrated deployments may customize them.
- `kubectl logs --previous` normally reports an error when no previous container instance exists; that result is expected during diagnosis and does not make the command invalid.
