# Validation Summary: How to Diagnose Provision 2 worker nodes in Cilium performance

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Cilium CLI
- cilium-dbg
- cilium-health
- kubectl
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf lb list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The prerequisites claimed Kubernetes v1.21+ and Cilium v1.14+ as a general requirement. Updated this to say the cluster must be supported by the installed Cilium version, with Cilium 1.19's supported Kubernetes range of v1.31-v1.34 as the current example.
- Several examples used `cilium endpoint`, `cilium identity`, `cilium bpf`, `cilium policy`, `cilium metrics`, and `cilium health` as if they were standalone Cilium Kubernetes CLI commands. Updated these to use `kubectl exec` into a Cilium agent pod with `cilium-dbg` or `cilium-health`, or to use Kubernetes resources such as `CiliumEndpoint` and network policy resources where cluster-wide inspection is more accurate.
- The connection tracking example used `cilium bpf ct list global`, which is not the current documented syntax. Updated it to `cilium-dbg bpf ct list` executed inside a Cilium agent pod.
- The policy inspection examples used `cilium policy get`, which is deprecated in current `cilium-dbg` documentation and was not a correct standalone `cilium` CLI example. Updated policy checks to use `kubectl get ciliumnetworkpolicies,ciliumclusterwidenetworkpolicies,networkpolicies --all-namespaces`.
- The operator health command used the old or non-default selector `name=cilium-operator`. Updated it to the current default Cilium operator selector `io.cilium/app=operator`.
- The troubleshooting section stated that kernel 4.19 or later is sufficient. Updated it to Cilium's current documented baseline of Linux kernel 5.10 or later, or a distribution-supported equivalent such as 4.18 on RHEL 8.10.
- The endpoint count example used `cilium endpoint list -o json`, which is a local agent debug command rather than a cluster-wide standalone CLI command. Updated it to count `CiliumEndpoint` CRD objects through `kubectl`.

## Review Notes
The post is technically relevant and contains actionable Cilium troubleshooting commands. The title and description are awkwardly phrased, but they were left unchanged because the review scope was technical correctness rather than editorial cleanup.
