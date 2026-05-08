# Validation Summary: Validating Encryption Performance in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes
- WireGuard
- IPsec
- iperf3
- netperf
- Bash, jq, gawk, and bc
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm values reference for encryption settings: https://docs.cilium.io/en/stable/helm-values/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- ESnet iperf3 documentation and manual page: https://software.es.net/iperf/
- Netperf manual for request/response tests: https://hewlettpackard.github.io/netperf/doc/netperf.html

## Issues Found
- The post used `cilium encrypt status`, which is not the current Cilium CLI command. Updated examples to use `cilium encryption status --per-node-details` and JSON output validation with `jq`.
- The validation script counted `peer` lines to infer encrypted node coverage, which is WireGuard-specific and does not work for IPsec. Replaced it with protocol-neutral validation that checks reported encryption modes are not `Disabled`.
- The introduction claimed validation proves all node pairs are encrypted. Cilium documents that same-node traffic is intentionally not encrypted, and the CLI validation proves node encryption state rather than every possible packet path. Narrowed the wording accordingly.
- The `netperf TCP_RR` parser used the first field of default output, which can read a request/response size column rather than the transaction rate. Added `-P 0` and read the last field for transactions per second.
- The statistical analysis snippet used `asort()`, which is a GNU awk extension, while the prerequisites only mentioned generic tools. Added `gawk` to prerequisites and changed the snippet to call `gawk`.
- Quoted `$SERVER_IP` in command examples to avoid shell word-splitting issues.
- Replaced the troubleshooting reference to "userspace WireGuard" with documented Cilium-relevant causes: missing kernel WireGuard support, MTU fragmentation, or missing AES-NI for IPsec.

## Review Notes
- Acceptance thresholds such as 6-8 Gbps and 20-30% overhead are environment-specific capacity targets, not Cilium guarantees.
- Cilium documents that strict encryption mode may be needed when users require stronger enforcement against temporary unencrypted traffic during endpoint discovery.
