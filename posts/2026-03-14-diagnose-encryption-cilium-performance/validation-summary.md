# Validation Summary: Diagnosing Encryption Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard transparent encryption
- IPsec transparent encryption
- Hubble
- eBPF and BPF tracing tools
- iperf3, perf, tcpdump, bpftool, bpftrace

## Sources Consulted
- Cilium transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `cilium encryption status`: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Cilium debug CLI command reference for `cilium-dbg encrypt status`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_encrypt_status.html
- Cilium debug CLI command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium debug CLI command reference for endpoint and BPF map commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble API protocol documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README.html

## Issues Found
- The post used `cilium encrypt status`, which is not the Kubernetes-facing Cilium CLI command. Changed it to `cilium encryption status --per-node-details`, matching the current Cilium CLI reference.
- The post implied Cilium encryption adds CPU overhead to every packet. Cilium WireGuard documentation states same-node traffic is not encrypted, so the statement was narrowed to encrypted cross-node traffic.
- The troubleshooting section mentioned "userspace WireGuard". Cilium requires kernel WireGuard support for WireGuard transparent encryption, so this was changed to checking kernel WireGuard support.
- Several datapath-local commands used `cilium bpf`, `cilium endpoint`, and `cilium monitor` as if they were Kubernetes-facing Cilium CLI commands. Updated them to run `cilium-dbg` inside the Cilium agent pod, matching current command references.
- Hubble JSON examples referenced flow fields at the top level. Hubble JSON output wraps flow data under `.flow`, so the `jq` filters were updated to use `.flow.verdict`, `.flow.source`, `.flow.destination`, and `.flow.drop_reason_desc`.

## Review Notes
The guide is technically relevant and useful. Some performance thresholds, such as "below 20-30%" overhead, are workload- and hardware-dependent and should be treated as operational targets rather than guarantees.
