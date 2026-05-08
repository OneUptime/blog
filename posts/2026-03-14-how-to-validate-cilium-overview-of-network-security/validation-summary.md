# Validation Summary: Validating Network Security Overview in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro.html
- Cilium Layer 3 Policy Examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes Policy Constructs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium overview of network policy and deprecated direct policy import note: https://docs.cilium.io/en/stable/security/policy/

## Issues Found
- The original `CiliumClusterwideNetworkPolicy` allowed traffic from and to the `cluster` entity, so the unauthorized BusyBox pod would still be allowed to reach the server. Replaced it with a namespace-scoped `CiliumNetworkPolicy` that selects `app=server` and only allows ingress from `app=client`.
- The endpoint inspection examples used `cilium endpoint list`, which is agent/debug CLI behavior rather than the current Kubernetes-facing Cilium CLI workflow. Replaced these checks with `kubectl get ciliumendpoints ...` using the CiliumEndpoint CRD.
- The automated script used `cilium policy get`, but direct agent policy inspection/import workflows are deprecated in current Cilium documentation. Replaced it with `kubectl get cnp`.
- The automated script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`, which can terminate Bash when the increment expression evaluates to zero. Replaced those increments with assignment arithmetic.
- The verification section used `cilium endpoint health` without an endpoint ID. Replaced it with a CiliumEndpoint CRD listing for endpoint readiness inspection.
- The Hubble JSON pipeline emitted pretty-printed objects before `sort`, which makes `sort | uniq` operate on individual JSON lines instead of records. Changed the `jq` invocation to compact output with `-c`.
- Removed `-it` from the one-shot unauthorized BusyBox test pod so the command is usable in non-interactive terminal contexts.

## Review Notes
The corrected policy validates an ingress allow-list pattern for the sample server workload. It does not implement a full cluster baseline policy; production baseline policies should be designed separately and tested against cluster-specific kube-system, DNS, health, host, and node requirements.
