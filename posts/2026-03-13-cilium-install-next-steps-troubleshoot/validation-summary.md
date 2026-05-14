# Validation Summary: Troubleshooting Cilium Post-Installation Steps

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- WireGuard and IPsec transparent encryption
- Prometheus metrics
- eBPF datapath troubleshooting

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium encryption command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption/
- Cilium encryption status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium debug monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- Replaced the Hubble port-forward sequence with `hubble status -P`, because current Cilium documentation recommends the Hubble CLI `-P` flag for automatic port-forwarding to Hubble Relay.
- Added `-n policy-namespace` to the CiliumNetworkPolicy delete example, because CiliumNetworkPolicy resources are namespaced and the earlier command only worked for policies in the current namespace.
- Replaced in-pod `cilium monitor` with `cilium-dbg monitor`, matching the current documented debug CLI inside Cilium agents.
- Removed `cilium policy trace`, which is not present in the current Cilium command reference, and replaced it with monitoring `policy-verdict` events.
- Replaced `cilium encrypt status` with `cilium encryption status`, matching the current Cilium CLI command.
- Replaced `cilium connectivity test --test encryption` with `--test pod-to-pod-encryption`, which targets the encryption connectivity scenario more specifically.
- Removed unsupported `cilium encrypt disable` and `cilium encrypt enable --type wireguard` commands. The post now describes disabling encryption via Helm values or the Cilium ConfigMap and shows a Helm re-enable example with `encryption.enabled=true` and `encryption.type=wireguard`.
- Corrected the recovery procedure description from "Full Cilium reset" to a component restart, because `kubectl rollout restart` restarts workloads but does not reset all Cilium policies and state.
- Updated the conclusion to reference `cilium-dbg monitor` instead of the removed `cilium monitor` and unsupported `cilium policy trace` commands.

## Review Notes
The metrics port guidance is technically correct when Cilium agent Prometheus metrics are enabled with the default port 9962. In future revisions, it would be useful to mention that Cilium, Hubble, and operator metrics are enabled independently and are not all exposed by default.
