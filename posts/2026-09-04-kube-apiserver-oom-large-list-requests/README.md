# kube-apiserver Is OOMKilled During Large LIST Requests: Measure Watch-Cache and Serialization Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Memory, Watch, Performance, Observability, Troubleshooting

Description: Distinguish persistent watch-cache memory from transient LIST encoding spikes, identify expensive resources and clients, and verify a safe capacity fix.

---

A large Kubernetes LIST has two very different memory costs. The watch cache retains objects so reads and watches can be served efficiently; that is a persistent baseline. A LIST response also requires filtering, conversion, and serialization; on older paths, large collections or slow clients can create substantial temporary allocations. Concurrent LISTs multiply that working set and can push a kube-apiserver container past its cgroup limit.

Do not begin by disabling the watch cache or repeatedly raising the memory limit. First prove that the process was OOM-killed, identify the resource and caller, and separate retained cache growth from short serialization peaks.

## Prove the Exit Was an OOM Kill

If enough of the API remains available, inspect all kube-apiserver replicas and their node events. On kubeadm-style control planes, kube-apiserver is a static Pod; query the container runtime and kubelet on the affected node so diagnosis does not depend on the unhealthy API:

```bash
sudo crictl ps -a --name kube-apiserver
sudo crictl inspect <container-id>
sudo crictl logs --tail=300 <container-id>
sudo journalctl -u kubelet --since '-30 min' --no-pager
sudo journalctl -k --since '-30 min' --no-pager
```

Use the node's configured CRI endpoint. Look for a cgroup OOM exit, kernel OOM record, container memory-limit breach, restart timestamp, and the previous process's logs. A process can also be killed by a host-wide OOM; the remediation differs from a container limit.

Preserve the manifest, image version, feature gates, memory request/limit, Go runtime metrics, and traffic graphs for the same time window. Avoid immediately restarting every replica, which can cause simultaneous cache warm-up LISTs against etcd.

## Correlate Memory With LIST Work

Graph per API-server replica:

- container working set and RSS;
- Go heap in use, heap allocation, GC, and goroutine count;
- `apiserver_request_total` and `apiserver_request_duration_seconds` for `verb="LIST"`;
- stable `apiserver_response_sizes` by resource and scope;
- `apiserver_cache_list_fetched_objects_total` and returned-object counters;
- stored object counts and size estimates where the version exports them; and
- etcd request latency, database size, CPU, and network throughput.

For example:

```promql
sum by (instance, group, resource, scope) (
  rate(apiserver_request_total{verb="LIST"}[5m])
)
```

```promql
histogram_quantile(
  0.99,
  sum by (le, instance, group, resource, scope) (
    rate(apiserver_response_sizes_bucket{verb="LIST"}[5m])
  )
)
```

Keep instance labels. One replica may receive a disproportionate share because of a sticky client, a load-balancer imbalance, or one restarted cache.

A sawtooth or abrupt spike aligned with a few large LIST responses suggests transient request work. A new higher baseline after many objects were created suggests retained cache or another long-lived structure. Both can occur together.

## Find the Expensive Resource and Caller

Rank LIST response bytes by group, resource, and scope using metrics, then correlate expensive resources and time windows with callers in audit records. The response-size metric has no user-agent label, and metadata audit records do not record response byte counts. Kubernetes audit records at `Metadata` level can show the request user, source, URI, response code, and user agent without capturing response bodies. Restrict the audit window and do not enable global body logging during a memory incident.

Common patterns include:

- `kubectl get ... -A -o yaml` over tens of thousands of objects;
- a controller bypassing its informer cache on every reconcile;
- many replicas warming identical full-cluster informers at once;
- LISTs of custom resource instances with large `.spec`, `.status`, or managed fields;
- label or field selectors that require examining far more objects than they return; and
- a slow client or proxy that prolongs the life of response buffers.

Measure object cardinality and encoded size in a staging or read-only diagnostic workflow. Do not fetch every Secret body merely to estimate size; Kubernetes documents metadata-only collection representations for clients that need only identifying fields.

## Understand the Watch-Cache Side

The watch cache stores a recent, indexed view per resource and maintains it from etcd watches. Its baseline is affected by:

- number and average in-memory size of objects;
- enabled resource types and cache configuration;
- indexes and snapshots used to serve list semantics;
- watch event churn and retained history; and
- duplicate cache state across kube-apiserver replicas.

Serialized size in etcd or on the wire is not the same as Go heap size. Decoded maps, strings, pointers, conversion copies, and indexes add overhead. Custom resources are particularly variable.

