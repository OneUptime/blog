# Validation Summary: How to Configure Node-to-Node Encryption with WireGuard in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Helm
- Linux networking
- tcpdump

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium latest WireGuard Transparent Encryption documentation, including node-to-node beta behavior and encryption matrix: https://docs.cilium.io/en/latest/security/network/encryption-wireguard/
- Cilium `cilium-dbg encrypt status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_encrypt_status/
- Cilium `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html

## Issues Found
- The post claimed Cilium node-to-node WireGuard encryption encrypts all traffic between Kubernetes nodes, including system and kubelet traffic. Cilium documents node-to-node encryption as covering node-to-node, pod-to-node, and node-to-pod traffic, but with exceptions. Updated the description, introduction, and conclusion to avoid the unsupported "all traffic" claim.
- The introduction could read as though transparent encryption is enabled by default. Clarified that the pod-only scope is the default scope after WireGuard transparent encryption is enabled.
- The post omitted the documented default control-plane node opt-out. Added a note that nodes with the `node-role.kubernetes.io/control-plane` label opt out by default to avoid Kubernetes API bootstrapping problems during WireGuard key updates.
- The verification section said allowed IPs should include pod CIDRs and node IPs. Cilium documentation and debug output refer to peer `allowed-ips`, which may contain pod IPs, pod CIDRs, and node IPs depending on configuration. Updated the wording to account for pod IPs or CIDRs and participating remote node IPs.
- The status check used `cilium-dbg encrypt status` and said it lists both pod-to-pod and node-level encryption as active. Cilium's documented validation flow uses status output for the concise encryption line, so the command was changed to `cilium-dbg status | grep Encryption` and the expected result now checks for WireGuard and node encryption enabled.
- The kubelet tcpdump example referenced API server to kubelet traffic without noting the control-plane opt-out. Updated it to verify worker-to-worker kubelet traffic and clarified that control-plane traffic is not encrypted by Cilium node-to-node encryption unless the opt-out selector is changed.

## Review Notes
- The Helm values `encryption.enabled=true`, `encryption.type=wireguard`, and `encryption.nodeEncryption=true` match Cilium documentation.
- The WireGuard interface name `cilium_wg0` and UDP port `51871` match Cilium documentation.
- Cilium documents node-to-node WireGuard encryption as beta in current stable documentation.
