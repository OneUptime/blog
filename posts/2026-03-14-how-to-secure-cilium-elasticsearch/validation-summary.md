# Validation Summary: Securing Elasticsearch Integration in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Elasticsearch
- Helm
- eBPF networking and policy enforcement

## Sources Consulted
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 HTTP policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Securing Elasticsearch guide: https://docs.cilium.io/en/stable/security/elasticsearch/
- Cilium Helm values reference for `policyEnforcementMode`: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `status`, `config view`, and `connectivity test`: https://docs.cilium.io/en/stable/cmdref/
- Cilium debug CLI command reference for `cilium-dbg endpoint`, `policy`, `identity`, and `monitor`: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting and Hubble observation documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The policy example created the `elasticsearch-access` CiliumNetworkPolicy in the `logging` namespace, but the verification command checked `production`. Changed the command to `kubectl get cnp -n logging`.
- The default-deny policy used the `production` namespace while the Elasticsearch policy used `logging`. Changed the default-deny policy namespace to `logging` for consistency.
- Hubble troubleshooting commands filtered drops in `production`, which did not match the policy namespace used in the examples. Changed them to `logging`.
- Several current Cilium introspection commands were shown as `cilium endpoint list`, `cilium policy get`, `cilium identity list`, and `cilium monitor`. Current Cilium documentation exposes these agent-level commands as `cilium-dbg` commands run inside a Cilium pod. Updated the examples to use `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg ...`.
- The monitor example used `--output json`, but current `cilium-dbg monitor` uses `--json` / `-j`. Updated the command accordingly.
- The cross-namespace Hubble JSON pipeline used pretty-printed `jq` output before `sort | uniq -c`, which would make aggregation unreliable. Changed it to `jq -c` so each flow summary is emitted on one line.

## Review Notes
The CiliumNetworkPolicy API version, L3/L4 selector structure, HTTP L7 rule structure, `policyEnforcementMode=always` Helm value, Hubble usage, and the note that L7 policy routes traffic through Envoy are consistent with current Cilium documentation. The post remains a general hardening guide rather than a complete production policy set; future improvements could call out that CiliumNetworkPolicy endpoint selectors are namespace-scoped unless namespace labels are included for cross-namespace matching.
