# Validation Summary: Validating Setup Configuration in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint CRDs
- Hubble CLI
- Bash
- jq

## Sources Consulted
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium policy enforcement documentation: https://docs.cilium.io/en/stable/security/network/policyenforcement/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- cilium-dbg policy get command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get/

## Issues Found
- The sample CiliumNetworkPolicy was created in the `default` namespace while the walkthrough creates workloads in `cilium-validate`. Changed the policy namespace to `cilium-validate` so it applies to the test workload.
- The sample policy only allowed health traffic and DNS egress, so the documented `client` to `server` request would not be allowed by that policy. Changed the policy to select `app=server` and allow ingress from `app=client` on TCP port 80, matching the allowed and unauthorized traffic tests.
- The endpoint inspection examples used `cilium endpoint list`, which is an agent-local debug style workflow and does not match the Kubernetes CRD-based validation path recommended for CiliumNetworkPolicy in Kubernetes. Replaced it with `kubectl get ciliumendpoints.cilium.io -A -o json` and jq inspection of `.items[]`.
- The validation script used `((PASS++))` and `((FAIL++))` with `set -euo pipefail`. In Bash, post-increment can return a failure status when the previous value is zero, causing premature script exit. Replaced those increments with `((PASS+=1))` and `((FAIL+=1))`.
- The validation script used `cilium policy get -o json`, but the referenced command is `cilium-dbg policy get` and is documented as deprecated for node-local policy information. Replaced it with `kubectl get ciliumnetworkpolicies.cilium.io -A -o json | jq '.items | length'`.
- The final endpoint health check used `cilium endpoint health` without an endpoint ID. The documented endpoint health command expects a specific endpoint ID. Replaced the broad check with `kubectl get ciliumendpoints.cilium.io -A`.
- The one-shot unauthorized `kubectl run` example used `-t`, which can fail in non-interactive validation environments without a TTY. Changed it to `-i`.

## Review Notes
The post is technically relevant and the remaining Cilium and Hubble commands are consistent with official documentation. The `cilium connectivity test` command creates its own test resources by default, so it should be treated as a broader installation validation step rather than a direct test of the custom `cilium-validate` namespace.
