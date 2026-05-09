# Validation Summary: How to Troubleshoot Cilium Transparent Encryption

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes
- WireGuard
- IPsec
- Linux XFRM
- tcpdump

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium `cilium-dbg encrypt status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_encrypt_status/
- Cilium `cilium-agent` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium XFRM Reference Guide: https://docs.cilium.io/en/latest/reference-guides/xfrm/

## Issues Found
- The IPsec secret format used `<SPI>` for the first field. Cilium documents this as a key ID, and current examples strongly recommend a trailing `+` to enable per-tunnel IPsec keys. Changed the format to `<key-id>+ rfc4106(gcm(aes)) <hex-key> 128`.
- The packet capture guidance said plaintext HTTP/TCP traffic means encryption is not working. Cilium documents that with IPsec it can be normal to observe both ESP outer packets and decrypted pod traffic on the same interface after recirculation. Clarified that the failure signal is plaintext without corresponding encrypted WireGuard or ESP traffic on the inter-node path, and recommended the `esp` filter for IPsec verification.
- The stale XFRM mitigation recommended restarting the Cilium DaemonSet. Current Cilium documentation recommends performing a key rotation to restore fresh, consistent XFRM states in documented stale-state cases. Updated the mitigation text and command block accordingly.

## Review Notes
None.
