# Validation Summary: How to Configure Cilium IPsec Transparent Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes
- IPsec / ESP
- Linux XFRM
- Helm
- kubectl

## Sources Consulted
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- RFC 4106, The Use of Galois/Counter Mode (GCM) in IPsec Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4106.html

## Issues Found
1. **Outdated kernel prerequisite.** The post listed Linux kernel 4.19+. Current Cilium system requirements recommend Linux kernel 5.10+ or an equivalent supported distribution kernel, and IPsec requires specific XFRM and crypto kernel options. Updated the prerequisite accordingly.

2. **Outdated Cilium prerequisite.** The post listed Cilium 1.10+. Current Cilium IPsec guidance strongly recommends per-tunnel keys, and the older global key mode was deprecated in Cilium 1.16. Updated the prerequisite to Cilium 1.16+ for per-tunnel IPsec keys.

3. **Deprecated global IPsec key format.** The secret examples used `3 rfc4106(gcm(aes)) ...`, which creates the older global key format. Current Cilium documentation strongly recommends the `+` suffix, such as `3+`, to enable per-tunnel IPsec key derivation. Updated both the initial secret and rotation examples.

4. **Misnamed key field.** The post described the first secret field as `<SPI>`. Cilium documentation describes it as a `key-id`; it influences the key ID used by Cilium and should be incremented during rotation. Updated the format description to use `<key-id>`.

5. **Key rotation command was too simplistic.** The original rotation example hard-coded key ID 4 and recreated/applied the Secret. Current Cilium documentation recommends reading the current key ID, incrementing it with rollover from 15 to 1, and patching the `cilium-ipsec-keys` Secret. Updated the example to follow that pattern and added the Cilium caveat to avoid key rotation during upgrades or downgrades.

6. **Overly absolute rotation claim.** The post stated that Cilium performs rolling key rotation "without dropping connections." The official documentation says old and new keys are used during transition and explains timing and error caveats. Reworded the statement to describe the transition behavior without overpromising.

## Review Notes
- The Helm values `encryption.enabled=true` and `encryption.type=ipsec` are correct for Cilium.
- The `cilium-dbg encrypt status`, `ip xfrm state`, and `ip xfrm policy` verification commands are appropriate.
- The `cilium-dbg monitor --type drop` flag is valid, though Cilium's official IPsec validation guidance also recommends checking ESP traffic with `tcpdump`.
- Current Cilium documentation notes additional operational caveats not fully covered by the post, including ESP firewall rules, direct-routing native CIDR configuration, CNI chaining limitations, Cluster Mesh key rotation considerations, and IPsec decryption being limited to a single CPU core per tunnel.
