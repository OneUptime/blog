# Validation Summary: Troubleshooting Clean-Up Procedures in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium CLI
- cilium-dbg
- Hubble CLI
- Kubernetes
- CiliumNetworkPolicy
- jq

## Sources Consulted
- Cilium command reference for `cilium` and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium/ and https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium command reference for `cilium-dbg endpoint list`, `get`, and `health`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium policy language documentation for `CiliumNetworkPolicy`, `endpointSelector`, `fromEndpoints`, and `toPorts`: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble exporter documentation showing JSON flow fields: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` as if they were Cilium CLI commands. Current official Cilium documentation exposes endpoint and identity inspection through `cilium-dbg`, typically run inside a Cilium agent pod. Updated the examples to run `cilium-dbg` with `kubectl exec` against a selected Cilium agent pod.
- The realized policy jq path used `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, but Cilium documents realized L4 policy under `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`. Updated the jq expression.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current documented `cilium` or `cilium-dbg` command references. Replaced it with inspecting the endpoint through `cilium-dbg endpoint get` and recreating the affected workload pod if the endpoint remains stale.
- The verification command `cilium endpoint health` was missing the required endpoint ID and used the wrong CLI. Updated it to `cilium-dbg endpoint health <ENDPOINT_ID>` from the relevant agent pod.

## Review Notes
The CiliumNetworkPolicy example, Hubble `observe` filters, Hubble JSON field usage, Kubernetes pod/log commands, and `cilium connectivity test` usage are consistent with the consulted documentation. The endpoint commands inspect state local to the selected Cilium agent pod, so users should choose the Cilium pod running on the node that hosts the endpoint they are troubleshooting.