Use cache metrics as directional evidence rather than treating alpha metric names as a permanent contract. Compare object counts and size estimates before and after a controlled cardinality change. Disabling `--watch-cache` pushes many reads back to etcd, removes an important scalability mechanism, and can make the control plane less stable. Change cache settings only with a version-specific benchmark and rollback plan.

## Understand the Serialization Side

Kubernetes' API concepts documentation describes chunked collection encoding for JSON and Protobuf: current servers encode items incrementally instead of building one monolithic output buffer. Streaming collection encoding became stable in Kubernetes v1.34. This substantially reduces peak encoding memory but does not make a huge LIST free. Objects still must be read, filtered, converted, authorized as applicable, sent over the network, and held by the client.

Initial state can also be streamed through a watch with `sendInitialEvents=true`. Kubernetes v1.34 and later servers enable the beta `WatchList` feature by default, while `client-go` v0.35 and later (corresponding to Kubernetes v1.35 and later) enables its beta `WatchListClient` path by default. The client requests `resourceVersionMatch=NotOlderThan` and falls back to a normal LIST when the server does not support the path. Pin client/server versions according to compatibility guidance.

For direct API clients:

- paginate large unfiltered collections with `limit` and follow the exact `continue` token;
- keep API group, namespace, and selectors unchanged across pages;
- request `PartialObjectMetadataList` if only metadata is needed;
- prefer Kubernetes Protobuf for built-in types, while allowing JSON fallback for CRDs and aggregated APIs; and
- request gzip when useful, recognizing that compression trades CPU for network bytes.

Pagination provides a consistent snapshot when its token contract is followed. If a continue token expires with `410 Gone`, restart the entire list; do not join pages from different snapshots.

## Capture a Heap Profile Carefully

If profiling is approved and the replica has enough headroom, collect a heap profile through the authenticated kube-apiserver profiling endpoint or locally on the control-plane host, then analyze it with `go tool pprof`. Restrict access to `/debug/pprof`, store the profile as sensitive operational data, and capture during both baseline and LIST spike for comparison.

Profiling itself consumes resources. Do not enable broad unauthenticated debug access, repeatedly scrape profiles from a failing replica, or expose the endpoint through a public load balancer. Heap profiles attribute sampled allocations to call stacks, not object types or retention paths. Compare in-use bytes at cache population and decoding stacks with encoding, conversion, and response-buffer allocation stacks across baseline and spike profiles; these are clues to baseline retention or transient LIST work, not proof of which structure retains the memory.

## Contain the Incident Safely

First stop or rate-limit the confirmed offending client, or stagger its replicas. Preserve at least one healthy API-server replica and verify the load balancer removes unready instances. API Priority and Fairness can isolate noncritical controller traffic and reject excess work with 429, but clients must honor `Retry-After` and use jittered backoff.

Then address the root cause:

- replace polling and uncached reads with shared informers;
- narrow informer namespace and selectors;
- reduce oversized objects and high-cardinality status or managed fields;
- upgrade to a supported release with stable streaming collection encoding;
- distribute controller startup and reconnects; and
- size kube-apiserver memory from a measured steady baseline plus tested concurrency headroom.

Raising the limit can be part of the capacity plan, but ensure the node has reserved capacity so several API-server replicas or colocated etcd cannot trigger host OOM. A higher limit without bounding LIST concurrency can leave the server vulnerable to another OOM as request load grows.

## Verify Under a Reproducible Load

In a representative non-production cluster, populate the same object count and approximate sizes. Establish baseline, run one LIST, then increase concurrency gradually while recording response bytes, latency, server heap/RSS, client memory, etcd latency, 429/5xx rates, and readiness.

Exercise both the problematic client behavior and the corrected path. Pass criteria should include:

- no OOM or readiness loss;
- bounded peak and post-test memory;
- acceptable p99 LIST latency and error rate;
- continued success of critical writes and watches; and
- predictable recovery when clients disconnect together.

Do not recreate a production-scale incident against the live control plane. A benchmark that can exhaust kube-apiserver memory belongs in an isolated cluster with a recovery path.

## Conclusion

Large LIST OOMs are a concurrency and representation problem as much as a raw object-count problem. Prove the OOM, correlate requests to memory, separate watch-cache baseline from serialization spikes, and correct the client access pattern. Modern streaming helps, but scoped caches, bounded concurrency, realistic memory headroom, and tested recovery remain essential.

## Official Documentation

- [Kubernetes API Concepts: Collections, Pagination, and Encodings](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes v1.33: Streaming LIST Responses](https://kubernetes.io/blog/2025/05/09/kubernetes-v1-33-streaming-list-responses/)
- [Kubernetes: Enhancing API Server Efficiency with API Streaming](https://kubernetes.io/blog/2024/12/17/kube-apiserver-api-streaming/)
- [Kubernetes API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes Debugging with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
