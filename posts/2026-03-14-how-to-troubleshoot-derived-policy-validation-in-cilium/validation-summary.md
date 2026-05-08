# Validation Summary: Troubleshooting Derived Policy Validation in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble
- eBPF policy maps

## Sources Consulted
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium operations troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium API reference for endpoint policy fields: https://docs.cilium.io/en/stable/api.html
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg policy` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy/
- Cilium `cilium-dbg policy wait` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_wait.html
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium policy enforcement documentation: https://docs.cilium.io/en/latest/security/policy/intro/

## Issues Found
- The post used `cilium endpoint get` for agent-local endpoint inspection. Current Cilium documentation uses `cilium-dbg endpoint get`, so the endpoint inspection commands were updated.
- The post referenced `.status.policy.spec.policy-map-state`, which is not the documented endpoint API shape. I replaced it with the documented `status.policy.realized.l4.*[].derived-from-rules` flow for identifying source policy rules.
- The post used `cilium policy trace`, but the current documented `cilium-dbg policy` subcommands are `get`, `selectors`, `subject-selectors`, and `wait`; `policy trace` is not present. I changed the examples to inspect selector-to-identity mappings and verify live traffic with Hubble.
- The post suggested `cilium endpoint config <endpoint-id> ConntrackLocal=Enabled` to trigger regeneration. This option and usage are not documented as a valid policy recalculation workflow. I replaced it with `cilium-dbg policy wait <policy-revision>` and kept agent restart as the last-resort recovery action.
- The Hubble verification command used `--to-endpoint`, which is not used in the official Hubble examples. I replaced it with the documented pod filter style, `hubble observe --pod <pod-name> --last 10`.
- The prerequisites only mentioned the Cilium CLI, but the corrected workflow uses Hubble and `cilium-dbg`. I updated the prerequisite line to reflect the required tools.

## Review Notes
The high-level explanation that matching allow policies are additive is consistent with Cilium's policy enforcement documentation. The guide remains version-sensitive because Cilium has changed CLI tooling over time; examples now align with the current documented `cilium-dbg` troubleshooting workflow.
