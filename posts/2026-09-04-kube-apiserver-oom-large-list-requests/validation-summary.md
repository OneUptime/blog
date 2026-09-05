# Validation Summary: kube-apiserver Is OOMKilled During Large LIST Requests: Measure Watch-Cache and Serialization Memory

## Status

validated

## Post Type

Technical troubleshooting and capacity-planning guide, containing diagnostic shell commands, PromQL queries, and Kubernetes API implementation guidance.

## Technologies Covered

- Kubernetes kube-apiserver, static Pods, watch cache, and etcd
- LIST pagination, streaming collection encoding, WatchList, and client-go
- Kubernetes audit logging and API Priority and Fairness
- Prometheus metrics and PromQL
- CRI tooling (`crictl`), systemd journal, and Linux memory limits
- Go heap profiling and `go tool pprof`
- JSON, Kubernetes Protobuf, metadata-only responses, and gzip

## Sources Consulted

- [Kubernetes API concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/) — pagination, continuation tokens, initial watch events, encodings, and metadata-only representations.
- [Kubernetes metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/) — request and response-size metric types, stability, and labels.
- [Kubernetes v1.36 watch-cache metric definitions](https://github.com/kubernetes/apiserver/blob/v0.36.0/pkg/storage/cacher/metrics/metrics.go) — fetched and returned object counters and their alpha status.
- [Kubernetes v1.36 watch-cache implementation](https://github.com/kubernetes/apiserver/blob/v0.36.0/pkg/storage/cacher/watch_cache.go) — indexed object storage and retained event history.
- [Kubernetes v1.33 streaming LIST responses](https://kubernetes.io/blog/2025/05/09/kubernetes-v1-33-streaming-list-responses/) — response-buffer retention, slow clients, concurrency, and incremental encoding.
- [Enhancing API Server Efficiency with API Streaming](https://kubernetes.io/blog/2024/12/17/kube-apiserver-api-streaming/) — initial-state streaming and memory motivation.
- [Kubernetes v1.34 feature gates](https://v1-34.docs.kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) and [current feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) — encoding graduation and WatchList defaults.
- [client-go v0.35 feature definitions](https://github.com/kubernetes/client-go/blob/v0.35.0/features/known_features.go) and [versioning guidance](https://github.com/kubernetes/client-go/blob/v0.35.0/README.md) — WatchListClient defaults and module version numbering.
- [Kubernetes auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) and [audit event schema](https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/) — metadata-level fields and absence of response byte counts.
- [Custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) — distinction between definitions and instances.
- [API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/) — concurrency isolation, queues, and HTTP 429 responses.
- [Debugging with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/), [container command implementation](https://github.com/kubernetes-sigs/cri-tools/blob/master/cmd/crictl/container.go), and [logs command implementation](https://github.com/kubernetes-sigs/cri-tools/blob/master/cmd/crictl/logs.go) — container selection, inspection, and tail flags.
- [systemd journalctl manual source](https://github.com/systemd/systemd/blob/main/man/journalctl.xml) and [time syntax](https://github.com/systemd/systemd/blob/main/man/systemd.time.xml) — unit/kernel filters and relative timestamps.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — rate and classic-histogram quantile aggregation.
- [kube-apiserver flags](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/) — watch-cache and profiling options.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — memory limits and OOM behavior.
- [Go HTTP profiling](https://pkg.go.dev/net/http/pprof) and [runtime profiling](https://pkg.go.dev/runtime/pprof) — heap endpoint, sampled allocation stacks, and in-use memory analysis.

## Issues Found

1. **Response-byte attribution to user agents:** The post instructed readers to rank response volume by user agent without explaining that neither the response-size metric nor metadata audit records provide that combination. Changed this to rank bytes by resource dimensions and correlate resource/time windows with audit callers. Explicitly stated the telemetry limitations.
2. **Custom resources versus CRDs:** The large-object example referred to LISTs of CRDs when discussing application `.spec` and `.status` payloads. Changed it to custom resource instances, which are distinct from the definitions that register their API.
3. **client-go version numbering:** Changed `client-go v1.35` to `v0.35`, with its corresponding Kubernetes v1.35 version. The beta WatchListClient default-enabled claim is correct for that release.
4. **Heap-profile interpretation:** The original description implied that a heap profile reports cached object types and reveals retention directly. Changed it to sampled allocation call stacks and in-use bytes, and clarified that baseline/spike comparisons provide evidence rather than a direct retention graph.
5. **Inevitable failure after a limit increase:** The post claimed that raising the limit without bounding concurrency only increases the eventual failure size. That is too absolute: adequate capacity can accommodate a bounded workload. Changed it to the supported risk that increasing request load can cause another OOM.

## Review Notes

- Both PromQL expressions use valid metric labels and the correct rate-before-aggregation pattern. The histogram query retains `le`, as required for classic histograms. Quantiles are bucket-based estimates; very large responses beyond the highest finite bucket cannot be measured precisely by this p99 query.
- Verified the shell flags against official documentation and command source. `<container-id>` is a placeholder that must be replaced with the affected container ID. Commands require the node's CRI configuration, permissions, and retained logs. They were not executed against a Kubernetes cluster.
- Confirmed stable JSON and Protobuf streaming collection encoding in Kubernetes v1.34, default-enabled beta server WatchList starting again in v1.34, and default-enabled beta WatchListClient in client-go v0.35. Feature defaults are not proof that an operator has enabled them on a particular deployment.
- Cache counter names are present in the v1.36 source and remain alpha. Their labels and availability must be checked against the deployed release; the post already includes this caveat. The moving metrics reference does not list every historical alpha metric.
- Pagination consistency, restarting after an expired continuation token to preserve a single snapshot, Protobuf fallback, and metadata-only fetch guidance are technically sound. Aggregated API servers may support fewer representations.
- Confirmed that all six links in the post's Official Documentation section resolve to the intended Kubernetes resources. Historical blog posts describe their release-time behavior; feature-gate tables and tagged source were used for later version claims.
- This was a documentation and source review, not an incident reproduction or capacity benchmark. No production load or OOM test was run. All existing sections and code blocks were preserved; edits were limited to technical corrections.
