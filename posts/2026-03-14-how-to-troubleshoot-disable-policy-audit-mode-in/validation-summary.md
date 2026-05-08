# Validation Summary: Troubleshooting Policy Audit Mode Disabling in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Cilium CLI and cilium-dbg
- Hubble CLI
- jq

## Sources Consulted
- Cilium documentation: Creating Policies from Verdicts, including enabling and disabling Policy Audit Mode: https://docs.cilium.io/en/stable/security/policy-creation/
- Cilium documentation: Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium documentation: CiliumEndpoint CRD: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command reference: cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference: cilium-dbg endpoint get: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference: cilium-dbg endpoint config: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_config/
- Cilium command reference: cilium-dbg identity list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium documentation: Layer 4 Policies and PortProtocol values: https://docs.cilium.io/en/stable/security/policy/layer4.html
- Cilium documentation: Inspecting Network Flows with Hubble CLI: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html

## Issues Found
- The post used a non-documented `policy.cilium.io/audit-mode: "false"` policy annotation. Cilium documents Policy Audit Mode as a daemon option via `policy-audit-mode` or as an endpoint option changed with `cilium-dbg endpoint config`, so the annotation was removed and replaced with documented disable commands.
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` as if they were cluster-management CLI commands. Current Cilium documentation exposes these endpoint and identity inspection commands through `cilium-dbg`, and CiliumEndpoint CRDs can be queried cluster-wide with `kubectl`, so the examples were corrected.
- The troubleshooting note suggested `cilium endpoint regenerate all`, which is not present in the current documented command reference. It was replaced with guidance to inspect regeneration failures and restart the affected Cilium agent only if needed.

## Review Notes
- The Cilium CLI and Hubble CLI were not installed in the local environment, so command verification was performed against official Cilium documentation rather than local `--help` output.
- `protocol: ANY` in the Cilium policy example is valid according to the Cilium Layer 4 policy documentation, where an empty protocol or `ANY` matches any accepted transport protocol.
