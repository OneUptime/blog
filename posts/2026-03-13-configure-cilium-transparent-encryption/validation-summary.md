# Validation Summary: How to Configure Cilium Transparent Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- WireGuard
- IPsec
- Linux XFRM
- tcpdump

## Sources Consulted
- Cilium Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium cilium-dbg encrypt status command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_encrypt_status/

## Issues Found
- The post claimed Cilium transparent encryption encrypts all pod-to-pod traffic. Updated this to cross-node traffic between Cilium-managed pods and noted that same-node pod traffic is intentionally not encrypted.
- The post said Cilium supports only two encryption modes. Updated this to mention current Cilium support for WireGuard, IPsec, and ztunnel, while keeping the guide focused on WireGuard and IPsec.
- The prerequisites and comparison table used overly specific or outdated kernel-version claims. Updated them to refer to current Cilium kernel requirements, WireGuard kernel/module support, and IPsec/XFRM kernel support.
- The IPsec key example omitted the recommended `+` suffix on the key ID. Added `3+` so the example uses Cilium's recommended per-tunnel IPsec key format.
- The verification command used `cilium status | grep Encryption`, while the official validation flow runs `cilium-dbg status` from inside a Cilium pod. Updated the command accordingly and kept `cilium-dbg encrypt status`.
- The tcpdump example used a broad `not port 22` filter. Updated it to look for WireGuard UDP port 51871 or IPsec ESP traffic, matching the expected encrypted traffic types.
- The IPsec key rotation example hard-coded a new key ID and patched base64-encoded `data`. Updated it to read and increment the current key ID, roll over after 15, keep the recommended `+` suffix, and patch `stringData`.
- The conclusion said encryption is enforced at the eBPF layer. Updated this to "Cilium's datapath" because IPsec uses the Linux XFRM/IPsec stack in combination with Cilium's datapath.

## Review Notes
The Helm values `encryption.enabled=true` and `encryption.type=wireguard|ipsec` are current. For new installations, Cilium's official examples use `helm install`; this post uses `helm upgrade --reuse-values`, which is appropriate for enabling encryption on an existing Helm-managed Cilium release.
