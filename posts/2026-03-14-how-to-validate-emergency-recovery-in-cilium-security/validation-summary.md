# Validation Summary: Validating Emergency Recovery in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command cheatsheet and endpoint inspection examples: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The sample policy used a clusterwide allow-all rule, but the validation steps expected an unauthorized pod to be blocked. Changed the example to a namespaced `CiliumNetworkPolicy` that selects the `server` pod and allows ingress only from pods labeled `app=client` on TCP port 80, so the allowed and denied tests match the policy behavior.
- The endpoint policy inspection command used `cilium endpoint list`, which is not part of the current user-facing Cilium CLI and is better represented in Kubernetes environments through the `CiliumEndpoint` CRD. Replaced it with `kubectl get ciliumendpoints ...` and the documented CiliumEndpoint status fields.
- The automated script used `cilium endpoint list` and `cilium policy get`; direct agent policy inspection is deprecated in current Cilium documentation. Updated the script to inspect `CiliumEndpoint` and `CiliumNetworkPolicy` Kubernetes resources instead.
- The Bash script incremented counters with `((PASS++))` and `((FAIL++))` under `set -e`, which can terminate the script when the counter starts at zero. Changed the increments to `((PASS+=1))` and `((FAIL+=1))`.
- The final endpoint health check used `cilium endpoint health`, an agent-side debug command rather than a portable Kubernetes-facing check. Replaced it with `kubectl get ciliumendpoints -n cilium-validate`.

## Review Notes
The Hubble commands are syntactically consistent with documented `hubble observe` usage, but users may need Hubble Relay access or `hubble observe -P` depending on how their cluster exposes the Hubble API.
