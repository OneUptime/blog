# Validation Summary: Cilium Installation Next Steps: What to Do After Installing Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble
- Prometheus
- Grafana
- WireGuard
- IPsec
- IPAM

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- Cilium Hubble UI setup: https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro.html
- Cilium Layer 3 policy examples: https://docs.cilium.io/en/latest/security/policy/layer3/
- Cilium monitoring and metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Prometheus and Grafana guide: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium WireGuard transparent encryption: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg ip` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_ip/
- Grafana dashboard search results for Cilium Hubble dashboards: https://grafana.com/grafana/dashboards/

## Issues Found
- Hubble UI enablement was shown as a simple follow-up to `cilium hubble enable`. Cilium documents that if Hubble is already enabled, it must be disabled before re-enabling with `--ui`, so the command sequence was corrected.
- The monitoring step implied that applying the example Prometheus/Grafana manifest exposes Cilium metrics. Cilium metrics must be enabled separately, so the post now enables Cilium, operator, and Hubble metrics before applying the example monitoring stack.
- The monitoring example used the `HEAD` branch URL, which is not stable for a guide. It was changed to the versioned Cilium example URL from the official documentation.
- The Grafana comment identified dashboard ID 15513 as a Hubble dashboard. Current Grafana results identify Hubble dashboards under other IDs, while the official example stack includes Cilium and Hubble dashboards, so the comment was corrected.
- The encryption commands used `cilium encrypt enable --type ...`, which is not a current documented Cilium CLI workflow. They were replaced with Helm-value-based `cilium upgrade` commands and the current `cilium encryption create-key` command for IPsec.
- The encryption verification command used `cilium status` inside the Cilium pod. Cilium troubleshooting and encryption docs use `cilium-dbg` inside the agent pod, so the command was corrected to `cilium-dbg status`.
- The IPAM inspection command used `cilium ip list` inside the Cilium pod. Current in-pod diagnostics use `cilium-dbg ip list`, so the command was corrected.

## Review Notes
The network policy examples use current `cilium.io/v2` `CiliumNetworkPolicy` syntax. The default-deny example is consistent with Cilium's documented behavior that selecting endpoints with ingress or egress policy sections puts them into default-deny mode for that direction.
