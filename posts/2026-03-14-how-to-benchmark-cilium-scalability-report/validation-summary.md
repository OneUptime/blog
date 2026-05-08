# Validation Summary: How to Benchmark Cilium Scalability report

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Helm
- Prometheus metrics
- eBPF

## Sources Consulted
- Cilium command reference for `cilium-dbg endpoint list/get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium connectivity test --single-node`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium command reference for `cilium sysdump --output-filename`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CiliumIdentity/operator documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium CiliumNetworkPolicy examples and L3/L4 policy syntax: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/

## Issues Found
- The post used external `cilium` CLI commands such as `cilium identity list`, `cilium endpoint list`, and `cilium metrics list`. Current Cilium documentation exposes these agent-local operations through `cilium-dbg`, usually executed inside a Cilium agent pod. I changed cluster-wide identity and endpoint counts to use `kubectl get ciliumidentities` and `kubectl get ciliumendpoints --all-namespaces`, and changed metrics collection to run `cilium-dbg metrics list` through `kubectl exec`.
- The network policy benchmark generated the same `metadata.name` for every policy, so each loop iteration in a namespace would update the previous policy instead of creating multiple policies. I changed the manifest and `sed` command to generate unique policy names and target/source selectors.
- The policy benchmark only replaced `bench-1`, leaving source selectors static and producing a self-referential selector for one iteration. I added separate `TARGET` and `SOURCE` placeholders so each generated policy has an explicit target and source.
- The post used deprecated or unavailable troubleshooting commands, including `cilium policy get`, `cilium bpf tunnel list`, `cilium health status`, and `cilium config view`. I replaced them with current alternatives using `kubectl get cnp`, `cilium-dbg endpoint get`, `cilium-health status`, `cilium-dbg config get`, or the Cilium ConfigMap.
- The troubleshooting section stated a fixed Linux kernel minimum of 4.19. Current Cilium system requirements specify newer or distribution-equivalent kernels, so I changed the wording to refer to Cilium's current Linux kernel requirements.
- The post referenced a `cilium-init` init container for logs. Current Cilium pods use different container names depending on chart settings, so I changed the command to collect logs from all containers in the pod.
- The metrics grep pattern included outdated names such as `policy_regeneration` and `process_resident_memory`. I updated the examples to use documented current Cilium metrics such as `policy_implementation_delay`, `policy_change_total`, `endpoint_regenerations_total`, `endpoint_regeneration_time_stats_seconds`, `identity`, and `bpf_map_pressure`.

## Review Notes
The guide is technically relevant and useful after correction. The benchmark remains a lightweight smoke-style scalability exercise rather than a full reproducible Cilium scalability benchmark; future improvements could define expected measurements, wait conditions, Prometheus queries, and test cluster sizing.
