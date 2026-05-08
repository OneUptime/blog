# Validation Summary: How to Prevent Deploy 5 namespaces with 25 deployments on each namespace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus Operator
- Prometheus metrics
- eBPF

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium monitoring and metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium debug endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The prerequisites used a fixed Kubernetes version floor of v1.21+ with Cilium v1.14+. Current Cilium documentation treats Kubernetes compatibility as version-specific, so this was changed to require a Kubernetes version supported by the deployed Cilium release.
- The Helm label-exclusion snippet used an invalid nested `labels.exclude` structure and `k8s:`-prefixed keys. Cilium expects the `labels` Helm value as a space-separated label pattern string, using exclusions such as `!pod-template-hash !controller-revision-hash !job-name`.
- The label configuration example did not restart Cilium components after changing identity-relevant labels. The Cilium documentation notes that agents, and operators when they manage identities, must be restarted to pick up label-pattern changes, so rollout restart commands were added.
- Several examples used the Kubernetes-facing `cilium` CLI for agent-local commands such as metrics, identity, endpoint, policy, BPF tunnel, and health inspection. These were changed to run `cilium-dbg` or `cilium-health` through `kubectl exec ds/cilium`, matching the current Cilium command split.
- The troubleshooting section used a blanket Linux kernel requirement of 4.19+. Current Cilium system requirements are release-specific, so this was changed to require a node kernel that meets the system requirements for the deployed Cilium release.

## Review Notes
- The PrometheusRule structure is valid for the Prometheus Operator `monitoring.coreos.com/v1` API, assuming the Prometheus Operator CRDs are installed and the Prometheus instance selects rules in the chosen namespace.
- The example alert thresholds are operational examples, not universal Cilium limits. They should be tuned to the cluster's normal identity count and workload size.
