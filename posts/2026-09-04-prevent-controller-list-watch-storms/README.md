# How to Prevent Controller List-Watch Storms from Overloading the Kubernetes API Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Controller, Client-go, Watch, API Server, Performance

Description: Prevent controller startup and reconnect storms by sharing informers, bounding client traffic, staggering replicas, and measuring LIST and WATCH pressure at the API server.

---

A Kubernetes controller normally takes one snapshot of the objects it needs and then keeps that local cache current with a watch. Trouble starts when many clients repeatedly discard that cache, issue full-cluster `LIST` requests, or reconnect at the same instant. A network interruption, synchronized rollout, or broken retry loop can turn ordinary recovery into a thundering herd that consumes kube-apiserver memory, API Priority and Fairness seats, and etcd I/O.

The durable fix is in the clients: share caches, watch continuously, recover with bounded jitter, and narrow the data set. Server-side flow control is a safety boundary, not a substitute for correcting a controller that continually relists.

## Confirm That This Is a List-Watch Storm

Correlate the incident across every kube-apiserver replica. Useful signals include:

- a jump in `apiserver_request_total` for `verb="LIST"` or `verb="WATCH"`;
- growth in `apiserver_response_sizes` for the affected group and resource;
- elevated `apiserver_longrunning_requests` for watches;
- `apiserver_flowcontrol_rejected_requests_total` and HTTP `429` responses;
- increased `apiserver_cache_list_fetched_objects_total` relative to returned objects;
- kube-apiserver memory, CPU, and request latency; and
- controller restarts, leader changes, watch disconnects, or many replicas becoming ready together.

Start with bounded PromQL queries and preserve the `resource`, `group`, `verb`, `code`, and API-server instance labels:

```promql
sum by (instance, group, resource, verb, code) (
  rate(apiserver_request_total{verb=~"LIST|WATCH"}[5m])
)
```

```promql
sum by (instance, flow_schema, priority_level, reason) (
  rate(apiserver_flowcontrol_rejected_requests_total[5m])
)
```

```promql
histogram_quantile(
  0.99,
  sum by (le, instance, group, resource, verb) (
    rate(apiserver_request_duration_seconds_bucket{verb="LIST"}[5m])
  )
)
```

Do not diagnose from request count alone. A stable set of long-lived watches is expected. A storm has churn: repeated LISTs, rapidly reopening watches, large responses, and a correlated resource spike.

## Identify the Client and Its Trigger

Set a distinctive `User-Agent` in every controller. At `Metadata` audit level, API audit records can identify the user, source address, verb, resource, response code, and user agent without recording object bodies. Search a short incident window and group LIST/WATCH requests by user agent and authenticated service account.

Then distinguish common triggers:

- all controller replicas restarted or rolled out together;
- a shared load balancer closed long-lived watches at a fixed age;
- an expired `resourceVersion` caused legitimate relists, but clients did not back off;
- authorization or discovery failures made the process recreate clients repeatedly;
- a controller constructs an informer inside `Reconcile` or for every tenant; or
- replicas all maintain the same full-cluster cache even though only one does useful work.

Resource versions are opaque. Resume an ordinary disconnect from the last observed value. On HTTP `410 Gone`, obtain one fresh snapshot and restart from that collection's resource version. Retrying an expired version cannot succeed.

## Share One Informer Per Resource View

Use a shared informer factory rather than polling or creating a `ListWatch` per reconciler. All handlers in the process can consume the same upstream watch and local store:

```go
factory := informers.NewSharedInformerFactoryWithOptions(
    clientset,
    0,
    informers.WithNamespace("payments"),
)

pods := factory.Core().V1().Pods().Informer()
_, err := pods.AddEventHandler(cache.ResourceEventHandlerFuncs{
    AddFunc:    enqueue,
    UpdateFunc: func(_, current any) { enqueue(current) },
    DeleteFunc: enqueue,
})
if err != nil {
    return err
}

factory.Start(ctx.Done())
if !cache.WaitForCacheSync(ctx.Done(), pods.HasSynced) {
    return fmt.Errorf("pod informer cache did not sync")
}
```

A nonzero informer resync period delivers update notifications again from the local cache; it is not a reason to poll the API server. Use resync only when periodic reconciliation is genuinely required. Keep handlers quick: enqueue a stable key, then let bounded workers perform idempotent reconciliation.

In `controller-runtime`, ordinary cached `Get` and `List` calls read the manager's cache. Avoid turning every read into an `APIReader` call. Explicit uncached reads are useful for a few strong-read cases, but using them throughout a reconciler recreates API load that the cache is intended to avoid.

