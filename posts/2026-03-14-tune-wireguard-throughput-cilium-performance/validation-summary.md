# Validation Summary: Tuning WireGuard Throughput in Cilium Performance

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Helm
- Linux networking
- eBPF host routing
- iperf3

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Helm Reference / Helm values: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI `encryption status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium CNI Performance Benchmark, WireGuard/IPsec section: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- WireGuard protocol documentation: https://www.wireguard.com/protocol/

## Issues Found
- The description mentioned hardware offload options, but the post does not cover hardware offload and WireGuard's Cilium tuning path is not presented that way in the official docs. Changed the description to mention MTU and routing options instead.
- The introduction claimed WireGuard is significantly faster than IPsec. Cilium's benchmark documentation shows WireGuard can reach higher maximum throughput, but IPsec can be more CPU-efficient when AES-NI acceleration is available. Reworded the claim to be hardware-dependent.
- The command `cilium encrypt status` is not the current Cilium CLI command. Changed it to `cilium encryption status`.
- The enablement example set `encryption.wireguard.userspaceFallback=false`. Current Cilium stable Helm values no longer list that option, and current documentation requires kernel WireGuard support. Removed it from the main Helm command and clarified the fallback note as relevant to older releases.
- The CPU feature check referenced AESNI for ChaCha20. WireGuard uses ChaCha20-Poly1305; AES-NI is relevant to AES-based IPsec acceleration, not WireGuard ChaCha20. Changed the check to SIMD features commonly used by optimized ChaCha20 implementations.
- The MTU section stated WireGuard always adds 80 bytes. Corrected this to 60 bytes for IPv4 outer headers and 80 bytes for IPv6 outer headers, while keeping 1420 as a conservative setting.
- The BPF host routing example included `tunnel=disabled`, which is not the current Helm value shown in stable Helm values. Removed it and retained `routingMode=native`.
- Replaced `wg show cilium_wg0` inside the Cilium DaemonSet with the officially documented `cilium-dbg debuginfo --output json | jq .encryption` approach for WireGuard interface and peer inspection.
- Removed the deterministic "70-90% of unencrypted throughput" expectation because Cilium's official benchmarks show performance varies by configuration, MTU, and hardware.

## Review Notes
The guide is technically relevant and includes practical commands. Future improvements could add stronger caveats around native-routing prerequisites, especially the need for routable PodCIDRs or L2 adjacency when using `autoDirectNodeRoutes=true`.
