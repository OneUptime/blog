# Validation Summary: Troubleshooting Protocol, Encoding, Framing and Types in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble CLI
- Cilium CLI and cilium-dbg
- eBPF/BPF map troubleshooting

## Sources Consulted
- Cilium Endpoint Lifecycle: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint status and policy fields: https://docs.cilium.io/en/stable/api/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- CiliumNetworkPolicy language reference: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg endpoint health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble exporter/filter examples: https://docs.cilium.io/en/latest/observability/hubble/configuration/export/
- Cilium CLI status and connectivity test references: https://docs.cilium.io/en/latest/cmdref/cilium_status/ and https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` as if they were current workstation-side Cilium CLI commands. Official Cilium troubleshooting and command references use the agent-side `cilium-dbg` CLI for endpoint and identity inspection, while Kubernetes `CiliumEndpoint` CRDs provide cluster-wide endpoint status. I updated endpoint status and policy examples to use `kubectl get ciliumendpoints` and changed identity and endpoint health examples to run `cilium-dbg` through `kubectl exec`.
- The realized policy JSON paths used `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, which do not match the documented endpoint API shape. I corrected them to `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`.
- The endpoint label query used `.status.labels.id`, which is not the documented CiliumEndpoint label field. I corrected the example to inspect `.status.identity.labels`.
- The troubleshooting note recommended `cilium endpoint regenerate all`, which is not present in the current documented `cilium-dbg endpoint` command set. I replaced it with checking the affected `CiliumEndpoint` and Cilium agent logs for regeneration failures.

## Review Notes
The CiliumNetworkPolicy YAML syntax, Hubble dropped-flow filters, Cilium agent log commands, Hubble relay pod selector, and `cilium connectivity test` usage are consistent with current Cilium documentation. Agent-local `cilium-dbg endpoint health <ENDPOINT_ID>` must be run against the Cilium agent on the node that owns the endpoint ID.
