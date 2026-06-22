# Validation Summary: How to Debug OOMKilled Errors in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes pods, resource requests and limits, QoS classes, evictions, HPA, VPA, ResourceQuota, and LimitRange
- kubectl resource and status inspection commands
- Prometheus, PromQL, Prometheus Operator ServiceMonitor and PrometheusRule resources
- kube-state-metrics OOM termination metrics
- Linux cgroups v1 and v2 memory files
- Java HotSpot memory options and Native Memory Tracking
- Node.js V8 memory options
- Python interpreter optimization environment variables

## Sources Consulted
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Prometheus promtool reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Node.js CLI documentation: https://nodejs.org/api/cli.html
- Oracle Java Native Memory Tracking documentation: https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/tooldescr007.html
- Python command line and environment documentation: https://docs.python.org/3/using/cmdline.html

## Issues Found
- The introduction said OOMKilled occurs when a container exceeds its limit or the node runs out of memory. Kubernetes specifically reports OOMKilled when a container is killed after using more memory than its limit; node memory pressure commonly results in pod eviction. Updated the wording to distinguish container OOM kills from node-pressure evictions.
- The exit code table implied exit code 137 always means OOMKilled. Exit code 137 means SIGKILL and is commonly caused by OOM, but the termination reason should be checked. Updated the table to make that distinction.
- The `promtool query instant` example omitted the Prometheus server URL required by promtool. Added `http://localhost:9090` for the in-pod example.
- The cgroup memory inspection commands only covered cgroup v1 paths. Added a cgroup v2 check using `memory.current` and `memory.max`, falling back to the original cgroup v1 files.
- The Java `jcmd 1 VM.native_memory summary` command was shown without noting that Native Memory Tracking must be enabled. Updated the command comment and added `-XX:NativeMemoryTracking=summary` to the debug pod's Java options.
- The Python example used `PYTHONHASHSEED=0` under a memory optimization comment. That setting disables hash randomization rather than optimizing memory. Removed it and softened the optimization comment.
- The QoS section described Guaranteed as highest priority and "won't be evicted first." Kubernetes eviction ordering considers whether usage exceeds requests, Pod Priority, and relative usage, while QoS is only an eviction-risk signal. Updated the comments and conclusion to include Priority and avoid overstating QoS guarantees.

## Review Notes
- `kubectl` and `promtool` were not installed in the local environment, so their command syntax was verified against official documentation rather than local `--help` output.
- The PromQL examples are directionally correct, but production alerts should usually filter out infrastructure containers and handle containers without memory limits to avoid noisy or empty results.
