# Validation Summary: How to Validate Valid duration values in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- CiliumNetworkPolicy
- eBPF
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium endpoint command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Go `time.ParseDuration` documentation: https://pkg.go.dev/time#ParseDuration

## Issues Found
- The prerequisites used fixed Kubernetes and Cilium minimum versions that are not generally correct for current Cilium releases. Changed the prerequisite to require a Kubernetes cluster supported by the installed Cilium version.
- Several examples used `cilium endpoint`, `cilium identity`, `cilium metrics`, `cilium policy`, `cilium bpf`, and `cilium health` as if they were current Kubernetes Cilium CLI commands. Current Cilium documentation exposes these node-local diagnostics through `cilium-dbg` or `cilium-health` inside Cilium pods, or through Kubernetes CRDs. Updated those examples to use `kubectl get ciliumendpoints`, `kubectl get ciliumnetworkpolicies`, and `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...` where appropriate.
- The troubleshooting section stated that kernel 4.19 or later is sufficient. Current Cilium system requirements document Linux kernel 5.10 or later, or an equivalent distribution kernel such as 4.18 on RHEL 8.10. Updated the wording to refer to the requirements for the installed Cilium release and included the current baseline.
- The endpoint count verification used `cilium endpoint list -o json`, which is not a current Kubernetes Cilium CLI command. Updated it to count `CiliumEndpoint` CRD items from `kubectl get ciliumendpoints --all-namespaces -o json`.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically consistent with the documented `cilium.io/v2` policy schema. The post title and introduction emphasize duration values, but the body mostly validates Cilium deployment health and policy behavior rather than showing concrete duration configuration examples. This is a scope/content issue rather than a command correctness issue.
