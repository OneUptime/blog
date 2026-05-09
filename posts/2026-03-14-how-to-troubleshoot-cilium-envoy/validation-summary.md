# Validation Summary: Troubleshooting Envoy Proxy Integration in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Envoy proxy integration in Cilium
- Hubble CLI
- `kubectl`
- `jq`

## Sources Consulted
- Cilium Operations Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Policy Troubleshooting: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Layer 7 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint status and policy fields: https://docs.cilium.io/en/stable/api/
- `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/

## Issues Found
- The post used `cilium endpoint ...` and `cilium identity ...` for agent-local diagnostics. Current Cilium documentation uses `cilium-dbg` inside Cilium agent pods for endpoint, policy, health, and identity introspection. Updated the examples to select a Cilium pod and run `cilium-dbg` through `kubectl exec`.
- The realized policy jq paths used `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, but the documented API fields are `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`. Updated the jq example accordingly.
- The endpoint label jq path used `.status.labels.id`, which does not match the documented endpoint status shape. Updated it to use `.status.identity.labels`.
- The verification command `cilium endpoint health` omitted the required endpoint ID and used the wrong CLI. Updated it to `cilium-dbg endpoint health <ENDPOINT_ID>` through `kubectl exec`.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current `cilium-dbg endpoint` command reference. Replaced it with documented inspection via `cilium-dbg endpoint get` and pod recreation when an endpoint remains stale.
- Tightened the endpoint readiness claim so it does not imply that all policy enforcement necessarily stops whenever an endpoint is not ready.

## Review Notes
The CiliumNetworkPolicy L7 HTTP example matches the documented Cilium policy shape for `endpointSelector`, `ingress`, `fromEndpoints`, `toPorts`, `ports`, `rules.http`, `method`, `path`, and `headers`. Hubble `observe --verdict DROPPED`, namespace filtering, JSON output, and `--last` usage are consistent with Hubble CLI examples and help references.
