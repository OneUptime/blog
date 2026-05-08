# Validation Summary: Validating Policy Audit Mode Disabling in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble CLI
- Cilium CLI
- Bash
- jq

## Sources Consulted
- Cilium documentation: Creating Policies from Verdicts / Policy Audit Mode, https://docs.cilium.io/en/stable/security/policy-creation/
- Cilium documentation: Network Policy, https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium documentation: Layer 3 Policies, https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium documentation: Layer 3 Examples and endpoint selectors, https://docs.cilium.io/en/stable/security/policy/language/
- Cilium documentation: Policy Enforcement Modes, https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium documentation: Endpoint CRD, https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command reference: cilium status, https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium command reference: cilium config view, https://docs.cilium.io/en/stable/cmdref/cilium_config_view/
- Hubble documentation: Inspecting Network Flows with the CLI, https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The policy example used `policy.cilium.io/audit-mode: "false"`, but Cilium policy audit mode is configured at the daemon level or per endpoint, not through a CiliumNetworkPolicy annotation. Replaced it with the documented ConfigMap patch and DaemonSet rollout for disabling daemon-level audit mode.
- The example used a `CiliumClusterwideNetworkPolicy` with `fromEntities: cluster`, which would allow the unauthorized test pod because it is also in the cluster. Replaced it with a namespaced `CiliumNetworkPolicy` selecting the `server` pod and allowing ingress only from pods labeled `app=client` on TCP port 80.
- Several examples used agent-local commands such as `cilium endpoint list`, `cilium policy get`, `cilium identity list`, and `cilium endpoint health` as if they were available from the Kubernetes-facing Cilium CLI. Replaced them with Kubernetes CRD queries using `kubectl get ciliumendpoints`, `kubectl get cnp`, and `kubectl get ciliumidentities`.
- The Bash validation script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, post-increment can return status 1 when the previous value is 0, causing premature exit. Replaced these increments with `((PASS+=1))` and `((FAIL+=1))`.

## Review Notes
The post is technically relevant and now reflects the documented Cilium audit-mode workflow and policy behavior. Local verification with `kubectl`, `cilium`, and `hubble` was not possible because those CLIs are not installed in this workspace, so command validation was performed against official documentation.
