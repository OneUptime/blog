# Validation Summary: Cilium Core Concepts: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- Cilium identities and endpoints
- Hubble
- Prometheus metrics

## Sources Consulted
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium operations troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- Replaced "cryptographic identities" with "security identities" because Cilium's label-derived identities are documented as security identities, not cryptographic identities.
- Updated in-pod debug commands from `cilium` to `cilium-dbg`, matching current Cilium documentation for interacting with the local Cilium agent.
- Changed the sample CiliumNetworkPolicy port from `8080` to `80` so it matches the nginx backend used in the validation example.
- Replaced `cilium identity get <identity-id>` with `kubectl describe ciliumidentity <identity-id>` because the current documented `cilium-dbg identity get` command does not take an identity ID positional argument.
- Replaced the unsupported `cilium policy trace` example with an endpoint realized-policy inspection command using `cilium-dbg endpoint get`.
- Replaced node-local policy dump guidance and grepping endpoint table output with Kubernetes policy listing plus a JSONPath query against endpoint policy status.
- Fixed the `jq` expression for CiliumIdentity labels by quoting the hyphenated `security-labels` field.
- Fixed the test pod commands so the client pods use a curl-capable image, run long enough for `kubectl exec`, and expose the nginx backend through a Service.
- Replaced brittle endpoint status column parsing with `cilium-dbg endpoint list -o json` and `jq` over `.status.state`.
- Corrected the Prometheus identity metrics example to port-forward a Cilium agent metrics endpoint on port 9962 instead of the operator metrics service.
- Corrected the listed metric names from `cilium_endpoint_count`, `cilium_policy_count`, and `cilium_identity_count` to `cilium_endpoint`, `cilium_policy`, and `cilium_identity`.

## Review Notes
The guide is version-neutral. Commands were validated against current Cilium stable documentation available on 2026-05-14.
