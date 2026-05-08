# Validation Summary: Fixing Encryption Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- WireGuard
- IPsec
- Linux kernel networking
- iperf3

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm Values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium troubleshooting documentation for `cilium-dbg monitor` and `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The verification command used `cilium encrypt status`, but the current Cilium CLI command is `cilium encryption status`. Updated the command.
- The IPsec Helm example set `encryption.ipsec.keyFile=/etc/ipsec/keys`, but Cilium's documented IPsec workflow uses a Kubernetes secret, and the Helm `encryption.ipsec.keyFile` value is the key name inside that secret rather than a host file path. Removed the misleading host-path setting.
- The protocol-selection comments described AES-NI as "hardware offload." AES-NI is CPU crypto acceleration, while offload usually refers to NIC/XFRM offload. Updated the wording.
- The troubleshooting guidance mentioned "userspace WireGuard," but Cilium's documented WireGuard encryption requires kernel-mode WireGuard support. Replaced that with Cilium-relevant causes such as MTU fragmentation and double encapsulation in tunnel mode.
- The validation checklist used `cilium monitor` and `cilium endpoint list`, but those are local agent operations exposed through `cilium-dbg` inside a Cilium pod. Updated the script to select a Cilium pod and run `cilium-dbg monitor --type drop` and `cilium-dbg endpoint list`.
- The endpoint health check counted `not-ready` endpoints as `ready` endpoints because it used a broad `grep -c "ready"`. Updated the grep patterns to match endpoint state as a separate whitespace-delimited field.

## Review Notes
- The post remains a high-level performance guide. Exact throughput overhead depends heavily on kernel version, NIC capabilities, CPU features, MTU, routing mode, packet size, and workload shape, so the conclusion's 20-30% overhead target should be treated as an operational goal rather than a universal guarantee.
