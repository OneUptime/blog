# Validation Summary: Validating WireGuard vs IPsec Performance Differences in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium transparent encryption
- Kubernetes
- Helm
- WireGuard
- IPsec
- iperf3
- netperf
- Bash, jq, awk, sort, bc

## Sources Consulted
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium CLI `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium v1.14 Helm values: https://raw.githubusercontent.com/cilium/cilium/v1.14.0/install/kubernetes/cilium/values.yaml
- Netperf manual, TCP_RR request/response test: https://hewlettpackard.github.io/netperf/doc/netperf.html

## Issues Found
- The post used `cilium encrypt status`, which is the Cilium agent/debug command form rather than the current Cilium CLI command. Changed it to `cilium encryption status`.
- The IPsec Helm example set `encryption.ipsec.keyFile=/etc/ipsec/keys`, but in Cilium v1.14 that value is the key filename inside the secret, not a full path, and current Cilium documentation uses a Kubernetes secret for IPsec keys. Changed the example to verify the `cilium-ipsec-keys` secret and set `encryption.ipsec.secretName=cilium-ipsec-keys`.
- The TCP_RR `netperf` parsing used `awk '{print $1}'`, but the transaction rate is the final column in the default output. Changed it to `awk '{print $NF}'`.
- The statistics snippet used `awk asort()`, which requires GNU awk and fails with common default awk implementations such as mawk. Reworked percentile calculation to use `sort -n` plus POSIX-compatible `awk`.

## Review Notes
The throughput and latency thresholds are environment-specific examples, not universal performance guarantees. The post correctly frames them as acceptance criteria for a controlled validation environment.
