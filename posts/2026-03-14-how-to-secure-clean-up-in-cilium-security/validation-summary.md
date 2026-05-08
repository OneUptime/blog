# Validation Summary: Securing Clean-Up Procedures in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Helm
- Hubble
- eBPF

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium policy language and L3/L4 examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium config` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Hubble CLI flow observation guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The post used `cilium policy get`, `cilium identity list`, and `cilium endpoint list` for policy and daemon-local introspection. Replaced the policy listing with `kubectl get ciliumnetworkpolicies.cilium.io --all-namespaces`, and updated daemon-local identity and endpoint examples to run `cilium-dbg identity list` and `cilium-dbg endpoint list` through `kubectl -n kube-system exec ds/cilium -c cilium-agent -- ...`.
- The post used `cilium monitor --type drop --output json`. Current Cilium documentation exposes datapath monitor events through `cilium-dbg monitor`, and JSON output is enabled with `--json` rather than `--output json`. Updated the command to `cilium-dbg monitor --type drop --json` through `kubectl exec`.
- The troubleshooting command for checking endpoint labels used the same incorrect `cilium endpoint list` form. Updated it to use `cilium-dbg endpoint list -o json` through `kubectl exec`.

## Review Notes
The CiliumNetworkPolicy examples use the current `cilium.io/v2` API and valid policy fields. The default-deny example includes an explicit DNS egress allowance, which is consistent with common Cilium policy examples. The Helm value `policyEnforcementMode=always`, Hubble dropped-flow filtering, `cilium status`, `cilium config view`, and `cilium connectivity test` commands are consistent with current Cilium documentation.
