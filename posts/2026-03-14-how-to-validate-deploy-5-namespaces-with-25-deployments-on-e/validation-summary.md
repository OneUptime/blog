# Validation Summary: How to Validate Deploy 5 namespaces with 25 deployments on each namespace

## Status
validated

## Post Type
Tutorial / operational validation guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- kubectl
- Cilium CLI and cilium-dbg
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- CiliumNetworkPolicy language reference: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy guide: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg endpoint list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- cilium-dbg endpoint get reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- cilium-dbg identity list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- cilium-dbg metrics list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- cilium-health status reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html

## Issues Found
- The prerequisites listed Kubernetes v1.21+ and Cilium v1.14+ as a generic compatibility baseline. Current Cilium documentation defines supported Kubernetes versions per Cilium release, so this was changed to instruct readers to use a Kubernetes version supported by their installed Cilium release, with Cilium 1.19's documented Kubernetes 1.31-1.34 support as an example.
- Several commands used local `cilium` subcommands for endpoint, identity, metrics, policy, BPF, and health inspection. Current documentation separates the Kubernetes-oriented Cilium CLI from the agent-local `cilium-dbg` and `cilium-health` tools, so those examples were changed to use `kubectl exec ds/cilium -c cilium-agent -- cilium-dbg ...`, `kubectl exec ... -- cilium-health status`, or Kubernetes CRD queries where appropriate.
- Endpoint counting used `cilium endpoint list`, which is agent-local and node-scoped. This was changed to `kubectl get ciliumendpoints --all-namespaces`, which is the documented Kubernetes CRD view for Cilium-managed endpoints across the cluster.
- The operator health check used the label selector `name=cilium-operator`. Cilium documentation and CLI defaults use `io.cilium/app=operator` for operator pods, so the selector was corrected.
- Troubleshooting guidance referenced `cilium policy get`, which is deprecated in current `cilium-dbg` documentation, and `cilium bpf tunnel list`, which is not present in the current command reference. These were replaced with Kubernetes NetworkPolicy/CiliumNetworkPolicy listing and `cilium-health status`.
- The troubleshooting section stated a fixed Linux kernel version requirement of 4.19 or later. Current Cilium system requirements vary by version and, for stable Cilium, document Linux kernel 5.10 or equivalent such as RHEL 8.10's 4.18 kernel, so the text was generalized to require the kernel supported by the deployed Cilium version.

## Review Notes
The CiliumNetworkPolicy YAML structure, `cilium status`, `cilium config view`, `cilium connectivity test --single-node`, `kubectl run`, `kubectl expose pod`, and `cilium sysdump --output-filename` examples are consistent with the referenced documentation. The post title mentions validating five namespaces with twenty-five deployments each, but the body presents a general Cilium validation workflow rather than commands that create that exact workload.