## Reduce the Snapshot Before Increasing Capacity

Limit each cache to the objects the controller actually owns:

- use a namespace-scoped factory when the product is not cluster-scoped;
- apply stable label or field selectors at the `ListWatch`, keeping list and watch selectors identical;
- watch metadata-only representations when the controller needs only names, UIDs, labels, and owner references;
- avoid watching Secrets or large custom resources merely to react to one related object; and
- index the local cache instead of issuing repeated server-side LIST queries from reconciliation.

Selectors do not make every server operation free; the server still has to evaluate supported selection semantics. Measure fetched versus returned objects and test at production cardinality.

Kubernetes v1.34 and later servers enable the beta `WatchList` feature by default, and `client-go` v1.35 and later enables its beta `WatchListClient` path by default. A compatible client requests initial events with `sendInitialEvents=true` and `resourceVersionMatch=NotOlderThan`, then falls back to a conventional LIST when the server does not support the feature. Streaming reduces peak memory, but it does not justify multiplying identical caches. Pin `client-go` to a version compatible with the cluster minor versions you support and let the library manage feature negotiation.

## Bound Retries and Startup Concurrency

Configure the shared REST client once and preserve its rate limiter:

```go
cfg, err := rest.InClusterConfig()
if err != nil {
    return err
}
cfg.UserAgent = "inventory-controller/v2.4.1"
cfg.QPS = 10
cfg.Burst = 20

clientset, err := kubernetes.NewForConfig(cfg)
if err != nil {
    return err
}
```

Those values are examples, not universal targets. Account for object count, expected recovery time, replica count, and other control-plane clients. A custom `RateLimiter` overrides `QPS` and `Burst`; verify which mechanism is actually active.

For `429`, transient `5xx`, connection loss, and relist failure, use capped exponential backoff with jitter and honor `Retry-After`. Do not reset the backoff merely because a TCP connection opened; reset after useful sustained progress. Put an upper bound on concurrent cache warm-ups and reconciler workers.

Roll replicas gradually. Leader election prevents concurrent writes, but depending on the framework, standby replicas may still start caches and watches. Measure actual connections per replica. If only the leader needs an expensive cache, arrange lifecycle so it starts after leadership is acquired, while preserving fast and safe failover.

## Use API Priority and Fairness as Containment

API Priority and Fairness can isolate a noisy controller's LIST and watch requests so they cannot starve system-critical traffic. A watch occupies APF seats only through its initial burst of pre-existing-object notifications, if any. APF does not remove the bandwidth, serialization, or client-consumption cost of the established stream. Before changing FlowSchemas, inspect the response headers that identify the matched FlowSchema and priority level, then map their UIDs:

```bash
kubectl get flowschemas \
  -o custom-columns='UID:.metadata.uid,NAME:.metadata.name'
kubectl get prioritylevelconfigurations \
  -o custom-columns='UID:.metadata.uid,NAME:.metadata.name'
```

Create controller-specific flow control only after testing matching precedence, service-account identity, queue limits, and rejection behavior. Do not place recovery traffic in an exempt priority level. Clients must tolerate queuing and 429 responses regardless.

## Prove the Repair

Test with realistic object sizes and cardinalities, then exercise three transitions:

1. Start one replica and record initial LIST or streaming-initial-state cost.
2. Start the full replica count with production rollout pacing and confirm load scales as designed.
3. Interrupt watches, return 429 and 410 responses, and confirm reconnects spread over time with at most one controlled relist per cache.

Success means caches synchronize within the recovery objective, reconciliation converges, API latency stays within its budget, and critical traffic is not rejected. Also alert on reconnect and relist rate; waiting for kube-apiserver memory exhaustion makes the warning too late.

## Conclusion

Controller list-watch storms are usually multiplicative: too many equivalent caches, too broad a scope, and synchronized retries. Share informers, narrow the watched view, bound every retry and worker pool, stagger replicas, and use APF to contain bad behavior, not conceal it. Validate recovery under disconnects and stale resource versions before production has to do it for you.

## Official Documentation

- [Kubernetes API Concepts: Lists, Watches, and Streaming Lists](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes Flow-Control Diagnostics](https://kubernetes.io/docs/reference/debug-cluster/flow-control/)
- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [client-go Cache Package](https://pkg.go.dev/k8s.io/client-go/tools/cache)
- [client-go REST Configuration](https://pkg.go.dev/k8s.io/client-go/rest)
- [Kubernetes: How the controller-runtime Cache Works](https://kubernetes.io/blog/2026/07/29/controller-runtime-cache-explained/)
