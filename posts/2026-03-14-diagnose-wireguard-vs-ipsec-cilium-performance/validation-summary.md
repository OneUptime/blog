# Validation Summary: Diagnosing WireGuard vs IPsec Performance Differences in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes
- WireGuard
- IPsec
- Linux XFRM/ESP
- Helm
- iperf3
- netperf
- Linux performance tools

## Sources Consulted
- Cilium Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for encryption key creation: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_create-key/
- Cilium CLI command reference for status and config commands: https://docs.cilium.io/en/latest/cmdref/
- Cilium cilium-dbg BPF command references: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/ and https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium cilium-dbg endpoint command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium XFRM reference guide: https://docs.cilium.io/en/latest/reference-guides/xfrm/
- WireGuard protocol documentation: https://www.wireguard.com/protocol/
- WireGuard installation documentation: https://www.wireguard.com/install/

## Issues Found
- The introduction stated that IPsec uses AES-GCM with hardware acceleration as an absolute property. Updated it to say Cilium IPsec uses Linux XFRM/ESP and can use AES-GCM with AES-NI acceleration when the configured algorithm and hardware support it.
- The IPsec Helm example set `encryption.ipsec.keyFile=/etc/ipsec/keys`, but Cilium's Helm value expects the key filename inside the Kubernetes secret, not the mounted path. Changed it to `encryption.ipsec.keyFile=keys`.
- The IPsec benchmark example did not create the required IPsec key secret before enabling IPsec. Added `cilium encryption create-key --auth-algo rfc4106-gcm-aes`.
- The diagnostic snapshot used old/local-agent style `cilium bpf` and `cilium endpoint` commands from the Kubernetes-facing Cilium CLI. Updated BPF map collection to run `cilium-dbg` inside the Cilium DaemonSet and changed endpoint collection to use the `CiliumEndpoint` CRD with `kubectl get ciliumendpoints --all-namespaces -o json`.

## Review Notes
- The benchmarking approach is directionally correct, but real results will depend on kernel version, Cilium version, routing mode, MTU, NIC offload support, CPU model, and whether traffic is pod-to-pod across nodes. The post intentionally keeps the benchmark harness generic.
- Cilium has a built-in `cilium connectivity perf` command in current CLI releases that could be considered in a future update, but the existing `iperf3` and `netperf` commands remain valid external benchmarking tools.
