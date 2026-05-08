# Validation Summary: Validating Go Extensions in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Bash
- jq

## Sources Consulted
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium command cheatsheet for endpoint and policy inspection: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/

## Issues Found
- The sample CiliumNetworkPolicy targeted the `production` namespace, `app: custom-protocol-server`, `app: protocol-client`, and TCP port `9999`, while the test workloads in the guide are in `cilium-validate` with `app=server`, `app=client`, and port `80`. Updated the policy so the later allowed and unauthorized traffic tests exercise the policy being shown.
- The endpoint inspection examples used `cilium endpoint list`, which is daemon-side/debug CLI behavior rather than the local Kubernetes workflow used by the post. Replaced those examples with `kubectl get ciliumendpoints ...`, matching Cilium's documented Kubernetes CRD inspection path.
- The policy count example used `cilium policy get -o json` in a local validation script. Replaced it with `kubectl get cnp -n "$NAMESPACE" -o json`, which matches Cilium's documented Kubernetes resource inspection approach.
- The Bash script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, post-increment returns a failing status when the previous value is zero, so the script could exit after its first successful increment. Changed the counters to pre-increment form.
- The cross-namespace Hubble JSON pipeline emitted pretty-printed objects before `sort` and `uniq`, which makes line-oriented aggregation unreliable. Changed the `jq` invocation to compact output with `-c`.
- The verification section used `cilium endpoint health` without an endpoint ID, but the documented command requires an endpoint ID. Replaced it with CiliumEndpoint CRD state and health inspection for the validation namespace.
- The prerequisites mentioned Hubble CLI availability but did not state that Hubble must be enabled and reachable. Updated the prerequisite to match the Hubble CLI documentation.

## Review Notes
The guide is technically relevant and includes runnable Kubernetes, Cilium, Hubble, Bash, and jq examples. It still assumes the reader knows how to save and apply the displayed CiliumNetworkPolicy YAML before running the verification commands.
