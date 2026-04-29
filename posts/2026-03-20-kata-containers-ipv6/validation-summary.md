# Validation Summary: How to Configure Kata Containers with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kata Containers
- IPv6
- containerd
- nerdctl
- Kubernetes RuntimeClass
- CNI bridge plugin
- CNI host-local IPAM
- CNI portmap plugin

## Sources Consulted
- Kata Containers networking architecture: https://github.com/kata-containers/kata-containers/blob/main/docs/design/architecture/networking.md
- Kata Containers install with containerd: https://github.com/kata-containers/kata-containers/blob/main/docs/install/container-manager/containerd/containerd-install.md
- Kata Containers runtime README: https://github.com/kata-containers/kata-containers/blob/main/src/runtime/README.md
- Kata manager script: https://github.com/kata-containers/kata-containers/blob/main/utils/kata-manager.sh
- containerd CRI config guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- nerdctl command reference: https://github.com/containerd/nerdctl/blob/main/docs/command-reference.md
- CNI bridge plugin docs: https://www.cni.dev/plugins/current/main/bridge/
- CNI host-local IPAM docs: https://www.cni.dev/plugins/current/ipam/host-local/
- CNI portmap plugin docs: https://www.cni.dev/plugins/current/meta/portmap/
- Kubernetes RuntimeClass docs: https://kubernetes.io/docs/concepts/containers/runtime-class/

## Issues Found
- The networking explanation said a veth pair directly bridged the host CNI network into the VM. Kata’s documented model is CNI-managed veth plus a VM tap device connected with TC redirection, so the description and diagram were corrected.
- The post referred to `kata-runtime` as the component passing network configuration into the VM. For Kata 2.x under containerd, the relevant runtime/shim component is `containerd-shim-kata-v2`, so that reference was corrected.
- The installation command was wrong. `kata-manager.sh` is invoked directly rather than with `install-kata-tools`, and the unverified snap alternative was removed.
- The CNI snippet was not valid JSON because it included a `//` comment line. The file path was moved outside the JSON block.
- The IPv6 subnet `fd00:kata::/64` was invalid because `kata` is not valid hexadecimal in an IPv6 address. It was replaced with the valid ULA prefix `fd00:88::/64`.
- The containerd runtime snippet used the older CRI plugin path. It was updated to the current containerd 2.x CRI table path.
- The `nerdctl` and `kubectl` verification commands relied on checks that were technically misleading, including the claim that `kata-agent` would appear as PID 1 inside the container and that `/proc/cpuinfo` would verify Kata isolation. Those were replaced with checks for IPv6 presence and guest-vs-host kernel comparison.
- The troubleshooting section described `journalctl -u containerd` as if it were showing `kata-agent` logs from inside the VM. That wording was corrected to describe containerd / Kata runtime log inspection instead.
- The troubleshooting section reused the invalid IPv6 prefix and a `ping6` example tied to it. The gateway address was corrected and the command updated.
- The firewall section previously implied manual `ip6tables` NAT66 rules were the normal requirement. The guidance was corrected to rely on CNI bridge `ipMasq`, verify IPv6 forwarding, and only add ICMPv6 forward rules when host firewall policy requires it.

## Review Notes
- The containerd configuration snippet now targets containerd 2.x. containerd 1.x still uses the older `plugins."io.containerd.grpc.v1.cri"` CRI path.
- The firewall example uses `ip6tables` syntax for hosts using the iptables family. Some systems may instead rely on nftables, which the current CNI plugins also support.
- No dedicated Kata-only IPv6 toggle is required in `configuration.toml`; success depends primarily on correct CNI/IPAM setup and host IPv6 forwarding/firewall policy.
