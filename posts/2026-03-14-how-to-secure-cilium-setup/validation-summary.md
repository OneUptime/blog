# Validation Summary: Securing Setup Configuration in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble
- Helm
- kubectl
- cilium CLI and cilium-dbg
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy.html
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 4 and DNS policy examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium DNS policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli.html
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg endpoint list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg identity list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- cilium-dbg monitor reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The first CiliumNetworkPolicy was created in the `default` namespace, but the verification command checked `production`. Changed the policy namespace to `production` so the example is internally consistent.
- The default-deny text said no traffic would flow unless explicitly allowed, but the example includes an explicit DNS egress allow rule. Clarified that DNS egress is the exception included in the policy.
- The post used `cilium policy get`, but current Cilium Kubernetes CLI documentation does not expose `policy` as a top-level command. Replaced it with `kubectl get cnp -A` for Kubernetes-distributed CiliumNetworkPolicy resources.
- The post used `cilium identity list`, `cilium endpoint list`, and `cilium monitor`, which are agent-level commands documented under `cilium-dbg`. Updated the examples to run `cilium-dbg` inside the Cilium DaemonSet with `kubectl -n kube-system exec ds/cilium -- ...`.
- The troubleshooting label check used the obsolete `cilium endpoint list` form. Replaced it with a Kubernetes CiliumEndpoint query using `kubectl get ciliumendpoints -n production -o json`.

## Review Notes
- The CiliumNetworkPolicy YAML uses the current `cilium.io/v2` API and valid fields for Cilium policy resources.
- `protocol: ANY` on DNS port 53 is used in official Cilium DNS policy examples and is valid.
- `policyEnforcementMode=always` is a current Cilium Helm value, with valid modes `default`, `always`, and `never`.
- Hubble `observe --verdict DROPPED`, namespace filtering, JSON output, compact output, and `--last` usage are consistent with Hubble CLI documentation and examples.
