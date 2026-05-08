# Validation Summary: How to Validate Automatic Adjustment in Cilium configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI and cilium-dbg
- CiliumNetworkPolicy
- eBPF
- Prometheus and Grafana
- Helm

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy.html
- Cilium policy language examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The introduction and conclusion described a generic "automatic adjustment" capability as if it were a specific Cilium feature. I changed those claims to describe validating Cilium configuration and runtime behavior, which matches the actual commands in the guide.
- The prerequisites used outdated broad version guidance (`Kubernetes v1.21+` and `Cilium v1.14+`). I changed this to require a Kubernetes version supported by the selected Cilium release and gave the current Cilium 1.19 compatibility range as an example.
- Several examples used agent debug commands through the Kubernetes-focused `cilium` CLI, such as `cilium endpoint list`, `cilium identity list`, and `cilium metrics list`. Current Cilium documentation exposes these as `cilium-dbg` commands, normally run inside a Cilium agent pod, so I updated those examples to use `kubectl exec ds/cilium ... cilium-dbg`.
- The health verification command used `cilium health status`, which is not the documented command. I changed it to run `cilium-health status` inside the Cilium agent pod.
- The Cilium operator selector used `name=cilium-operator`, while current Cilium CLI defaults and docs use `io.cilium/app=operator`. I updated the selector.
- Troubleshooting guidance claimed a Linux kernel version of 4.19 or later was sufficient. Current Cilium 1.19 docs require Linux kernel 5.10 or an equivalent distribution kernel such as 4.18 on RHEL 8.10, so I corrected the guidance.
- Troubleshooting guidance used deprecated or non-current policy and BPF tunnel commands. I replaced them with Kubernetes policy listing commands and `cilium-health status`.

## Review Notes
The CiliumNetworkPolicy YAML syntax, `cilium connectivity test`, `cilium config view`, `cilium status --verbose`, `kubectl run`, `kubectl expose`, and `cilium sysdump --output-filename` examples are consistent with current official documentation. The denied policy test may surface as a timeout or a curl timeout/error depending on the environment, but the expected blocked behavior is correct.
