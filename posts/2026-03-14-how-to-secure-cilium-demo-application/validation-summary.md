# Validation Summary: Securing Demo Application in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Helm
- eBPF networking and policy enforcement

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `cilium config view` and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/
- Cilium `cilium-dbg endpoint list`, `identity list`, and `monitor` command reference: https://docs.cilium.io/en/stable/cmdref/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The post used `cilium endpoint list`, `cilium identity list`, and `cilium monitor` for daemon-level inspection. Current Cilium documentation exposes these as `cilium-dbg endpoint list`, `cilium-dbg identity list`, and `cilium-dbg monitor`, commonly run from a Cilium agent pod. Updated the examples to use `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg ...`.
- The post used `cilium monitor --type drop --output json`, but the documented JSON flag for `cilium-dbg monitor` is `--json`. Updated the command accordingly.
- The policy-enforcement check grepped for `policy-enforcement`; current Cilium documentation describes the corresponding configuration flag as `enable-policy` and the Helm value as `policyEnforcementMode`. Updated the grep to `enable-policy`.
- The Hubble cross-namespace flow command piped pretty-printed multi-line JSON objects into `sort` and `uniq`, which would not count complete flow records reliably. Added `jq -c` so each selected flow is emitted as one compact JSON line before sorting.

## Review Notes
The CiliumNetworkPolicy examples use current `cilium.io/v2` resources and fields consistent with Cilium policy documentation. The default-deny example allows DNS egress while denying other selected ingress and egress traffic, which is consistent with Cilium's per-direction default-deny behavior when policies select endpoints.
