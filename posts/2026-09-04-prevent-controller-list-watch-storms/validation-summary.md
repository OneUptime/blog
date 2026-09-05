# Validation Summary: How to Prevent Controller List-Watch Storms from Overloading the Kubernetes API Server

## Status
validated

## Post Type
Technical guide with Go examples, PromQL queries, and kubectl commands.

## Technologies Covered
- Kubernetes API server, LIST/WATCH, resource versions, and streaming lists
- client-go REST clients, shared informers, cache synchronization, and leader election
- controller-runtime cached clients
- API Priority and Fairness (APF)
- Prometheus metrics and PromQL
- Kubernetes auditing and kubectl
- Go

## Sources Consulted
- Kubernetes API concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes feature gates and version history: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes flow-control diagnostics: https://kubernetes.io/docs/reference/debug-cluster/flow-control/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- client-go informer factory APIs: https://pkg.go.dev/k8s.io/client-go/informers
- client-go cache APIs: https://pkg.go.dev/k8s.io/client-go/tools/cache
- client-go REST configuration: https://pkg.go.dev/k8s.io/client-go/rest
- client-go release compatibility: https://github.com/kubernetes/client-go#compatibility-your-code--client-go
- client-go v0.35.0 feature defaults: https://raw.githubusercontent.com/kubernetes/client-go/v0.35.0/features/known_features.go
- client-go v0.35.0 reflector implementation: https://raw.githubusercontent.com/kubernetes/client-go/v0.35.0/tools/cache/reflector.go
- client-go v0.35.0 REST request implementation: https://raw.githubusercontent.com/kubernetes/client-go/v0.35.0/rest/request.go
- client-go leader-election guarantees: https://pkg.go.dev/k8s.io/client-go/tools/leaderelection
- Kubernetes controller-runtime cache explanation: https://kubernetes.io/blog/2026/07/29/controller-runtime-cache-explained/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
1. **Incorrect client-go release number.** Replaced `client-go v1.35` with `client-go v0.35`. Kubernetes uses v1.35, while its corresponding client-go module release is v0.35.0. The beta WatchListClient default is enabled in that release.
2. **Missing limitation of REST throttling for WATCH.** Added that client-go v0.35 WATCH requests bypass the REST rate limiter, including streaming initial state. The QPS/Burst example is valid, but it cannot independently limit watch startup or reconnects; startup concurrency and retry controls remain necessary.
3. **Overstated leader-election guarantee.** Replaced the assertion that leader election prevents concurrent writes with its normal single-active-reconciler behavior and explicit lack of fencing. The client-go documentation states that exclusive leadership is not guaranteed.
4. **Overly strict relist success criterion.** Changed “at most one controlled relist per cache” to at most one relist in flight, with bounded jittered retries when recovery fails. Failed requests, expired versions during recovery, and interrupted snapshots can legitimately require additional attempts; the original absolute limit conflicts with recovery behavior.

## Review Notes
- Reviewed both Go blocks as integration snippets. Factory construction, namespace options, handler registration and its two return values, Start, WaitForCacheSync, InClusterConfig, UserAgent, QPS, Burst, and NewForConfig match the documented APIs. They require imports, an enclosing error-returning function, and application-provided context and enqueue logic. They were not compiled or executed against a cluster.
- The enqueue callback must accept an object and handle deletion tombstones, for example using DeletionHandlingMetaNamespaceKeyFunc when producing queue keys. WaitForCacheSync checks the informer store, not completion of queued reconciliation.
- Shared informers share a resource view within a factory/process; independent replicas still have independent caches. Resync notifications come from the local cache. Namespace scoping applies to namespaced resources, and selector support depends on resource type.
- Confirmed cached controller-runtime reads, metadata-only representations, opaque resource versions, and fresh-snapshot recovery after an expired watch. Streaming requests require sendInitialEvents and NotOlderThan; client-go's reflector requests bookmarks and implements fallback to conventional listing.
- Confirmed WatchList is beta and enabled by default from Kubernetes 1.34, and WatchListClient is enabled by default for the Kubernetes 1.35/client-go v0.35 release. Feature defaults can be overridden; compatibility must be checked for supported cluster versions.
- The three PromQL expressions use valid rate, aggregation, and classic-histogram quantile patterns. Metric names and grouping labels match the reference; instance is supplied by Prometheus scraping. Request duration lacks a code label, so its query correctly omits that grouping.
- The fetched/returned cache-list counters are alpha metrics and require version-aware dashboards. The rolling metrics reference now includes a Kubernetes 1.37 deprecation notice; this was not treated as a defect in the post dated 2026-09-04. Response sizes describe a histogram, not a single gauge.
- Metadata auditing supports client attribution without object bodies, subject to audit policy and recorded stages. Response status is available at response stages; audit stages should not be counted as separate requests.
- Confirmed APF watch seat accounting, rejection metrics, and UID response headers. Both kubectl custom-column commands match documented resource names and field paths. APF protects request concurrency but cannot eliminate the resource cost of established streams.
- All seven documentation links in the post resolved to their intended resources, including the dated controller-runtime article. The author profile is attribution, not a technical source.
- Validation was based on official documentation and source inspection. No live cluster, fault injection, load test, or Prometheus evaluation was performed; recovery objectives remain deployment-specific.
