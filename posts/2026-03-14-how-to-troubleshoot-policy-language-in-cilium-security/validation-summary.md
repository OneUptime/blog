# Validation Summary: Troubleshooting Cilium Policy Language Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium labels and label source terminology: https://docs.cilium.io/en/latest/gettingstarted/terminology/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium API reference for endpoint label fields: https://docs.cilium.io/en/stable/api/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/

## Issues Found
- The policy rejection check filtered for a condition type of `Error`, but current CiliumNetworkPolicy validation status is represented through the `Valid` condition. Changed the `jq` filter to find `type == "Valid"` with `status == "False"`.
- The post used `cilium endpoint list`, `cilium policy trace`, and `cilium policy get`. Current Cilium agent-side command references use `cilium-dbg`, and `policy trace` is not present in the current `cilium-dbg policy` command reference. Replaced these with supported `cilium-dbg endpoint list` and `cilium-dbg endpoint get` examples.
- The endpoint label query returned the broader `.status.labels` object. Changed it to `.status.identity.labels` to show the identity labels used for policy matching.
- The label-prefix explanation implied that users must use `k8s:` in selectors. Cilium documentation says Kubernetes pod labels are displayed with the `k8s:` source prefix, but unprefixed selector labels match any source. Updated the explanation to include that caveat.

## Review Notes
The Hubble examples use documented `hubble observe` filtering patterns. `kubectl apply --dry-run=client` is sufficient for client-side manifest parsing, but `--dry-run=server` can catch more API-schema validation issues in a live cluster.
