# Validation Summary: Validating Potential Benefits in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble
- eBPF
- Bash
- jq

## Sources Consulted
- Cilium CiliumNetworkPolicy Kubernetes constructs documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium CLI `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg policy` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy/

## Issues Found
- The example CiliumNetworkPolicy targeted the `production` namespace and labels that were not created by the validation workload setup. Updated the policy to target the `cilium-validate` namespace, select `app=server`, allow ingress from `app=client`, and use port `80` so the later allowed and denied traffic checks validate the example policy.
- The endpoint inspection commands used `cilium endpoint list`, which is now documented under the agent-local `cilium-dbg` CLI rather than the Kubernetes-facing `cilium` CLI listed in the prerequisites. Replaced these checks with `kubectl get ciliumendpoints`, matching Cilium's documented Endpoint CRD.
- The policy count check used `cilium policy get`, which is documented under `cilium-dbg policy get` and marked deprecated. Replaced it with `kubectl get cnp`, using the Kubernetes CRD API.
- The automated Bash script used `((PASS++))` and `((FAIL++))` under `set -e`, which can terminate the script when the previous value is zero. Replaced these with `((PASS+=1))` and `((FAIL+=1))`.
- The cross-namespace Hubble aggregation piped pretty-printed JSON objects into `sort | uniq -c`, which counts lines instead of flow records. Changed the `jq` expression to emit one tab-separated record per flow with `@tsv`.
- The final verification command `cilium endpoint health` was missing the required endpoint ID for the agent-local command. Replaced it with a cluster-wide `kubectl get ciliumendpoints -A` endpoint state check.

## Review Notes
The post assumes the Hubble CLI can reach the Hubble API. The prerequisites were clarified to state that Hubble API access must be configured. In environments without a configured Hubble server, users may need `hubble observe -P` or a separate `cilium hubble port-forward` session.
