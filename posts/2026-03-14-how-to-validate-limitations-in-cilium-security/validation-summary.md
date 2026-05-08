# Validation Summary: Validating Cilium Security Policy Limitations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble CLI
- Cilium CLI connectivity tests
- kubectl
- jq

## Sources Consulted
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium network policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy.html
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium CLI connectivity test source for dns-only and to-fqdns test names: https://github.com/cilium/cilium/tree/main/cilium-cli/connectivity/builder
- Hubble observe command help/source: https://github.com/cilium/cilium/tree/main/hubble/cmd

## Issues Found
- The post described "policy simulation" as part of the validation strategy, but the examples use connectivity tests, flow observation, and policy state inspection. Changed this to "policy state inspection" to match the actual tooling shown.
- `cilium connectivity test --namespace cilium-validation` used the wrong flag for test workloads. In current Cilium CLI, `--namespace` is the Cilium installation namespace, while `--test-namespace` controls the connectivity test namespace. Updated connectivity test examples to use `--test-namespace`.
- The Hubble monitoring command did not follow live flows despite saying "Monitor all flows." Added `--follow`.
- BusyBox `wget` examples used `--timeout`; BusyBox documents the short `-T` timeout flag. Updated both validation commands to use `wget -T`.
- The unauthorized test pod used interactive flags and would return a nonzero exit when policy enforcement worked. Replaced `-it` with `--attach` and added `|| true` so the example is usable in noninteractive validation.
- The CI example used `cilium endpoint list` and an invalid JSON path `.status.policy.realized."l4-ingress"`. Replaced this with `kubectl get ciliumendpoints` and the documented `.status.policy.realized.l4.ingress` path.
- The dropped-flow count used `jq '[.flow] | length'`, which counts each newline-delimited Hubble JSON object separately rather than producing one total. Changed it to slurp mode with `jq -s`.
- The cross-namespace Hubble aggregation emitted pretty-printed JSON before `sort | uniq -c`, which counts lines instead of complete flow records. Added `jq -c`.
- The final verification used `cilium endpoint list` and `cilium policy get` as if they were external Cilium CLI commands. Replaced them with `kubectl get ciliumendpoints` checks using documented CiliumEndpoint status fields.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically correct for the documented `cilium.io/v2` API and uses valid `endpointSelector`, `fromEndpoints`, and `toPorts.ports` fields. The connectivity test suite validates Cilium installation behavior and built-in scenarios; validating a custom policy still requires workload-specific allow and deny traffic checks like the Hubble section demonstrates.
