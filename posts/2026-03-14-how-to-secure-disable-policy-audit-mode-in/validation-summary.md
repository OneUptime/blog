# Validation Summary: Securing Policy Audit Mode Disabling in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Cilium policy audit mode
- Hubble
- Helm

## Sources Consulted
- Cilium Creating Policies from Verdicts: https://docs.cilium.io/en/stable/security/policy-creation/
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Layer 3 policy examples: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 4 policy examples: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The first policy was declared as a `CiliumClusterwideNetworkPolicy` but the surrounding text and verification command used namespace-scoped `CiliumNetworkPolicy` behavior. I changed it to `kind: CiliumNetworkPolicy` and added `namespace: production` so `kubectl get cnp -n production` matches the resource.
- The policy included `policy.cilium.io/audit-mode: "false"`, which is not the documented way to disable Cilium Policy Audit Mode. I removed the annotation and added documented audit-mode disable examples using Helm `policyAuditMode=false` and the `cilium-config` `policy-audit-mode=false` key with a DaemonSet restart.
- The default-deny example used `ingress: []`, but Cilium documents empty or omitted ingress rules as not applying at ingress. I changed it to `ingress: - {}` so it actually selects endpoints for ingress default-deny behavior.
- Several examples used local Cilium agent inspection commands as top-level `cilium` CLI commands, including endpoint listing, identity listing, and monitor output. I changed those examples to execute `cilium-dbg` inside the Cilium agent pod, matching the current command references.
- The post checked policy enforcement with `grep policy-enforcement`, but Cilium documents the enforcement setting as Helm `policyEnforcementMode` and agent flag/config key `enable-policy`. I updated the checks to grep `enable-policy`.
- The `cilium monitor --type drop --output json` example used a non-documented JSON flag for the current `cilium-dbg monitor` command. I changed it to `cilium-dbg monitor --type drop --json`.

## Review Notes
The YAML examples are structurally valid for Cilium v2 policy resources after the corrections. The post still uses broad selectors such as `endpointSelector: {}`, which is technically valid but should be scoped carefully in production to avoid disrupting unrelated workloads.
