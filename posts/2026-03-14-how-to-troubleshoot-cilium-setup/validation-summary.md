# Validation Summary: Troubleshooting Setup Configuration in Cilium

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble CLI
- cilium-dbg CLI
- kubectl

## Sources Consulted
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg endpoint health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium troubleshooting guide for observing flows with Hubble: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium policy troubleshooting guide: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium DNS-based policy examples: https://docs.cilium.io/en/latest/security/dns/
- Cilium API reference for endpoint status and policy fields: https://docs.cilium.io/en/stable/api/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium endpoint health`, and `cilium identity list` for agent-local endpoint and identity inspection. Current Cilium documentation exposes these through `cilium-dbg`, typically run inside a Cilium agent pod, so the commands were updated to use `kubectl exec ... cilium-dbg`.
- The realized policy jq paths used `status.policy.realized."l4-ingress"` and `status.policy.realized."l4-egress"`, but the current API exposes these as `status.policy.realized.l4.ingress` and `status.policy.realized.l4.egress`. The jq example was corrected.
- The endpoint label jq example used `.status.labels.id`, which is not the current endpoint API shape. It was updated to inspect `.status.identity.labels`.
- The kube-dns `toEndpoints.matchLabels` example omitted Cilium's `k8s:` label source prefixes. The selector was updated to use `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`, matching official Cilium examples.
- The verification command `cilium endpoint health` omitted the required endpoint ID argument. It was corrected to `cilium-dbg endpoint health <ENDPOINT_ID>`.
- The troubleshooting note recommended `cilium endpoint regenerate all`, which is not present in the current `cilium-dbg endpoint` command reference. It was replaced with inspection via `cilium-dbg endpoint get <ENDPOINT_ID>` and recreating the affected pod if stale.

## Review Notes
The guide remains broadly accurate for Cilium troubleshooting, but endpoint-level commands are node-local. In multi-node clusters, users should run `cilium-dbg` in the Cilium pod on the node that manages the affected endpoint.
