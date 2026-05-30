# Validation Summary: How to Troubleshoot OOMKilled Pods on AKS and Configure Proper Memory Limits

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes pods, containers, memory requests, memory limits, OOMKilled status, node OOM behavior, and LimitRange
- kubectl
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Azure Monitor Container insights and KQL
- Java JVM container memory options
- Python cachetools

## Sources Consulted
- Kubernetes documentation: Assign Memory Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes documentation: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: kubectl top - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes documentation: Configure Default Memory Requests and Limits for a Namespace - https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/
- Kubernetes API reference: LimitRange - https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Azure Monitor documentation: Analyze the health and status of your Kubernetes cluster with Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-analyze
- Azure Monitor documentation: Log search alerts from Container insights - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-log-alerts
- Oracle Java documentation: The JAVA_TOOL_OPTIONS Environment Variable - https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/envvars002.html
- Oracle Java documentation: The java command, -XX:-UseContainerSupport - https://docs.oracle.com/en/java/javase/11/tools/java.html

## Issues Found
- The PromQL examples used `//` comments, but PromQL comments use `#`. Changed the Prometheus query comments to `#` so the examples can be pasted into Prometheus tooling.
- The memory-usage percentage query matched memory usage to limits only on `pod` and `container`. Added `namespace` to the vector matching to avoid incorrect matches when pod and container names repeat across namespaces.
- The memory-usage percentage query and alert did not filter out zero memory limits. Added a `> 0` filter on `container_spec_memory_limit_bytes` so containers without memory limits do not produce misleading infinite ratios.
- The Java manifest used `JAVA_OPTS`, which is not a standard JVM-recognized environment variable and only works when a container entrypoint explicitly consumes it. Changed it to `JAVA_TOOL_OPTIONS`, which is a documented JVM mechanism for adding options.

## Review Notes
- `kubectl` was not installed in the local environment, so kubectl behavior was verified against official Kubernetes generated command documentation rather than local CLI help.
- The memory request and limit sizing formulas are reasonable operational heuristics, not Kubernetes rules.
- The Azure Monitor `Perf` table query is valid for Container insights Log Analytics data, but Microsoft notes that `Perf` queries depend on performance data collection remaining enabled.
